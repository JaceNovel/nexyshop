<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Fortnite\FortniteApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class FortniteController extends Controller
{
    public function profile(Request $request, FortniteApiService $fortnite): JsonResponse
    {
        $data = $request->validate([
            'account_id' => ['required', 'string', 'max:120'],
        ]);

        try {
            return response()->json($fortnite->profile($data['account_id']));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function shop(Request $request, FortniteApiService $fortnite): JsonResponse
    {
        try {
            return response()->json($fortnite->shop((string) $request->query('language', 'fr')));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function news(Request $request, FortniteApiService $fortnite): JsonResponse
    {
        try {
            return response()->json($fortnite->news(
                (string) $request->query('mode', 'br'),
                (string) $request->query('language', 'fr')
            ));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }
}
