<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class PublicProfileController extends Controller
{
    public function show(string $username)
    {
        $cacheKey = 'public_profile:'.mb_strtolower($username);

        $payload = Cache::remember($cacheKey, now()->addHour(), function () use ($username) {
            $user = User::query()->where('username', $username)->first();

            if (! $user || ! $user->public_profile) {
                return null;
            }

            return [
                'username' => $user->username,
                'avatar' => $user->avatar_url ?: $user->google_avatar_url,
                'rank' => $user->rank,
                'points' => (int) ($user->points ?? 0),
                'guild' => $user->guild,
                'wins' => (int) ($user->wins ?? 0),
                'tournaments_won' => (int) ($user->tournaments_won ?? 0),
                'kd_ratio' => $user->kd_ratio !== null ? (float) $user->kd_ratio : null,
                'badges' => $user->badges ?? [],
                'country' => $user->country,
                'created_at' => optional($user->created_at)->toISOString(),
            ];
        });

        abort_unless($payload, 404, 'Profil introuvable.');

        return response()->json($payload);
    }
}

