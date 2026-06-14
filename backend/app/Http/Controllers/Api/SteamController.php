<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Steam\SteamService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class SteamController extends Controller
{
    public function redirect(Request $request, SteamService $steam)
    {
        $state = Str::random(48);
        Cache::put('steam_oauth_state:'.$state, $request->user()?->id, now()->addMinutes(10));
        $returnUrl = rtrim((string) config('app.url'), '/').'/api/auth/steam/callback?state='.$state;

        return response()->json(['url' => $steam->loginUrl($returnUrl)]);
    }

    public function callback(Request $request, SteamService $steam)
    {
        try {
            $state = (string) $request->query('state');
            $userId = $state ? Cache::pull('steam_oauth_state:'.$state) : null;
            $steamId = $steam->validateOpenId($request->query());
            $frontendUrl = rtrim((string) config('services.google.frontend_url'), '/');

            if ($userId && $user = User::find($userId)) {
                $user = $steam->linkUser($user, $steamId);

                return redirect()->away($frontendUrl.'/profil?steam=connected&steam_id='.$user->steam_id);
            }

            $profile = $steam->playerProfile($steamId);
            $user = User::query()->firstOrCreate(
                ['steam_id' => $steamId],
                [
                    'name' => $profile['persona_name'] ?? 'Steam Player',
                    'email' => 'steam_'.$steamId.'@astral4gamer.local',
                    'password' => null,
                    'steam_persona_name' => $profile['persona_name'] ?? null,
                    'steam_avatar_url' => $profile['avatar'] ?? null,
                    'steam_connected_at' => now(),
                    'last_login_at' => now(),
                ]
            );
            $user = $steam->linkUser($user, $steamId);
            $token = $user->createToken('steam-web')->plainTextToken;

            return redirect()->away($frontendUrl.'/auth/google/callback?'.http_build_query([
                'token' => $token,
                'name' => $user->name,
                'avatar' => $user->steam_avatar_url,
                'steam_id' => $steamId,
            ]));
        } catch (\Throwable $exception) {
            $frontendUrl = rtrim((string) config('services.google.frontend_url'), '/');

            return redirect()->away($frontendUrl.'/connexion?steam_error='.urlencode($exception->getMessage()));
        }
    }

    public function profile(Request $request, SteamService $steam)
    {
        $steamId = $request->query('steam_id') ?: $request->user()?->steam_id;
        abort_unless($steamId, 422, 'SteamID requis.');

        return response()->json(['data' => $steam->playerProfile((string) $steamId)]);
    }

    public function me(Request $request, SteamService $steam)
    {
        abort_unless($request->user()?->steam_id, 404, 'Compte Steam non connecte.');

        return response()->json([
            'connected' => true,
            'data' => $steam->playerProfile((string) $request->user()->steam_id),
        ]);
    }

    public function news(Request $request, SteamService $steam)
    {
        $appid = $request->integer('appid') ?: null;
        $count = min(max($request->integer('count', 5), 1), 20);

        return response()->json(['data' => $steam->officialNews($appid, $count)]);
    }

    public function achievements(Request $request, SteamService $steam)
    {
        $appid = $request->integer('appid');
        abort_unless($appid, 422, 'AppID Steam requis.');

        return response()->json(['data' => $steam->globalAchievements($appid)]);
    }

    public function playerAchievements(Request $request, SteamService $steam)
    {
        $appid = $request->integer('appid');
        $steamId = $request->query('steam_id') ?: $request->user()?->steam_id;
        abort_unless($appid && $steamId, 422, 'SteamID et AppID requis.');

        return response()->json(['data' => $steam->playerAchievements((string) $steamId, $appid)]);
    }

    public function tf2Items(SteamService $steam)
    {
        return response()->json(['data' => $steam->teamFortressItems()]);
    }
}
