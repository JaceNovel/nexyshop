<?php

namespace App\Services\Fortnite;

use App\Models\ApiLog;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class FortniteApiService
{
    public function profile(string $accountId): array
    {
        $accountId = trim($accountId);

        if ($accountId === '') {
            throw new RuntimeException('Entre ton ID Fortnite.');
        }

        $cacheKey = 'fortnite:profile:'.sha1(mb_strtolower($accountId));

        return Cache::remember($cacheKey, now()->addMinutes((int) config('services.fortnite.cache_minutes', 4320)), function () use ($accountId) {
            $payload = $this->get('/v2/stats/br/v2/'.rawurlencode($accountId), [
                'timeWindow' => 'lifetime',
                'image' => 'none',
            ]);

            return $this->normalizeProfile($accountId, $payload);
        });
    }

    public function shop(string $language = 'fr'): array
    {
        return Cache::remember('fortnite:shop:'.$language, now()->addMinutes(30), fn () => $this->get('/v2/shop', [
            'language' => $language,
        ]));
    }

    public function news(string $mode = 'br', string $language = 'fr'): array
    {
        $mode = in_array($mode, ['br', 'stw', 'creative'], true) ? $mode : 'br';

        return Cache::remember("fortnite:news:{$mode}:{$language}", now()->addMinutes(60), fn () => $this->get('/v2/news/'.$mode, [
            'language' => $language,
        ]));
    }

    private function get(string $path, array $query = []): array
    {
        $key = (string) config('services.fortnite.key');

        if ($key === '') {
            throw new RuntimeException('Clé API Fortnite manquante.');
        }

        $baseUrl = rtrim((string) config('services.fortnite.base_url', 'https://fortnite-api.com'), '/');
        $endpoint = $baseUrl.$path;
        $startedAt = microtime(true);
        $response = Http::timeout((int) config('services.fortnite.timeout', 12))
            ->acceptJson()
            ->withHeaders(['Authorization' => $key])
            ->get($endpoint, $query);
        $payload = $response->json() ?? [];

        try {
            ApiLog::create([
                'service' => 'fortnite_api',
                'direction' => 'outbound',
                'endpoint' => $endpoint,
                'status_code' => $response->status(),
                'payload' => $query,
                'response' => $payload,
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            ]);
        } catch (Throwable) {
            // API logging must not block profile lookup.
        }

        if ($response->status() === 401 || $response->status() === 403) {
            throw new RuntimeException('Clé API Fortnite invalide ou absente.');
        }

        if ($response->status() === 404) {
            throw new RuntimeException('Joueur Fortnite introuvable.');
        }

        if ($response->status() === 429) {
            throw new RuntimeException('Limite API Fortnite atteinte. Réessaie plus tard.');
        }

        if (! $response->successful()) {
            throw new RuntimeException($payload['error'] ?? $payload['message'] ?? 'Service Fortnite indisponible.');
        }

        return $payload;
    }

    private function normalizeProfile(string $accountId, array $payload): array
    {
        $data = $payload['data'] ?? [];
        $account = $data['account'] ?? [];
        $battlePass = $data['battlePass'] ?? [];
        $stats = $data['stats'] ?? [];
        $all = $stats['all']['overall'] ?? $stats['all'] ?? [];

        return [
            'account_id' => (string) ($account['id'] ?? $accountId),
            'name' => (string) ($account['name'] ?? $accountId),
            'account_type' => (string) ($account['type'] ?? 'epic'),
            'level' => $battlePass['level'] ?? null,
            'progress' => $battlePass['progress'] ?? null,
            'wins' => (int) ($all['wins'] ?? 0),
            'matches' => (int) ($all['matches'] ?? 0),
            'kills' => (int) ($all['kills'] ?? 0),
            'deaths' => (int) ($all['deaths'] ?? 0),
            'kd' => isset($all['kd']) ? (float) $all['kd'] : null,
            'win_rate' => isset($all['winRate']) ? (float) $all['winRate'] : null,
            'minutes_played' => (int) ($all['minutesPlayed'] ?? 0),
            'score' => (int) ($all['score'] ?? 0),
            'top3' => (int) ($all['top3'] ?? 0),
            'top5' => (int) ($all['top5'] ?? 0),
            'top10' => (int) ($all['top10'] ?? 0),
            'top25' => (int) ($all['top25'] ?? 0),
            'stats' => $stats,
            'raw' => $data,
            'avatar_url' => 'https://api.dicebear.com/9.x/identicon/svg?seed='.rawurlencode('fortnite-'.$accountId),
            'fetched_at' => now()->timestamp,
        ];
    }
}
