<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Models\TournamentRoundResult;
use App\Models\TournamentTeam;
use App\Services\TournamentScoringService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TournamentController extends Controller
{
    public function index()
    {
        return Tournament::withCount('teams')->latest('starts_at')->paginate(18);
    }

    public function show(Tournament $tournament)
    {
        return $tournament->load(['teams' => fn ($query) => $query->orderByDesc('points')]);
    }

    public function store(Request $request)
    {
        return Tournament::create($request->validate([
            'title' => ['required', 'string', 'max:160'],
            'mode' => ['required', 'in:BR Squad,Solo,Duo,Clash Squad,Guild Wars'],
            'status' => ['required', 'string'],
            'starts_at' => ['required', 'date'],
            'prize_pool' => ['required', 'numeric'],
            'room_id' => ['nullable', 'string'],
            'rules' => ['array'],
        ]));
    }

    public function update(Request $request, Tournament $tournament)
    {
        $tournament->update($request->only(['title', 'mode', 'status', 'starts_at', 'prize_pool', 'room_id', 'rules']));

        return $tournament;
    }

    public function destroy(Tournament $tournament)
    {
        $tournament->delete();

        return response()->noContent();
    }

    public function register(Request $request, Tournament $tournament)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'guild_id' => ['nullable', 'exists:guilds,id'],
        ]);

        return TournamentTeam::create([
            ...$data,
            'tournament_id' => $tournament->id,
            'captain_user_id' => $request->user()->id,
            'status' => 'pending_validation',
        ]);
    }

    public function submitResult(Request $request, Tournament $tournament, TournamentScoringService $scoring)
    {
        $data = $request->validate([
            'team_id' => ['required', 'exists:tournament_teams,id'],
            'round' => ['required', 'integer', 'min:1'],
            'placement' => ['required', 'integer', 'min:1'],
            'kills' => ['required', 'integer', 'min:0'],
            'mvp_user_id' => ['nullable', 'exists:users,id'],
        ]);

        return DB::transaction(function () use ($data, $tournament, $scoring) {
            $points = $scoring->points($data['placement'], $data['kills']);
            $result = TournamentRoundResult::updateOrCreate(
                ['tournament_id' => $tournament->id, 'tournament_team_id' => $data['team_id'], 'round' => $data['round']],
                ['placement' => $data['placement'], 'kills' => $data['kills'], 'points' => $points, 'mvp_user_id' => $data['mvp_user_id'] ?? null]
            );

            $team = TournamentTeam::findOrFail($data['team_id']);
            $team->update([
                'points' => $team->rounds()->sum('points'),
                'kills' => $team->rounds()->sum('kills'),
            ]);

            return $result;
        });
    }
}
