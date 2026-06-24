<?php

namespace App\Services;

use App\Models\ApiLog;
use App\Models\GoogleAccount;
use App\Models\User;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GooglePeopleService
{
    public function getAuthorizationUrl(): string
    {
        $state = Str::random(48);
        Cache::put("google_oauth_state:{$state}", true, now()->addMinutes(10));

        return 'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => config('services.google.redirect_uri'),
            'response_type' => 'code',
            'scope' => implode(' ', array_values(array_unique([
                ...config('services.google.people_scopes'),
                ...config('services.google.youtube_engagement_scopes', []),
                ...config('services.blogger.oauth_scopes', []),
            ]))),
            'access_type' => 'offline',
            'include_granted_scopes' => 'true',
            'prompt' => 'consent',
            'state' => $state,
        ]);
    }

    public function handleCallback(array $payload): array
    {
        if (! empty($payload['error'])) {
            Log::warning('Google OAuth error', ['error' => $payload['error']]);
            throw new \RuntimeException('Google OAuth a refuse la connexion.');
        }

        $state = (string) ($payload['state'] ?? '');
        if (! $state || ! Cache::pull("google_oauth_state:{$state}")) {
            throw new \RuntimeException('Etat OAuth invalide ou expire.');
        }

        $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'code' => $payload['code'] ?? null,
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'redirect_uri' => config('services.google.redirect_uri'),
            'grant_type' => 'authorization_code',
        ]);
        $this->log('oauth/token', $tokenResponse, ['grant_type' => 'authorization_code']);
        $tokenResponse->throw();

        $tokens = $tokenResponse->json();
        $profile = $this->getUserProfile($tokens['access_token']);
        $user = $this->createOrUpdateUser($profile, $tokens);
        $token = $user->createToken('google-web')->plainTextToken;

        return ['user' => $user, 'profile' => $profile, 'token' => $token];
    }

    public function getUserProfile(string $accessToken): array
    {
        $response = Http::withToken($accessToken)->get('https://people.googleapis.com/v1/people/me', [
            'personFields' => 'names,emailAddresses,photos,metadata',
        ]);
        $this->log('people.get', $response, ['personFields' => 'names,emailAddresses,photos,metadata']);
        $response->throw();

        $person = $response->json();
        $name = collect($person['names'] ?? [])->firstWhere('metadata.primary', true) ?? ($person['names'][0] ?? []);
        $email = collect($person['emailAddresses'] ?? [])->firstWhere('metadata.primary', true) ?? ($person['emailAddresses'][0] ?? []);
        $photo = collect($person['photos'] ?? [])->firstWhere('metadata.primary', true) ?? ($person['photos'][0] ?? []);
        $source = collect($person['metadata']['sources'] ?? [])->firstWhere('type', 'PROFILE') ?? [];

        return [
            'google_id' => $source['id'] ?? Str::after((string) ($person['resourceName'] ?? ''), 'people/'),
            'name' => $name['displayName'] ?? $email['value'] ?? 'Google User',
            'given_name' => $name['givenName'] ?? null,
            'family_name' => $name['familyName'] ?? null,
            'email' => $email['value'] ?? null,
            'avatar_url' => $photo['url'] ?? null,
            'raw' => $person,
        ];
    }

    public function createOrUpdateUser(array $googleProfile, array $tokens = []): User
    {
        if (empty($googleProfile['email']) || empty($googleProfile['google_id'])) {
            throw new \RuntimeException('Profil Google incomplet.');
        }

        $user = User::query()
            ->where('google_id', $googleProfile['google_id'])
            ->orWhere('email', $googleProfile['email'])
            ->first();

        $avatarUrl = $googleProfile['avatar_url'] ?? null;
        $shouldUseGoogleAvatar = $avatarUrl && (
            ! $user
            || ! $user->avatar_url
            || $user->avatar_url === $user->google_avatar_url
        );

        $userData = [
            'name' => $googleProfile['name'],
            'email' => $googleProfile['email'],
            'google_id' => $googleProfile['google_id'],
            'google_avatar_url' => $avatarUrl,
            'google_connected_at' => now(),
            'last_login_at' => now(),
        ];

        if ($shouldUseGoogleAvatar) {
            $userData['avatar_url'] = $avatarUrl;
        }

        if ($user) {
            $user->update($userData);
        } else {
            $user = User::create($userData);
        }

        $existing = GoogleAccount::query()
            ->where('provider', 'google')
            ->where('google_id', $googleProfile['google_id'])
            ->first();

        GoogleAccount::query()->updateOrCreate(
            ['provider' => 'google', 'google_id' => $googleProfile['google_id']],
            [
                'user_id' => $user->id,
                'email' => $googleProfile['email'],
                'name' => $googleProfile['name'],
                'avatar_url' => $googleProfile['avatar_url'],
                'access_token' => $tokens['access_token'] ?? $existing?->access_token,
                'refresh_token' => $tokens['refresh_token'] ?? $existing?->refresh_token,
                'token_expires_at' => now()->addSeconds((int) ($tokens['expires_in'] ?? 3600) - 60),
                'scopes' => array_values(array_filter(explode(' ', (string) ($tokens['scope'] ?? implode(' ', config('services.google.people_scopes')))))),
            ]
        );

        return $user->refresh();
    }

    public function refreshTokenIfNeeded(User $user): ?string
    {
        $account = $user->googleAccounts()->where('provider', 'google')->latest()->first();
        if (! $account) {
            return null;
        }

        if ($account->access_token && $account->token_expires_at?->isFuture()) {
            return $account->access_token;
        }

        if (! $account->refresh_token) {
            return null;
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'refresh_token' => $account->refresh_token,
            'grant_type' => 'refresh_token',
        ]);
        $this->log('oauth/token', $response, ['grant_type' => 'refresh_token']);
        $response->throw();

        $payload = $response->json();
        $account->update([
            'access_token' => $payload['access_token'],
            'token_expires_at' => now()->addSeconds((int) ($payload['expires_in'] ?? 3600) - 60),
            'scopes' => isset($payload['scope']) ? explode(' ', $payload['scope']) : $account->scopes,
        ]);

        return $account->refresh()->access_token;
    }

    public function disconnectGoogle(User $user): void
    {
        $user->googleAccounts()->where('provider', 'google')->delete();
        $user->update([
            'google_id' => null,
            'google_avatar_url' => null,
            'google_connected_at' => null,
        ]);
    }

    private function log(string $endpoint, Response $response, array $payload = []): void
    {
        ApiLog::create([
            'service' => 'google',
            'direction' => 'out',
            'endpoint' => $endpoint,
            'status_code' => $response->status(),
            'payload' => $payload,
            'response' => $response->json() ?: ['body' => Str::limit($response->body(), 1000)],
            'duration_ms' => null,
        ]);
    }
}
