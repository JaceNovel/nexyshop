<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Pubg\PubgApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class PubgController extends Controller
{
    public function profile(Request $request, PubgApiService $pubg): JsonResponse
    {
        $data = $request->validate([
            'gameId' => ['required_without:game_id', 'string', 'max:120'],
            'game_id' => ['required_without:gameId', 'string', 'max:120'],
            'platform' => ['nullable', 'string', 'max:32'],
        ]);

        try {
            return response()->json($pubg->profile(
                (string) ($data['gameId'] ?? $data['game_id']),
                (string) ($data['platform'] ?? 'steam')
            ));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function matches(Request $request, PubgApiService $pubg): JsonResponse
    {
        $data = $request->validate([
            'player' => ['required', 'string', 'max:120'],
            'platform' => ['nullable', 'string', 'max:32'],
        ]);

        try {
            return response()->json($pubg->recentMatches(
                (string) $data['player'],
                (string) ($data['platform'] ?? 'steam')
            ));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function match(Request $request, PubgApiService $pubg): JsonResponse
    {
        $data = $request->validate([
            'id' => ['required', 'string', 'max:160'],
            'platform' => ['nullable', 'string', 'max:32'],
        ]);

        try {
            return response()->json($pubg->match(
                (string) $data['id'],
                (string) ($data['platform'] ?? 'steam')
            ));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function leaderboard(Request $request, PubgApiService $pubg): JsonResponse
    {
        try {
            return response()->json($pubg->leaderboard(
                (string) $request->query('season', 'current'),
                (string) $request->query('mode', 'squad-fpp'),
                (string) $request->query('region', 'pc-eu')
            ));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }
}
