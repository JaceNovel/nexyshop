<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Games\GenshinImpactService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class GenshinImpactController extends Controller
{
    public function overview(GenshinImpactService $genshin): JsonResponse
    {
        try {
            return response()->json($genshin->overview());
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function catalog(Request $request, GenshinImpactService $genshin): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'in:characters,weapons,artifacts'],
            'q' => ['nullable', 'string', 'max:64'],
            'field' => ['nullable', 'string', 'max:64'],
            'page' => ['nullable', 'integer', 'min:1'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        try {
            return response()->json($genshin->catalog(
                $data['type'],
                $data['q'] ?? null,
                $data['field'] ?? null,
                (int) ($data['page'] ?? 1),
                (int) ($data['limit'] ?? 100),
            ));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }
}
