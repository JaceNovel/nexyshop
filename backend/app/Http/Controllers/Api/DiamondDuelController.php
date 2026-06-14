<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiamondDuel;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiamondDuelController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', 5), 1), 50);
        $status = $request->query('status');
        $query = DiamondDuel::query()->visible()->latest();

        if (is_string($status) && in_array($status, ['open', 'matched', 'active', 'completed'], true)) {
            $query->where('status', $status);
        }

        $duels = $query->limit($limit)->get()->map(fn (DiamondDuel $duel) => $this->serialize($duel));

        return response()->json([
            'stats' => $this->stats(),
            'available' => $duels,
        ]);
    }

    public function mine(Request $request): JsonResponse
    {
        $user = $request->user();

        $duels = DiamondDuel::query()
            ->where(function ($query) use ($user) {
                $query->where('creator_user_id', $user->id)
                    ->orWhere('opponent_user_id', $user->id);
            })
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (DiamondDuel $duel) => $this->serialize($duel));

        return response()->json(['data' => $duels]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'stake' => ['required', 'integer', 'in:100,300,500,1000,5000,10000'],
            'mode' => ['required', 'string', 'in:1v1 Classique,Sniper,Desert Eagle,Clash Squad'],
            'map' => ['required', 'string', 'in:Bermuda,Kalahari,Alpine,Purgatory'],
        ]);

        $user = $request->user();

        $duel = DiamondDuel::create([
            'creator_user_id' => $user->id,
            'creator_name' => $this->displayName($user),
            'creator_avatar' => $this->avatar($user),
            'creator_rank' => $this->rank($user),
            'stake' => $data['stake'],
            'prize_pool' => $data['stake'] * 3,
            'mode' => $data['mode'],
            'map' => $data['map'],
            'status' => 'open',
            'metadata' => [
                'paid' => false,
                'payment_required' => true,
                'created_from' => 'duel_page',
            ],
        ]);

        return response()->json(['data' => $this->serialize($duel)], 201);
    }

    public function join(Request $request, DiamondDuel $duel): JsonResponse
    {
        $user = $request->user();

        if ($duel->status !== 'open') {
            return response()->json(['message' => 'Ce duel n’est plus disponible.'], 422);
        }

        if ((int) $duel->creator_user_id === (int) $user->id) {
            return response()->json(['message' => 'Tu ne peux pas rejoindre ton propre duel.'], 422);
        }

        $duel->update([
            'opponent_user_id' => $user->id,
            'opponent_name' => $this->displayName($user),
            'opponent_avatar' => $this->avatar($user),
            'opponent_rank' => $this->rank($user),
            'status' => 'matched',
        ]);

        return response()->json(['data' => $this->serialize($duel->refresh())]);
    }

    public function accept(Request $request, DiamondDuel $duel): JsonResponse
    {
        $this->authorizeDuelUser($request, $duel);

        if ($duel->status !== 'matched') {
            return response()->json(['message' => 'Ce duel ne peut pas être accepté maintenant.'], 422);
        }

        $duel->update([
            'status' => 'active',
            'accepted_at' => now(),
        ]);

        return response()->json(['data' => $this->serialize($duel->refresh())]);
    }

    public function decline(Request $request, DiamondDuel $duel): JsonResponse
    {
        $this->authorizeDuelUser($request, $duel);

        if (! in_array($duel->status, ['open', 'matched'], true)) {
            return response()->json(['message' => 'Ce duel ne peut pas être annulé maintenant.'], 422);
        }

        $duel->update([
            'opponent_user_id' => null,
            'opponent_name' => null,
            'opponent_avatar' => null,
            'opponent_rank' => null,
            'status' => (int) $duel->creator_user_id === (int) $request->user()->id ? 'cancelled' : 'open',
        ]);

        return response()->json(['data' => $this->serialize($duel->refresh())]);
    }

    private function stats(): array
    {
        $today = now()->startOfDay();

        return [
            'duels_today' => DiamondDuel::where('created_at', '>=', $today)->count(),
            'diamonds_distributed' => (int) DiamondDuel::where('status', 'completed')->where('completed_at', '>=', $today)->sum('prize_pool'),
            'active_players' => $this->activePlayers(),
            'average_win_rate' => $this->averageWinRate(),
        ];
    }

    private function activePlayers(): int
    {
        $ids = DiamondDuel::query()
            ->whereIn('status', ['open', 'matched', 'active'])
            ->where('updated_at', '>=', now()->subDay())
            ->get(['creator_user_id', 'opponent_user_id'])
            ->flatMap(fn (DiamondDuel $duel) => [$duel->creator_user_id, $duel->opponent_user_id])
            ->filter()
            ->unique();

        return $ids->count();
    }

    private function averageWinRate(): float
    {
        $completed = DiamondDuel::where('status', 'completed')->count();

        if ($completed === 0) {
            return 0.0;
        }

        $withWinner = DiamondDuel::where('status', 'completed')->whereNotNull('winner_user_id')->count();

        return round(($withWinner / $completed) * 100, 1);
    }

    private function serialize(DiamondDuel $duel): array
    {
        return [
            'id' => $duel->id,
            'status' => $duel->status,
            'stake' => (int) $duel->stake,
            'prize_pool' => (int) $duel->prize_pool,
            'mode' => $duel->mode,
            'map' => $duel->map,
            'created_at' => $duel->created_at?->toISOString(),
            'accepted_at' => $duel->accepted_at?->toISOString(),
            'creator' => [
                'id' => $duel->creator_user_id,
                'name' => $duel->creator_name,
                'avatar' => $duel->creator_avatar,
                'rank' => $duel->creator_rank,
            ],
            'opponent' => $duel->opponent_user_id ? [
                'id' => $duel->opponent_user_id,
                'name' => $duel->opponent_name,
                'avatar' => $duel->opponent_avatar,
                'rank' => $duel->opponent_rank,
            ] : null,
        ];
    }

    private function authorizeDuelUser(Request $request, DiamondDuel $duel): void
    {
        abort_unless(in_array((int) $request->user()->id, [(int) $duel->creator_user_id, (int) $duel->opponent_user_id], true), 403);
    }

    private function displayName(User $user): string
    {
        return $user->name ?: $user->username ?: 'Joueur Astral';
    }

    private function avatar(User $user): ?string
    {
        return $user->avatar_url ?: $user->google_avatar_url;
    }

    private function rank(User $user): string
    {
        return $user->rank ?: 'Diamant';
    }
}
