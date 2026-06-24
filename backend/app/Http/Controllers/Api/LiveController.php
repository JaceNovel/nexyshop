<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LiveStream;
use App\Models\Stream;
use App\Models\TournamentTeam;
use Illuminate\Http\Request;

class LiveController extends Controller
{
    public function current()
    {
        $stream = Stream::query()
            ->with(['tournament.teams' => fn ($query) => $query->orderByDesc('points')->orderByDesc('kills')])
            ->whereIn('status', ['live', 'scheduled'])
            ->orderByRaw("case when status = 'live' then 0 else 1 end")
            ->latest('started_at')
            ->latest('scheduled_at')
            ->first();

        if ($stream) {
            return response()->json(['data' => $this->streamPayload($stream)]);
        }

        $legacy = LiveStream::where('status', 'live')->latest('starts_at')->first()
            ?? LiveStream::latest('starts_at')->first();

        return response()->json(['data' => $legacy ? [
            'id' => null,
            'title' => $legacy->title,
            'status' => $legacy->status,
            'viewer_count' => (int) $legacy->viewers,
            'youtube_video_id' => $legacy->youtube_video_id,
            'watch_url' => $legacy->youtube_video_id ? 'https://www.youtube.com/watch?v='.$legacy->youtube_video_id : null,
            'embed_url' => $legacy->youtube_video_id ? 'https://www.youtube.com/embed/'.$legacy->youtube_video_id : null,
            'round' => ['current' => 1, 'total' => 1, 'next_round_seconds' => 0],
            'tournament' => null,
            'teams' => [],
            'ranking' => [],
            'stats' => ['alive_teams' => 0, 'dead_teams' => 0, 'total_teams' => 0, 'total_kills' => 0],
        ] : null]);
    }

    public function adminIndex()
    {
        $streams = Stream::query()
            ->with(['tournament.teams' => fn ($query) => $query->orderByDesc('points')->orderByDesc('kills')])
            ->latest('created_at')
            ->limit(30)
            ->get()
            ->map(fn (Stream $stream) => $this->streamPayload($stream));

        return response()->json(['data' => $streams]);
    }

    public function adminStore(Request $request)
    {
        $data = $request->validate([
            'tournament_id' => ['nullable', 'exists:tournaments,id'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'in:scheduled,live,paused,ended,cancelled'],
            'scheduled_at' => ['nullable', 'date'],
            'watch_url' => ['nullable', 'url', 'max:500'],
            'youtube_video_id' => ['nullable', 'string', 'max:120'],
            'round_current' => ['nullable', 'integer', 'min:1', 'max:99'],
            'round_total' => ['nullable', 'integer', 'min:1', 'max:99'],
            'next_round_seconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'game' => ['nullable', 'string', 'max:80'],
            'map' => ['nullable', 'string', 'max:80'],
            'prize_text' => ['nullable', 'string', 'max:120'],
        ]);

        $metadata = [
            'game' => $data['game'] ?? 'Free Fire',
            'map' => $data['map'] ?? null,
            'prize_text' => $data['prize_text'] ?? null,
            'round_current' => $data['round_current'] ?? 1,
            'round_total' => $data['round_total'] ?? 7,
            'next_round_seconds' => $data['next_round_seconds'] ?? 0,
        ];

        $stream = Stream::create([
            'tournament_id' => $data['tournament_id'] ?? null,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'scheduled',
            'scheduled_at' => $data['scheduled_at'] ?? now(),
            'started_at' => ($data['status'] ?? null) === 'live' ? now() : null,
            'youtube_video_id' => $data['youtube_video_id'] ?? null,
            'youtube_live_id' => $data['youtube_video_id'] ?? null,
            'watch_url' => $data['watch_url'] ?? (($data['youtube_video_id'] ?? null) ? 'https://www.youtube.com/watch?v='.$data['youtube_video_id'] : null),
            'embed_url' => ($data['youtube_video_id'] ?? null) ? 'https://www.youtube.com/embed/'.$data['youtube_video_id'] : null,
            'metadata' => $metadata,
        ]);

        $this->seedTeams($stream);

        return response()->json(['data' => $this->streamPayload($stream->fresh(['tournament.teams']))], 201);
    }

