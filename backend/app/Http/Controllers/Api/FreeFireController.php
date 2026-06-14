<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FreeFire\HlGamingFreeFireService;
use App\Services\FreeFire\RedeemCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

class FreeFireController extends Controller
{
    public function validateUid(Request $request, HlGamingFreeFireService $freeFire): JsonResponse
    {
        $data = $request->validate([
            'uid' => ['required', 'string', 'max:32'],
            'region' => ['required', 'string', 'max:8'],
        ]);

        try {
            return response()->json($freeFire->validateUid($data['uid'], $data['region']));
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage() ?: 'ID Free Fire incorrect.',
                'verified' => false,
            ], 422);
        }
    }

    public function profile(Request $request, HlGamingFreeFireService $freeFire): JsonResponse
    {
        $data = $request->validate([
            'uid' => ['required', 'string', 'max:32'],
            'region' => ['required', 'string', 'max:8'],
        ]);

        try {
            return response()->json($freeFire->profile($data['uid'], $data['region']));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function visuals(Request $request, HlGamingFreeFireService $freeFire): JsonResponse
    {
        $data = $request->validate([
            'uid' => ['required', 'string', 'max:32'],
            'region' => ['required', 'string', 'max:8'],
        ]);

        return response()->json($freeFire->visuals($data['uid'], $data['region']));
    }

    public function image(Request $request, HlGamingFreeFireService $freeFire): JsonResponse
    {
        $data = $request->validate([
            'img_code' => ['required', 'string', 'max:80'],
        ]);

        return response()->json($freeFire->imageByCode($data['img_code']));
    }

    public function likesQuote(HlGamingFreeFireService $freeFire): JsonResponse
    {
        return response()->json($freeFire->likesQuote());
    }

    public function requestLikes(Request $request, HlGamingFreeFireService $freeFire): JsonResponse
    {
        $data = $request->validate([
            'uid' => ['required', 'string', 'max:32'],
            'region' => ['required', 'string', 'max:8'],
            'likes' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        try {
            return response()->json($freeFire->requestLikes($data['uid'], $data['region'], (int) ($data['likes'] ?? 100)));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function redeemCodes(Request $request, RedeemCodeService $redeemCodes): JsonResponse
    {
        try {
            return response()->json($redeemCodes->publicCodes(
                $request->query('user_id'),
                $request->query('date')
            ));
        } catch (RuntimeException $exception) {
            return response()->json([
                'enabled' => false,
                'message' => $exception->getMessage() ?: 'Redeem codes indisponibles.',
                'codes' => [],
            ]);
        } catch (Throwable) {
            return response()->json([
                'enabled' => false,
                'message' => 'Redeem codes indisponibles.',
                'codes' => [],
            ]);
        }
    }

    public function claimRedeemCode(Request $request, RedeemCodeService $redeemCodes): JsonResponse
    {
        $data = $request->validate([
            'code_id' => ['required', 'string', 'max:80'],
            'user_id' => ['required', 'string', 'max:120'],
            'date' => ['nullable', 'string', 'max:40'],
        ]);

        try {
            return response()->json($redeemCodes->claim($data['code_id'], $data['user_id'], $data['date'] ?? null));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function requestProfileRefresh(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'status' => 'payment_required',
            'amount' => 1,
            'currency' => 'USD',
            'message' => 'La mise à jour du profil Free Fire nécessite un paiement de 1$ avant exécution.',
            'uid' => $user?->player_uid,
        ], 402);
    }
}
