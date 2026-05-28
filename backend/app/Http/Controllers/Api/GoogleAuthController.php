<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GooglePeopleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleAuthController extends Controller
{
    public function redirect(GooglePeopleService $google)
    {
        return redirect()->away($google->getAuthorizationUrl());
    }

    public function callback(Request $request, GooglePeopleService $google)
    {
        try {
            $result = $google->handleCallback($request->query());
            $frontendUrl = rtrim((string) config('services.google.frontend_url'), '/');

            if ($request->expectsJson()) {
                return response()->json($result);
            }

            return redirect()->away($frontendUrl.'/auth/google/callback?'.http_build_query([
                'token' => $result['token'],
                'name' => $result['user']->name,
                'avatar' => $result['user']->google_avatar_url,
            ]));
        } catch (\Throwable $exception) {
            Log::error('Google OAuth callback failed', ['message' => $exception->getMessage()]);
            $frontendUrl = rtrim((string) config('services.google.frontend_url'), '/');

            return redirect()->away($frontendUrl.'/auth/google/callback?error='.urlencode($exception->getMessage()));
        }
    }

    public function profile(Request $request)
    {
        $user = $request->user()->load('googleAccounts');
        $account = $user->googleAccounts->firstWhere('provider', 'google');

        return response()->json([
            'connected' => (bool) $account,
            'user' => $user,
            'google' => $account ? [
                'email' => $account->email,
                'name' => $account->name,
                'avatar_url' => $account->avatar_url,
                'token_expires_at' => $account->token_expires_at,
                'scopes' => $account->scopes,
            ] : null,
        ]);
    }

    public function disconnect(Request $request, GooglePeopleService $google)
    {
        $google->disconnectGoogle($request->user());

        return response()->json(['message' => 'Compte Google deconnecte.']);
    }
}
