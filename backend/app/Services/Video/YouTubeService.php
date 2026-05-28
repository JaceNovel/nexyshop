<?php

namespace App\Services\Video;

use App\Models\ApiLog;
use App\Models\Replay;
use App\Models\Stream;
use App\Models\YoutubeAccount;
use App\Models\YoutubeVideo;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class YouTubeService
{
    public function authorizationUrl(string $state): string
    {
        return 'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
            'client_id' => config('services.youtube.client_id'),
            'redirect_uri' => config('services.youtube.redirect_uri'),
            'response_type' => 'code',
            'scope' => implode(' ', [
                'https://www.googleapis.com/auth/youtube',
                'https://www.googleapis.com/auth/youtube.upload',
                'https://www.googleapis.com/auth/youtube.force-ssl',
            ]),
            'access_type' => 'offline',
            'include_granted_scopes' => 'true',
            'prompt' => 'consent',
            'state' => $state,
        ]);
    }

    public function exchangeCode(string $code, ?int $userId = null): YoutubeAccount
    {
        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'code' => $code,
            'client_id' => config('services.youtube.client_id'),
            'client_secret' => config('services.youtube.client_secret'),
            'redirect_uri' => config('services.youtube.redirect_uri'),
            'grant_type' => 'authorization_code',
        ]);

        $this->log('oauth/token', $response, ['grant_type' => 'authorization_code']);
        $response->throw();

        $payload = $response->json();
        $existingAccount = YoutubeAccount::query()->where('user_id', $userId)->latest()->first();
        $account = YoutubeAccount::query()->updateOrCreate(
            ['user_id' => $userId],
            [
                'access_token' => $payload['access_token'],
                'refresh_token' => $payload['refresh_token'] ?? $existingAccount?->refresh_token,
                'token_expires_at' => now()->addSeconds((int) ($payload['expires_in'] ?? 3600) - 60),
                'scopes' => explode(' ', (string) ($payload['scope'] ?? '')),
                'status' => 'connected',
            ]
        );

        $this->syncChannel($account);

        return $account->refresh();
    }

    public function validAccessToken(YoutubeAccount $account): ?string
    {
        if ($account->access_token && $account->token_expires_at?->isFuture()) {
            return $account->access_token;
        }

        if (! $account->refresh_token) {
            return null;
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => config('services.youtube.client_id'),
            'client_secret' => config('services.youtube.client_secret'),
            'refresh_token' => $account->refresh_token,
            'grant_type' => 'refresh_token',
        ]);

        $this->log('oauth/token', $response, ['grant_type' => 'refresh_token']);
        $response->throw();

        $payload = $response->json();
        $account->update([
            'access_token' => $payload['access_token'],
            'token_expires_at' => now()->addSeconds((int) ($payload['expires_in'] ?? 3600) - 60),
            'status' => 'connected',
        ]);

        return $account->refresh()->access_token;
    }

    public function embedUrl(string $videoId, array $params = []): string
    {
        $query = http_build_query(array_merge([
            'enablejsapi' => 1,
            'origin' => rtrim((string) config('services.youtube.frontend_url'), '/'),
            'playsinline' => 1,
        ], $params));

        return "https://www.youtube.com/embed/{$videoId}?{$query}";
    }

    public function createLive(YoutubeAccount $account, array $data): Stream
    {
        $token = $this->validAccessToken($account);
        $title = $data['title'];
        $scheduledAt = Carbon::parse($data['scheduled_at'] ?? now()->addHour());

        if (! $token) {
            return Stream::create([
                'tournament_id' => $data['tournament_id'] ?? null,
                'title' => $title,
                'description' => $data['description'] ?? null,
                'status' => 'scheduled',
                'scheduled_at' => $scheduledAt,
                'metadata' => ['youtube_pending' => true, 'reason' => 'No valid OAuth token'],
            ]);
        }

        $broadcast = Http::withToken($token)->post('https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails', [
            'snippet' => [
                'title' => $title,
                'description' => $data['description'] ?? '',
                'scheduledStartTime' => $scheduledAt->toIso8601String(),
            ],
            'status' => ['privacyStatus' => $data['privacy_status'] ?? 'unlisted'],
            'contentDetails' => ['enableAutoStart' => true, 'enableAutoStop' => true],
        ]);
        $this->log('liveBroadcasts.insert', $broadcast, $data);
        $broadcast->throw();

        $stream = Stream::create([
            'tournament_id' => $data['tournament_id'] ?? null,
            'youtube_video_id' => $broadcast->json('id'),
            'youtube_live_id' => $broadcast->json('id'),
            'title' => $title,
            'description' => $data['description'] ?? null,
            'status' => 'scheduled',
            'scheduled_at' => $scheduledAt,
            'embed_url' => $this->embedUrl($broadcast->json('id')),
            'watch_url' => 'https://www.youtube.com/watch?v='.$broadcast->json('id'),
            'thumbnail_url' => $broadcast->json('snippet.thumbnails.high.url'),
            'metadata' => ['youtube_broadcast' => $broadcast->json()],
        ]);

        return $stream;
    }

    public function syncVideoMetadata(string $videoId, string $type = 'replay'): ?YoutubeVideo
    {
        $key = config('services.youtube.key');
        if (! $key) {
            return null;
        }

        $response = Http::get('https://www.googleapis.com/youtube/v3/videos', [
            'part' => 'snippet,contentDetails,statistics',
            'id' => $videoId,
            'key' => $key,
        ]);
        $this->log('videos.list', $response, ['id' => $videoId]);
        $response->throw();

        $item = collect($response->json('items', []))->first();
        if (! $item) {
            return null;
        }

        return YoutubeVideo::updateOrCreate(
            ['youtube_video_id' => $videoId],
            [
                'type' => $type,
                'title' => $item['snippet']['title'] ?? $videoId,
                'description' => $item['snippet']['description'] ?? null,
                'thumbnail_url' => $item['snippet']['thumbnails']['high']['url'] ?? null,
                'duration_seconds' => $this->isoDurationToSeconds($item['contentDetails']['duration'] ?? 'PT0S'),
                'views_count' => (int) ($item['statistics']['viewCount'] ?? 0),
                'published_at' => $item['snippet']['publishedAt'] ?? null,
                'raw_payload' => $item,
            ]
        );
    }

    public function createHighlightDraft(Replay $replay, array $data): array
    {
        return [
            'title' => $data['title'] ?? Str::limit($replay->title.' highlight', 90, ''),
            'description' => trim(($data['description'] ?? $replay->description ?? '')."\n\n#NEXY #Esport #FreeFire"),
            'privacy_status' => $data['privacy_status'] ?? 'unlisted',
            'playlist' => 'NEXY Highlights',
        ];
    }

    private function syncChannel(YoutubeAccount $account): void
    {
        $token = $this->validAccessToken($account);
        if (! $token) {
            return;
        }

        $response = Http::withToken($token)->get('https://www.googleapis.com/youtube/v3/channels', [
            'part' => 'snippet',
            'mine' => 'true',
        ]);
        $this->log('channels.list', $response, ['mine' => true]);

        if ($response->ok() && $channel = collect($response->json('items', []))->first()) {
            $account->update([
                'channel_id' => $channel['id'] ?? null,
                'channel_title' => $channel['snippet']['title'] ?? null,
            ]);
        }
    }

    private function isoDurationToSeconds(string $duration): int
    {
        preg_match('/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/', $duration, $matches);

        return ((int) ($matches[1] ?? 0) * 3600) + ((int) ($matches[2] ?? 0) * 60) + (int) ($matches[3] ?? 0);
    }

    private function log(string $endpoint, Response $response, array $payload = []): void
    {
        ApiLog::create([
            'service' => 'youtube',
            'direction' => 'out',
            'endpoint' => $endpoint,
            'status_code' => $response->status(),
            'payload' => $payload,
            'response' => $response->json() ?: ['body' => Str::limit($response->body(), 1000)],
            'duration_ms' => null,
        ]);
    }
}
