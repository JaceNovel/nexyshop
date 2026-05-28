<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\TournamentTeam;
use App\Services\Suppliers\SupplierManager;
use Illuminate\Http\Request;

class PlayerController extends Controller
{
    public function verify(Request $request, SupplierManager $suppliers)
    {
        $data = $request->validate([
            'game' => ['required', 'string', 'max:80'],
            'uid' => ['required', 'string', 'max:64'],
        ]);

        $supplier = Supplier::whereActive(true)->orderBy('priority')->first();

        if (! $supplier || app()->environment('local')) {
            return [
                'uid' => $data['uid'],
                'nickname' => 'NEXY_'.$data['uid'],
                'avatar' => 'https://cdn.nexy.gg/avatars/demo.png',
                'verified' => true,
            ];
        }

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
}
