<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\TournamentTeam;
use App\Services\FreeFire\FreeFireLookupService;
use App\Services\Suppliers\SupplierManager;
use Illuminate\Http\Request;
use RuntimeException;

class PlayerController extends Controller
{
    public function verify(Request $request, SupplierManager $suppliers, FreeFireLookupService $freeFire)
    {
        $data = $request->validate([
            'game' => ['required', 'string', 'max:80'],
            'uid' => ['required', 'string', 'max:64'],
            'region' => ['nullable', 'string', 'max:8'],
        ]);

        if ($this->isFreeFireGame($data['game'])) {
            try {
                $profile = $freeFire->validateUid($data['uid'], $data['region'] ?? config('services.freefire.lookup.default_region', 'me'));
            } catch (RuntimeException $exception) {
                return response()->json([
                    'message' => $this->publicVerificationMessage($exception),
                    'verified' => false,
                ], 422);
            }

            return [
                'uid' => $profile['uid'],
                'nickname' => $profile['nickname'],
                'avatar' => null,
                'region' => $profile['region'] ?? null,
                'level' => $profile['level'] ?? null,
                'verified' => (bool) ($profile['verified'] ?? false),
            ];
        }

        $supplier = Supplier::whereActive(true)->orderBy('priority')->first();

        abort_unless($supplier, 503, 'Service de vérification joueur indisponible.');

        return $suppliers->gateway($supplier)->verifyPlayer($data['game'], $data['uid']);
    }

    public function leaderboards()
    {
        return [
            'top_players' => TournamentTeam::orderByDesc('points')->limit(20)->get(),
            'top_killers' => TournamentTeam::orderByDesc('kills')->limit(20)->get(),
            'top_guilds' => TournamentTeam::selectRaw('guild_id, sum(points) as points, sum(kills) as kills')
                ->groupBy('guild_id')
                ->orderByDesc('points')
                ->limit(20)
                ->get(),
        ];
    }

    private function isFreeFireGame(string $game): bool
    {
        $normalized = str($game)->lower()->ascii()->toString();

        return str_contains($normalized, 'free fire') || str_contains($normalized, 'freefire') || str_contains($normalized, 'garena');
    }

    private function publicVerificationMessage(RuntimeException $exception): string
    {
        $message = $exception->getMessage();

        if (str_contains($message, 'clé') || str_contains($message, 'API')) {
            return 'Vérification du joueur indisponible pour le moment.';
        }

        return $message ?: 'Vérification du joueur impossible.';
    }
}
