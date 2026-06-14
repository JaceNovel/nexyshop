<?php

namespace App\Services\Video;

use App\Models\User;
use App\Services\GooglePeopleService;
use Illuminate\Support\Facades\Http;

class YouTubeEngagementService
{
    public function __construct(private readonly GooglePeopleService $google)
    {
    }

    public function likeVideo(User $user, string $videoId): array
    {
        $token = $this->accessTokenWithYoutubeScope($user);

        $response = Http::withToken($token)->post('https://www.googleapis.com/youtube/v3/videos/rate?'.http_build_query([
            'id' => $videoId,
            'rating' => 'like',
        ]));

        $response->throw();

        return ['status' => 'liked', 'youtube_video_id' => $videoId];
    }

    public function subscribeToConfiguredChannel(User $user): array
    {
        $channelId = (string) config('services.youtube.channel_id', '');

        if ($channelId === '') {
            throw new \RuntimeException('Chaine YouTube non configuree.');
        }

        $token = $this->accessTokenWithYoutubeScope($user);
        $response = Http::withToken($token)->post('https://www.googleapis.com/youtube/v3/subscriptions?part=snippet', [
            'snippet' => [
                'resourceId' => [
                    'kind' => 'youtube#channel',
                    'channelId' => $channelId,
                ],
            ],
        ]);

        if ($response->status() === 409 || str_contains($response->body(), 'subscriptionDuplicate')) {
            return ['status' => 'already_subscribed', 'channel_id' => $channelId];
        }

        $response->throw();

        return ['status' => 'subscribed', 'channel_id' => $channelId, 'subscription' => $response->json()];
    }

    private function accessTokenWithYoutubeScope(User $user): string
    {
        $account = $user->googleAccounts()->where('provider', 'google')->latest()->first();
        $requiredScope = 'https://www.googleapis.com/auth/youtube.force-ssl';

        if (! $account || ! in_array($requiredScope, $account->scopes ?? [], true)) {
            throw new \RuntimeException('Reconnecte Google pour autoriser les actions YouTube.');
        }

        $token = $this->google->refreshTokenIfNeeded($user);

        if (! $token) {
            throw new \RuntimeException('Connexion Google expiree. Reconnecte ton compte.');
        }

        return $token;
    }
}
