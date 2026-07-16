<?php

namespace App\Services\Pubg;

use App\Models\ApiLog;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class PubgApiService
{
    private const PROFILE_TTL_MINUTES = 4320;
    private const MATCH_TTL_MINUTES = 4320;
    private const LEADERBOARD_TTL_MINUTES = 60;

    public function profile(string $gameId, string $platform = 'steam'): array
    {
        $normalized = trim($gameId);
        $platform = $this->normalizePlatform($platform);

        if ($normalized === '') {
            throw new RuntimeException('Entre ton ID PUBG.');
        }

        $cacheKey = 'pubg:profile:'.$platform.':'.sha1(mb_strtolower($normalized));

        return Cache::remember($cacheKey, now()->addMinutes((int) config('services.pubg.profile_cache_minutes', self::PROFILE_TTL_MINUTES)), function () use ($normalized, $platform) {
            $player = $this->findPlayer($normalized, $platform);
            $accountId = (string) ($player['id'] ?? '');
            $stats = $this->getJson('/shards/'.$platform.'/players/'.rawurlencode($accountId).'/seasons/lifetime');
            $statsResource = is_array($stats['data'] ?? null) ? $stats['data'] : [];
            $attributes = is_array($statsResource['attributes'] ?? null) ? $statsResource['attributes'] : [];
            $lifetime = $this->normalizeGameModeStats($attributes['gameModeStats'] ?? []);
            $highlights = $this->summarizeLifetime($lifetime);
            $rank = $this->buildRank($highlights);
            $playerAttributes = is_array($player['attributes'] ?? null) ? $player['attributes'] : [];

            return [
                'account_id' => $accountId,
                'game_id' => $normalized,
                'name' => (string) ($playerAttributes['name'] ?? $normalized),
                'platform' => $platform,
                'shard_id' => (string) ($playerAttributes['shardId'] ?? $platform),
                'title_id' => $playerAttributes['titleId'] ?? null,
                'avatar_url' => $this->avatarFor($accountId),
                'rank' => $rank,
                'lifetime' => $lifetime,
                'highlights' => $highlights,
                'recent_matches' => $this->extractMatchIds($player),
                'fetched_at' => now()->timestamp,
            ];
        });
    }

    public function recentMatches(string $accountIdOrName, string $platform = 'steam'): array
    {
        $platform = $this->normalizePlatform($platform);
        $profile = str_starts_with($accountIdOrName, 'account.') ? null : $this->profile($accountIdOrName, $platform);
        $accountId = $profile['account_id'] ?? $accountIdOrName;
        $player = $profile ? null : $this->findPlayer($accountId, $platform);
        $matchIds = $profile['recent_matches'] ?? $this->extractMatchIds($player ?? []);
        $matches = [];

        foreach (array_slice($matchIds, 0, 8) as $matchId) {
            try {
                $matches[] = $this->match((string) $matchId, $platform);
            } catch (RuntimeException) {
                // Keep the public history usable even if one match is unavailable.
            }
        }

        return ['data' => $matches];
    }

    public function match(string $matchId, string $platform = 'steam'): array
    {
        $id = trim($matchId);
        $platform = $this->normalizePlatform($platform);

        if ($id === '') {
            throw new RuntimeException('Entre un ID de match PUBG.');
        }

        $cacheKey = 'pubg:match:'.$platform.':'.sha1($id);

        return Cache::remember($cacheKey, now()->addMinutes((int) config('services.pubg.match_cache_minutes', self::MATCH_TTL_MINUTES)), function () use ($id, $platform) {
            $payload = $this->getJson('/shards/'.$platform.'/matches/'.rawurlencode($id), false);
            $match = is_array($payload['data'] ?? null) ? $payload['data'] : [];
            $included = is_array($payload['included'] ?? null) ? $payload['included'] : [];
            $participants = [];

            foreach ($included as $item) {
                if (($item['type'] ?? null) !== 'participant') {
                    continue;
                }

                $attributes = is_array($item['attributes'] ?? null) ? $item['attributes'] : [];
                $stats = is_array($attributes['stats'] ?? null) ? $attributes['stats'] : [];

                $participants[] = [
                    'id' => (string) ($item['id'] ?? ''),
                    'name' => (string) ($stats['name'] ?? 'Player'),
                    'account_id' => (string) ($stats['playerId'] ?? ''),
                    'team_id' => $this->numberOrNull($stats['teamId'] ?? null),
                    'rank' => $this->numberOrNull($stats['winPlace'] ?? null),
                    'kills' => $this->numberOrZero($stats['kills'] ?? null),
                    'assists' => $this->numberOrZero($stats['assists'] ?? null),
                    'damage' => $this->numberOrZero($stats['damageDealt'] ?? null),
                    'time_survived' => $this->numberOrZero($stats['timeSurvived'] ?? null),
                    'win_place' => $this->numberOrNull($stats['winPlace'] ?? null),
                ];
            }

            usort($participants, fn (array $first, array $second) => ($first['win_place'] ?? 999) <=> ($second['win_place'] ?? 999) ?: $second['kills'] <=> $first['kills']);

            $matchAttributes = is_array($match['attributes'] ?? null) ? $match['attributes'] : [];

            return [
                'id' => $id,
                'map' => (string) ($matchAttributes['mapName'] ?? 'Unknown'),
                'mode' => (string) ($matchAttributes['gameMode'] ?? 'unknown'),
                'created_at' => (string) ($matchAttributes['createdAt'] ?? ''),
                'duration' => $this->numberOrZero($matchAttributes['duration'] ?? null),
                'shard_id' => (string) ($matchAttributes['shardId'] ?? $platform),
                'participants' => $participants,
            ];
        });
    }

    public function leaderboard(string $seasonId = 'lifetime', string $gameMode = 'squad-fpp', string $region = 'pc-eu'): array
    {
        $region = $this->normalizeLeaderboardShard($region);
        $seasonPlatform = $this->seasonPlatformForLeaderboardShard($region);
        $seasonId = trim($seasonId) !== '' ? trim($seasonId) : 'current';
        if (in_array(mb_strtolower($seasonId), ['current', 'live', 'latest', 'lifetime'], true)) {
            $seasonId = $this->currentSeasonId($seasonPlatform);
        }
        $gameMode = trim($gameMode) !== '' ? trim($gameMode) : 'squad-fpp';
        $cacheKey = 'pubg:leaderboard:'.$region.':'.$seasonId.':'.$gameMode;

        return Cache::remember($cacheKey, now()->addMinutes((int) config('services.pubg.leaderboard_cache_minutes', self::LEADERBOARD_TTL_MINUTES)), function () use ($region, $seasonId, $gameMode) {
            $payload = $this->getJson('/shards/'.$region.'/leaderboards/'.rawurlencode($seasonId).'/'.rawurlencode($gameMode));
            $included = is_array($payload['included'] ?? null) ? $payload['included'] : [];
            $entries = [];

            foreach ($included as $item) {
                if (($item['type'] ?? null) !== 'player' || count($entries) >= 500) {
                    continue;
                }

                $attributes = is_array($item['attributes'] ?? null) ? $item['attributes'] : [];
                $entries[] = [
                    'rank' => count($entries) + 1,
                    'account_id' => (string) ($item['id'] ?? ''),
                    'name' => (string) ($attributes['name'] ?? 'Player '.(count($entries) + 1)),
                    'avatar_url' => $this->avatarFor((string) ($item['id'] ?? 'pubg')),
                    'stats' => $this->normalizeFlatStats($attributes['stats'] ?? []),
                ];
            }

            return ['data' => $entries];
        });
    }

    private function currentSeasonId(string $platform): string
    {
        $cacheKey = 'pubg:season:current:'.$platform;

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($platform) {
            $payload = $this->getJson('/shards/'.$platform.'/seasons');
            $seasons = is_array($payload['data'] ?? null) ? $payload['data'] : [];

            foreach ($seasons as $season) {
                $attributes = is_array($season['attributes'] ?? null) ? $season['attributes'] : [];
                if (($attributes['isCurrentSeason'] ?? false) && ! empty($season['id'])) {
                    return (string) $season['id'];
                }
            }

            $latest = collect($seasons)->last(fn ($season) => is_array($season) && ! empty($season['id']));
            if (is_array($latest) && ! empty($latest['id'])) {
                return (string) $latest['id'];
            }

            throw new RuntimeException('Saison PUBG courante introuvable.');
        });
    }

    private function findPlayer(string $value, string $platform): array
    {
        if (str_starts_with($value, 'account.')) {
            $payload = $this->getJson('/shards/'.$platform.'/players/'.rawurlencode($value));
            return is_array($payload['data'] ?? null) ? $payload['data'] : [];
        }

        $payload = $this->getJson('/shards/'.$platform.'/players?filter[playerNames]='.rawurlencode($value));
        $players = is_array($payload['data'] ?? null) ? $payload['data'] : [];
        $player = $players[0] ?? null;

        if (! is_array($player)) {
            throw new RuntimeException('Joueur PUBG introuvable.');
        }

        return $player;
    }

    private function getJson(string $path, bool $auth = true): array
    {
        $baseUrl = rtrim((string) config('services.pubg.base_url', 'https://api.pubg.com'), '/');
        $endpoint = $baseUrl.$path;
        $headers = ['Accept' => 'application/vnd.api+json'];

        if ($auth) {
            $key = (string) config('services.pubg.key');
            if ($key === '') {
                throw new RuntimeException("Ajoute PUBG_API_KEY dans l'environnement backend.");
            }
            $headers['Authorization'] = 'Bearer '.$key;
        }

        $startedAt = microtime(true);
        $response = Http::timeout((int) config('services.pubg.timeout', 12))
            ->withHeaders($headers)
            ->get($endpoint);
        $payload = $response->json() ?? [];

        try {
            ApiLog::create([
                'service' => 'pubg_api',
                'direction' => 'outbound',
                'endpoint' => $endpoint,
                'status_code' => $response->status(),
                'payload' => [],
                'response' => $payload,
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            ]);
        } catch (Throwable) {
            // API logging must not block player lookup.
        }

        if ($response->status() === 401 || $response->status() === 403) {
            throw new RuntimeException('Clé PUBG API invalide ou absente.');
        }

        if ($response->status() === 404) {
            throw new RuntimeException('Donnée PUBG introuvable.');
        }

        if ($response->status() === 429) {
            throw new RuntimeException('Limite PUBG API atteinte. Réessaie dans une minute.');
        }

        if (! $response->successful()) {
            throw new RuntimeException('Service PUBG indisponible.');
        }

        return is_array($payload) ? $payload : [];
    }

    private function normalizeGameModeStats(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $normalized = [];

        foreach ($value as $mode => $stats) {
            $normalized[(string) $mode] = $this->normalizeFlatStats($stats);
        }

        return $normalized;
    }

    private function normalizeFlatStats(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $stats = [];

        foreach ($value as $key => $item) {
            $stats[(string) $key] = $this->numberOrZero($item);
        }

        return $stats;
    }

    private function summarizeLifetime(array $lifetime): array
    {
        $total = ['matches' => 0, 'wins' => 0, 'kills' => 0, 'assists' => 0, 'damage' => 0, 'top10s' => 0, 'longestKill' => 0];

        foreach ($lifetime as $stats) {
            $total['matches'] += $this->numberOrZero($stats['roundsPlayed'] ?? null);
            $total['wins'] += $this->numberOrZero($stats['wins'] ?? null);
            $total['kills'] += $this->numberOrZero($stats['kills'] ?? null);
            $total['assists'] += $this->numberOrZero($stats['assists'] ?? null);
            $total['damage'] += $this->numberOrZero($stats['damageDealt'] ?? null);
            $total['top10s'] += $this->numberOrZero($stats['top10s'] ?? null);
            $total['longestKill'] = max($total['longestKill'], $this->numberOrZero($stats['longestKill'] ?? null));
        }

        return $total;
    }

    private function buildRank(array $stats): array
    {
        $score = (int) round(($stats['wins'] ?? 0) * 80 + ($stats['top10s'] ?? 0) * 12 + ($stats['kills'] ?? 0) * 4 + ($stats['damage'] ?? 0) / 100);
        $ranks = [
            ['Bronze', 0],
            ['Silver', 600],
            ['Gold', 1400],
            ['Platinum', 2600],
            ['Diamond', 4200],
            ['Master', 6400],
            ['Grandmaster', 9000],
        ];
        $rank = $ranks[0];

        foreach (array_reverse($ranks) as $candidate) {
            if ($score >= $candidate[1]) {
                $rank = $candidate;
                break;
            }
        }

        $next = null;
        foreach ($ranks as $candidate) {
            if ($candidate[1] > $rank[1]) {
                $next = $candidate;
                break;
            }
        }

        return [
            'label' => $rank[0],
            'tier' => $next ? max($next[1] - $score, 0).' pts avant '.$next[0] : 'Top joueur',
            'score' => $score,
            'progress' => $next ? min(100, (($score - $rank[1]) / ($next[1] - $rank[1])) * 100) : 100,
        ];
    }

    private function extractMatchIds(array $player): array
    {
        $relationships = is_array($player['relationships'] ?? null) ? $player['relationships'] : [];
        $matches = is_array($relationships['matches'] ?? null) ? $relationships['matches'] : [];
        $data = is_array($matches['data'] ?? null) ? $matches['data'] : [];

        return array_values(array_filter(array_map(fn ($match) => is_array($match) ? (string) ($match['id'] ?? '') : '', $data)));
    }

    private function avatarFor(string $accountId): string
    {
        return 'https://api.dicebear.com/9.x/identicon/svg?seed='.rawurlencode($accountId);
    }

    private function normalizePlatform(string $platform): string
    {
        $platform = mb_strtolower(trim($platform));
        if (str_starts_with($platform, 'pc-')) return 'steam';
        if (in_array($platform, ['eu', 'na', 'as', 'krjp', 'sa', 'sea', 'oc'], true)) return 'steam';
        return $platform !== '' ? $platform : 'steam';
    }

    private function normalizeLeaderboardShard(string $shard): string
    {
        $shard = mb_strtolower(trim($shard));
        if ($shard === '' || $shard === 'steam' || $shard === 'pc') return 'pc-eu';
        if (in_array($shard, ['eu', 'na', 'as', 'krjp', 'sa', 'sea', 'oc'], true)) return 'pc-'.$shard;
        return $shard;
    }

    private function seasonPlatformForLeaderboardShard(string $shard): string
    {
        if (str_starts_with($shard, 'pc-')) return 'steam';
        if (in_array($shard, ['xbox', 'psn'], true)) return $shard;
        return $this->normalizePlatform($shard);
    }

    private function numberOrZero(mixed $value): int|float
    {
        return is_numeric($value) ? $value + 0 : 0;
    }

    private function numberOrNull(mixed $value): int|float|null
    {
        return is_numeric($value) ? $value + 0 : null;
    }
}
