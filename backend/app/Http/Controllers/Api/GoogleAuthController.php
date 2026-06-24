<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GooglePeopleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleAuthController extends Controller
{
    public function redirect(GooglePeopleService $google)
    {
        return redirect()->away($google->getAuthorizationUrl());
    }

    public function callback(Request $request, GooglePeopleService $google)
    {
        try {
            $result = $google->handleCallback($request->query());
            $frontendUrl = rtrim((string) config('services.google.frontend_url'), '/');

            if ($request->expectsJson()) {
                return response()->json($result);
            }

            return redirect()->away($frontendUrl.'/auth/google/callback?'.http_build_query([
                'token' => $result['token'],
                'name' => $result['user']->name,
                'avatar' => $result['user']->avatar_url ?: $result['user']->google_avatar_url,
            ]));
        } catch (\Throwable $exception) {
            Log::error('Google OAuth callback failed', ['message' => $exception->getMessage()]);
            $frontendUrl = rtrim((string) config('services.google.frontend_url'), '/');

            return redirect()->away($frontendUrl.'/auth/google/callback?error='.urlencode($exception->getMessage()));
        }
    }

    public function profile(Request $request)
    {
        $user = $request->user()->load('googleAccounts');
        $account = $user->googleAccounts->firstWhere('provider', 'google');

        return response()->json([
            'connected' => (bool) $account,
            'user' => $user,
            'google' => $account ? [
                'email' => $account->email,
                'name' => $account->name,
                'avatar_url' => $account->avatar_url,
                'token_expires_at' => $account->token_expires_at,
                'scopes' => $account->scopes,
            ] : null,
        ]);
    }

    public function disconnect(Request $request, GooglePeopleService $google)
    {
        $google->disconnectGoogle($request->user());

        return response()->json(['message' => 'Compte Google deconnecte.']);
    }

    public function syncAvatar(Request $request)
    {
        $data = $request->validate([
            'avatar_url' => ['required', 'url', 'max:2048'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'clerk_id' => ['nullable', 'string', 'max:255'],
            'source' => ['nullable', 'string', 'max:50'],
        ]);

        $user = $request->user();
        $oldGoogleAvatar = $user->google_avatar_url;
        $updates = [
            'google_avatar_url' => $data['avatar_url'],
            'google_connected_at' => $user->google_connected_at ?: now(),
            'last_login_at' => now(),
        ];

        if (! empty($data['name']) && (! $user->name || str_starts_with($user->name, 'user_'))) {
            $updates['name'] = $data['name'];
        }

        if (! $user->avatar_url || $user->avatar_url === $oldGoogleAvatar) {
            $updates['avatar_url'] = $data['avatar_url'];
        }

        $user->forceFill($updates)->save();

        return response()->json([
            'message' => 'Profil synchronise.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => $user->avatar_url,
                'google_avatar_url' => $user->google_avatar_url,
            ],
        ]);
    }
}