    public function adminUpdate(Request $request, Stream $stream)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'in:scheduled,live,paused,ended,cancelled'],
            'viewer_count' => ['sometimes', 'integer', 'min:0'],
            'round_current' => ['sometimes', 'integer', 'min:1', 'max:99'],
            'round_total' => ['sometimes', 'integer', 'min:1', 'max:99'],
            'next_round_seconds' => ['sometimes', 'integer', 'min:0', 'max:86400'],
            'game' => ['sometimes', 'nullable', 'string', 'max:80'],
            'map' => ['sometimes', 'nullable', 'string', 'max:80'],
            'prize_text' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $metadata = $stream->metadata ?? [];
        foreach (['round_current', 'round_total', 'next_round_seconds', 'game', 'map', 'prize_text'] as $key) {
            if (array_key_exists($key, $data)) {
                $metadata[$key] = $data[$key];
            }
        }

        $updates = collect($data)->only(['title', 'description', 'status', 'viewer_count'])->all();
        if (($updates['status'] ?? null) === 'live' && ! $stream->started_at) {
            $updates['started_at'] = now();
        }
        if (in_array($updates['status'] ?? null, ['ended', 'cancelled'], true) && ! $stream->ended_at) {
            $updates['ended_at'] = now();
        }
        $updates['metadata'] = $metadata;

        $stream->update($updates);

        return response()->json(['data' => $this->streamPayload($stream->fresh(['tournament.teams']))]);
    }

    public function adminSyncTeams(Stream $stream)
    {
        $this->seedTeams($stream, true);

        return response()->json(['data' => $this->streamPayload($stream->fresh(['tournament.teams']))]);
    }

    public function adminUpdateTeam(Request $request, Stream $stream, TournamentTeam $team)
    {
        abort_unless((int) $team->tournament_id === (int) $stream->tournament_id, 404);

        $data = $request->validate([
            'alive' => ['sometimes', 'boolean'],
            'players_alive' => ['sometimes', 'integer', 'min:0', 'max:12'],
            'hp' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'kills' => ['sometimes', 'integer', 'min:0', 'max:999'],
            'points' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'placement' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:999'],
        ]);

        $metadata = $team->metadata ?? [];
        $live = $metadata['live'] ?? [];

        foreach (['alive', 'players_alive', 'hp', 'placement'] as $key) {
            if (array_key_exists($key, $data)) {
                $live[$key] = $data[$key];
            }
        }

        if (array_key_exists('alive', $data)) {
            $live['eliminated_at'] = $data['alive'] ? null : now()->toIso8601String();
        }

        $metadata['live'] = $live;
        $updates = ['metadata' => $metadata];
        if (array_key_exists('kills', $data)) {
            $updates['kills'] = $data['kills'];
        }
        if (array_key_exists('points', $data)) {
            $updates['points'] = $data['points'];
        }

        $team->update($updates);

        return response()->json(['data' => $this->streamPayload($stream->fresh(['tournament.teams']))]);
    }

    private function seedTeams(Stream $stream, bool $reset = false): void
    {
        if (! $stream->tournament_id) {
            return;
        }

        $teams = TournamentTeam::query()->where('tournament_id', $stream->tournament_id)->get();

        foreach ($teams as $team) {
            $metadata = $team->metadata ?? [];
            if (! $reset && isset($metadata['live'])) {
                continue;
            }

            $members = (array) data_get($metadata, 'members', []);
            $metadata['live'] = [
                'alive' => true,
                'players_alive' => count($members) > 0 ? count($members) : 4,
                'hp' => 100,
                'placement' => null,
                'eliminated_at' => null,
            ];

            $team->forceFill(['metadata' => $metadata])->save();
        }
    }

    private function streamPayload(Stream $stream): array
    {
        $stream->loadMissing(['tournament.teams']);
        $metadata = $stream->metadata ?? [];
        $teams = collect($stream->tournament?->teams ?? [])->map(function (TournamentTeam $team) {
            $live = $team->metadata['live'] ?? [];
            $alive = (bool) ($live['alive'] ?? true);
            $playersAlive = (int) ($live['players_alive'] ?? ($alive ? 4 : 0));

            return [
                'id' => $team->id,
                'name' => $team->name,
                'status' => $team->status,
                'alive' => $alive,
                'players_alive' => $alive ? max(0, $playersAlive) : 0,
                'hp' => (int) ($live['hp'] ?? ($alive ? 100 : 0)),
                'kills' => (int) $team->kills,
                'points' => (int) $team->points,
                'placement' => $live['placement'] ?? null,
                'captain' => data_get($team->metadata, 'captain_name') ?: data_get($team->metadata, 'members.0.nickname'),
                'logo' => data_get($team->metadata, 'logo'),
            ];
        })->sortBy([
            ['alive', 'desc'],
            ['points', 'desc'],
            ['kills', 'desc'],
            ['players_alive', 'desc'],
            ['name', 'asc'],
        ])->values();

        $ranking = $teams->sortBy([
            ['points', 'desc'],
            ['kills', 'desc'],
            ['alive', 'desc'],
            ['players_alive', 'desc'],
            ['name', 'asc'],
        ])->values()->map(fn (array $team, int $index) => [
            'rank' => $index + 1,
            'team_id' => $team['id'],
            'team' => $team['name'],
            'points' => $team['points'],
            'kills' => $team['kills'],
            'alive' => $team['alive'],
            'direction' => 'same',
        ]);

        return [
            'id' => $stream->id,
            'title' => $stream->title,
            'description' => $stream->description,
            'status' => $stream->status,
            'viewer_count' => (int) $stream->viewer_count,
            'youtube_video_id' => $stream->youtube_video_id,
            'watch_url' => $stream->watch_url,
            'embed_url' => $stream->embed_url,
            'thumbnail_url' => $stream->thumbnail_url,
            'scheduled_at' => $stream->scheduled_at,
            'started_at' => $stream->started_at,
            'round' => [
                'current' => (int) ($metadata['round_current'] ?? 1),
                'total' => (int) ($metadata['round_total'] ?? 7),
                'next_round_seconds' => (int) ($metadata['next_round_seconds'] ?? 0),
            ],
            'game' => $metadata['game'] ?? data_get($stream->tournament?->rules, 'game', 'Free Fire'),
            'map' => $metadata['map'] ?? null,
            'prize_text' => $metadata['prize_text'] ?? null,
            'tournament' => $stream->tournament ? [
                'id' => $stream->tournament->id,
                'title' => $stream->tournament->title,
                'mode' => $stream->tournament->mode,
                'status' => $stream->tournament->status,
                'prize_pool' => (float) $stream->tournament->prize_pool,
                'rules' => $stream->tournament->rules,
            ] : null,
            'teams' => $teams,
            'ranking' => $ranking,
            'stats' => [
                'alive_teams' => $teams->where('alive', true)->count(),
                'dead_teams' => $teams->where('alive', false)->count(),
                'total_teams' => $teams->count(),
                'alive_players' => $teams->sum('players_alive'),
                'total_kills' => $teams->sum('kills'),
            ],
        ];
    }
}
