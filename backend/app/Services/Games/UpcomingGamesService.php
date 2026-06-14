<?php

namespace App\Services\Games;

use App\Models\ApiLog;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class UpcomingGamesService
{
    private const TTL_SECONDS = 43200;

    private string $endpoint;
    private ?string $userUid;
    private ?string $apiKey;

    public function __construct()
    {
        $this->endpoint = (string) config('services.hlgaming.upcoming.endpoint');
        $this->userUid = config('services.hlgaming.useruid');
        $this->apiKey = config('services.hlgaming.api_key');
    }

    public function list(): array
    {
        return Cache::remember('games:upcoming:list', now()->addSeconds(self::TTL_SECONDS), function () {
            if (! $this->configured()) {
                return $this->fallback();
            }

            $payload = $this->get([
                'sectionName' => 'UpcomingGM',
                'type' => 'fetch',
            ]);

            return [
                'result' => array_map(fn (array $game) => $this->normalizeGame($game), $this->extractGames($payload)),
                'usage' => $payload['usage'] ?? null,
            ];
        });
    }

    private function get(array $query): array
    {
        $startedAt = microtime(true);
        $query = array_merge($query, [
            'useruid' => $this->userUid,
            'api' => $this->apiKey,
        ]);

        $response = $this->client()->get($this->endpoint, $query);
        $payload = $response->json() ?? [];

        try {
            ApiLog::create([
                'service' => 'upcoming_games',
                'direction' => 'outbound',
                'endpoint' => $this->endpoint,
                'status_code' => $response->status(),
                'payload' => collect($query)->except('api')->all(),
                'response' => $payload,
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            ]);
        } catch (Throwable) {
            // Browsing upcoming launches should not depend on logging storage.
        }

        if ($response->status() === 429) {
            throw new RuntimeException('Quota jeux à venir dépassé. Réessaie plus tard.');
        }

        if (! $response->successful()) {
            throw new RuntimeException($payload['message'] ?? $payload['error'] ?? 'Jeux à venir indisponibles.');
        }

        if (isset($payload['error'])) {
            throw new RuntimeException((string) $payload['error']);
        }

        return $payload;
    }

    private function client(): PendingRequest
    {
        return Http::timeout((int) config('services.hlgaming.timeout', 12))
            ->retry(2, 300)
            ->acceptJson();
    }

    private function configured(): bool
    {
        return filled($this->userUid) && filled($this->apiKey);
    }

    private function extractGames(array $payload): array
    {
        $games = $payload['result'] ?? $payload['data']['result'] ?? $payload['data'] ?? [];

        return array_values(array_filter(is_array($games) ? $games : [], 'is_array'));
    }

    private function normalizeGame(array $game): array
    {
        $name = (string) ($game['gameName'] ?? $game['name'] ?? $game['title'] ?? 'Jeu à venir');
        $credits = $game['credits'] ?? $game['description'] ?? null;

        return [
            ...$game,
            'gameName' => $name,
            'gameUrl' => (string) ($game['gameUrl'] ?? $game['url'] ?? '#'),
            'releaseDate' => $game['releaseDate'] ?? $game['date'] ?? null,
            'gameImage' => $game['gameImage'] ?? $game['image'] ?? $game['image_url'] ?? null,
            'price' => $game['price'] ?? null,
            'credits' => $this->publicCredits(is_string($credits) ? $credits : null),
        ];
    }

    private function publicCredits(?string $credits): ?string
    {
        if (! $credits || str_contains(mb_strtolower($credits), 'hl gaming')) {
            return null;
        }

        return $credits;
    }

    private function fallback(): array
    {
        return [
            'result' => [
                ['gameName' => 'Project: BloodStrike', 'gameUrl' => '#', 'releaseDate' => '2026-06-15', 'gameImage' => 'https://media.rawg.io/media/resize/640/-/screenshots/96a/96ab17437e722c8e22240923dfdfcdd0_ftUmkIh.jpg', 'price' => 'Free', 'credits' => 'Battle Royale FPS'],
                ['gameName' => 'Indus Battle Royale', 'gameUrl' => '#', 'releaseDate' => '2026-07-28', 'gameImage' => 'https://media.rawg.io/media/resize/640/-/screenshots/ca8/ca8a011899a0743ee717c0a2f056f0af.jpg', 'price' => 'Free', 'credits' => 'Battle Royale'],
                ['gameName' => 'Delta Force: Hawk Ops', 'gameUrl' => '#', 'releaseDate' => '2026-08-12', 'gameImage' => 'https://media.rawg.io/media/resize/640/-/screenshots/b59/b59e44204d8af92133ea0b67af45a04c_hS4tgMe.jpg', 'price' => 'Free', 'credits' => 'FPS / Shooter'],
                ['gameName' => 'Need for Speed Mobile', 'gameUrl' => '#', 'releaseDate' => '2026-09-20', 'gameImage' => 'https://media.rawg.io/media/resize/640/-/screenshots/c28/c286227823231c426a88aa873cf1b8d6.jpg', 'price' => 'Free', 'credits' => 'Course'],
            ],
            'usage' => null,
        ];
    }
}
