<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

class AdminSecurityController extends Controller
{
    public function reportUnauthorizedAccess(Request $request)
    {
        $data = $request->validate([
            'path' => ['nullable', 'string', 'max:255'],
            'return_to' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $this->userFromBearer($request);
        $identifier = $user ? 'user:'.$user->id : 'ip:'.$request->ip();
        $attemptKey = 'admin_access_attempts:'.$identifier;
        $blockKey = 'admin_access_block:'.$identifier;
        $suspendKey = 'admin_access_suspended:'.$identifier;
        $attempts = (int) Cache::get($attemptKey, 0) + 1;
        $now = now();

        Cache::put($attemptKey, $attempts, $now->copy()->addDay());

        if ($attempts >= 3) {
            $this->recordBlock($identifier, $user, $request->ip(), $attempts, null, $now, $data['path'] ?? null);
            Cache::forever($suspendKey, [
                'path' => $data['path'] ?? null,
                'ip' => $request->ip(),
                'at' => $now->toIso8601String(),
            ]);

            if ($user) {
                $user->forceFill(['admin_access_suspended_at' => $now])->save();
            }

            return response()->json([
                'status' => 'suspended',
                'message' => 'Acces admin suspendu.',
                'redirect_to' => $this->safeReturnTo($data['return_to'] ?? null),
            ], 423);
        }

        $blockedUntil = $now->copy()->addHour();
        $this->recordBlock($identifier, $user, $request->ip(), $attempts, $blockedUntil, null, $data['path'] ?? null);
        Cache::put($blockKey, [
            'until' => $blockedUntil->toIso8601String(),
            'path' => $data['path'] ?? null,
            'ip' => $request->ip(),
        ], $blockedUntil);

        if ($user) {
            $user->forceFill(['admin_access_blocked_until' => $blockedUntil])->save();
        }

        return response()->json([
            'status' => 'blocked',
            'attempts' => $attempts,
            'blocked_until' => $blockedUntil->toIso8601String(),
            'redirect_to' => $this->safeReturnTo($data['return_to'] ?? null),
        ]);
    }

    public function index()
    {
        return response()->json([
            'data' => DB::table('admin_access_blocks')
                ->leftJoin('users', 'admin_access_blocks.user_id', '=', 'users.id')
                ->select([
                    'admin_access_blocks.identifier',
                    'admin_access_blocks.type',
                    'admin_access_blocks.user_id',
                    'users.email as user_email',
                    'admin_access_blocks.ip_address',
                    'admin_access_blocks.attempts',
                    'admin_access_blocks.blocked_until',
                    'admin_access_blocks.suspended_at',
                    'admin_access_blocks.last_path',
                    'admin_access_blocks.updated_at',
                ])
                ->latest('admin_access_blocks.updated_at')
                ->limit(100)
                ->get(),
        ]);
    }

    public function unblock(Request $request)
    {
        $data = $request->validate([
            'identifier' => ['required', 'string', 'max:255'],
        ]);

        $block = DB::table('admin_access_blocks')->where('identifier', $data['identifier'])->first();
        abort_unless($block, 404, 'Blocage introuvable.');

        Cache::forget('admin_access_attempts:'.$block->identifier);
        Cache::forget('admin_access_block:'.$block->identifier);
        Cache::forget('admin_access_suspended:'.$block->identifier);

        if ($block->user_id) {
            User::query()->whereKey($block->user_id)->update([
                'admin_access_blocked_until' => null,
                'admin_access_suspended_at' => null,
            ]);
        }

        DB::table('admin_access_blocks')->where('identifier', $block->identifier)->delete();

        return response()->json(['message' => 'Blocage retire.']);
    }

    private function recordBlock(string $identifier, ?User $user, string $ip, int $attempts, $blockedUntil, $suspendedAt, ?string $path): void
    {
        DB::table('admin_access_blocks')->updateOrInsert(
            ['identifier' => $identifier],
            [
                'type' => $user ? 'user' : 'ip',
                'user_id' => $user?->id,
                'ip_address' => $ip,
                'attempts' => $attempts,
                'blocked_until' => $blockedUntil,
                'suspended_at' => $suspendedAt,
                'last_path' => $path,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    private function userFromBearer(Request $request): ?User
    {
        $token = $request->bearerToken();
        if (! $token) return null;

        $accessToken = PersonalAccessToken::findToken($token);

        return $accessToken?->tokenable instanceof User ? $accessToken->tokenable : null;
    }

    private function safeReturnTo(?string $path): string
    {
        if (! $path || ! str_starts_with($path, '/') || str_starts_with($path, '//') || str_starts_with($path, '/admin')) {
            return '/';
        }

        return $path;
    }
}