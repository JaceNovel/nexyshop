<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CallOfDuty\CallOfDutyApiService;
use App\Services\FreeFire\FreeFireLookupService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class PublicProfileController extends Controller
{
    public function showByFreeFireUid(string $uid)
    {
        $normalizedUid = trim($uid);
        $user = User::query()
            ->where('player_uid', $normalizedUid)
            ->where('public_profile', true)
            ->first();

        abort_unless($user, 404, 'Joueur introuvable.');

        return response()->json([
            'source' => 'local',
            'username' => $user->username,
            'display_name' => $user->username,
            'avatar' => $user->avatar_url ?: $user->google_avatar_url,
            'game' => $user->game,
            'player_uid' => $user->player_uid,
            'rank' => $user->rank,
            'points' => (int) ($user->points ?? 0),
            'guild' => $user->guild,
            'wins' => (int) ($user->wins ?? 0),
            'tournaments_won' => (int) ($user->tournaments_won ?? 0),
            'kd_ratio' => $user->kd_ratio !== null ? (float) $user->kd_ratio : null,
            'badges' => $user->badges ?? [],
            'country' => $user->country,
            'free_fire' => [
                'uid' => $user->player_uid,
                'region' => $this->freeFireRegion($user),
                'nickname' => $user->username,
                'level' => null,
                'likes' => null,
                'rank' => $user->rank ? ['br' => $user->rank, 'cs' => null, 'season' => null] : null,
                'br_rank_points' => $user->points,
                'cs_rank_points' => null,
                'guild' => $user->guild ? ['GuildName' => $user->guild] : null,
                'stats' => null,
                'outfit_url' => null,
                'banner_url' => null,
            ],
            'created_at' => optional($user->created_at)->toISOString(),
        ]);
    }

    public function showByCodActivisionId(string $activisionId, CallOfDutyApiService $callOfDuty)
    {
        $normalizedId = trim($activisionId);
        $centralLookupConfigured = true;

        try {
            $remoteProfile = $callOfDuty->playerIdentity($normalizedId);

            if ($remoteProfile) {
                return response()->json($this->codRemotePayload($normalizedId, $remoteProfile));
            }
        } catch (RuntimeException $exception) {
            if ($exception->getMessage() !== 'Clé API Call of Duty manquante.') {
                throw $exception;
            }

            $centralLookupConfigured = false;
        } catch (RequestException) {
            // If the central API is temporarily unavailable, still try local public profiles.
        }

        try {
            $user = User::query()
                ->where('player_uid', $normalizedId)
                ->where('public_profile', true)
                ->where(function ($query) {
                    $query->where('game', 'call_of_duty')
                        ->orWhere('game', 'cod')
                        ->orWhere('game', 'codm')
                        ->orWhere('game', 'like', '%call%')
                        ->orWhere('game', 'like', '%duty%');
                })
                ->first();
        } catch (QueryException) {
            $user = null;
        }

        if (! $user && ! $centralLookupConfigured) {
            abort(503, 'Recherche centrale Call of Duty non configurée. Ajoute CALLOFDUTY_API_KEY au backend.');
        }

        abort_unless($user, 404, 'Joueur Call of Duty introuvable.');

        return response()->json($this->codPayload($user, [
            'username' => $user->username,
            'cod_username' => $user->username,
            'activision_id' => $user->player_uid,
            'avatar_url' => $user->avatar_url ?: $user->google_avatar_url,
            'linked' => true,
            'provider' => 'activision',
            'verification_status' => 'verified',
            'account' => [
                'created_at' => optional($user->created_at)->toISOString(),
            ],
        ]));
    }

    public function show(string $username, FreeFireLookupService $freeFire)
    {
        $user = User::query()->where('username', $username)->first();

        abort_unless($user && $user->public_profile, 404, 'Profil introuvable.');

        $cacheKey = 'public_profile:'.$user->id.':'.optional($user->updated_at)->timestamp;

        $payload = Cache::remember($cacheKey, now()->addMinutes(30), function () use ($user, $freeFire) {
            $freeFireProfile = $this->freeFireProfile($user, $freeFire);

            $displayName = $freeFireProfile['nickname'] ?? $user->username;
            $rank = $user->rank ?: $this->formatFreeFireRank($freeFireProfile['rank']['br'] ?? null);
            $guild = $user->guild ?: $this->formatFreeFireGuild($freeFireProfile['guild'] ?? null);

            return [
                'username' => $user->username,
                'display_name' => $displayName,
                'avatar' => $user->avatar_url ?: $user->google_avatar_url,
                'game' => $user->game,
                'player_uid' => $user->player_uid,
                'rank' => $rank,
                'points' => (int) ($user->points ?? $freeFireProfile['br_rank_points'] ?? 0),
                'guild' => $guild,
                'wins' => (int) ($user->wins ?? 0),
                'tournaments_won' => (int) ($user->tournaments_won ?? 0),
                'kd_ratio' => $user->kd_ratio !== null ? (float) $user->kd_ratio : null,
                'badges' => $user->badges ?? [],
                'country' => $user->country,
                'free_fire' => $freeFireProfile,
                'call_of_duty' => $this->isCodProfile($user) ? [
                    'username' => $user->username,
                    'cod_username' => $user->username,
                    'activision_id' => $user->player_uid,
                    'avatar_url' => $user->avatar_url ?: $user->google_avatar_url,
                    'linked' => true,
                    'provider' => 'activision',
                    'verification_status' => 'verified',
                    'account' => [
                        'created_at' => optional($user->created_at)->toISOString(),
                    ],
                ] : null,
                'created_at' => optional($user->created_at)->toISOString(),
            ];
        });

        return response()->json($payload);
    }

    private function freeFireProfile(User $user, FreeFireLookupService $freeFire): ?array
    {
        if (! $this->isFreeFireProfile($user) || blank($user->player_uid)) {
            return null;
        }

        try {
            $profile = $freeFire->profile((string) $user->player_uid, $this->freeFireRegion($user));

            return [
                'uid' => $profile['uid'] ?? $user->player_uid,
                'region' => $profile['region'] ?? $this->freeFireRegion($user),
                'nickname' => $profile['nickname'] ?? null,
                'level' => $profile['level'] ?? null,
                'likes' => $profile['likes'] ?? null,
                'rank' => $profile['rank'] ?? null,
                'br_rank_points' => $profile['br_rank_points'] ?? null,
                'cs_rank_points' => $profile['cs_rank_points'] ?? null,
                'guild' => $profile['guild'] ?? null,
                'stats' => $profile['stats'] ?? null,
                'outfit_url' => $profile['outfit_url'] ?? null,
                'banner_url' => $profile['banner_url'] ?? null,
            ];
        } catch (RuntimeException) {
            return null;
        }
    }

    private function isFreeFireProfile(User $user): bool
    {
        $game = mb_strtolower((string) $user->game);

        return str_contains($game, 'free') || str_contains($game, 'fire') || filled($user->player_uid);
    }

    private function isCodProfile(User $user): bool
    {
        $game = mb_strtolower((string) $user->game);

        return str_contains($game, 'call')
            || str_contains($game, 'duty')
            || str_contains($game, 'cod');
    }

    private function codPayload(User $user, array $codProfile): array
    {
        return [
            'source' => 'local',
            'username' => $user->username,
            'display_name' => $codProfile['cod_username'] ?? $codProfile['username'] ?? $user->username,
            'avatar' => $codProfile['avatar_url'] ?? $user->avatar_url ?: $user->google_avatar_url,
            'game' => $user->game,
            'player_uid' => $user->player_uid,
            'rank' => $user->rank,
            'points' => (int) ($user->points ?? 0),
            'guild' => $user->guild,
            'wins' => (int) ($user->wins ?? 0),
            'tournaments_won' => (int) ($user->tournaments_won ?? 0),
            'kd_ratio' => $user->kd_ratio !== null ? (float) $user->kd_ratio : null,
            'badges' => $user->badges ?? [],
            'country' => $user->country,
            'call_of_duty' => $codProfile,
            'created_at' => optional($user->created_at)->toISOString(),
        ];
    }

    private function codRemotePayload(string $activisionId, array $remoteProfile): array
    {
        $payload = $remoteProfile['payload'] ?? [];
        $identity = is_array($payload) ? $payload : [];
        $username = $this->firstFilled([
            $identity['username'] ?? null,
            $identity['uno'] ?? null,
            $identity['gamertag'] ?? null,
            $identity['name'] ?? null,
            $identity['displayName'] ?? null,
            $activisionId,
        ]);

        return [
            'source' => 'callofdutyapi',
            'username' => $username,
            'display_name' => $username,
            'avatar' => null,
            'game' => 'call_of_duty',
            'player_uid' => $activisionId,
            'rank' => null,
            'points' => 0,
            'guild' => null,
            'wins' => 0,
            'tournaments_won' => 0,
            'kd_ratio' => null,
            'badges' => [],
            'country' => null,
            'call_of_duty' => [
                'username' => $username,
                'cod_username' => $username,
                'activision_id' => $activisionId,
                'email' => null,
                'has_codm_account' => true,
                'avatar_url' => null,
                'linked' => false,
                'provider' => 'callofdutyapi',
                'verification_status' => 'found_via_callofdutyapi',
                'account' => $identity,
                'relationships' => [],
                'friend_feed' => [],
                'fetched_at' => now()->timestamp,
            ],
            'created_at' => null,
        ];
    }

    private function firstFilled(array $values): string
    {
        foreach ($values as $value) {
            if (filled($value)) {
                return (string) $value;
            }
        }

        return 'Call of Duty Player';
    }

    private function freeFireRegion(User $user): string
    {
        $supported = ['in', 'br', 'sg', 'ru', 'id', 'tw', 'us', 'vn', 'th', 'me', 'pk', 'bd', 'cis'];
        $candidate = mb_strtolower((string) $user->country);

        return in_array($candidate, $supported, true)
            ? $candidate
            : mb_strtolower((string) config('services.freefire.lookup.default_region', 'me'));
    }

    private function formatFreeFireRank(mixed $rank): ?string
    {
        if ($rank === null || $rank === '') {
            return null;
        }

        return 'BR '.$rank;
    }

    private function formatFreeFireGuild(mixed $guild): ?string
    {
        if (! is_array($guild)) {
            return null;
        }

        return $guild['GuildName'] ?? $guild['guildName'] ?? null;
    }
}
