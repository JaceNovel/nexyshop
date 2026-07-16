<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StartGgRegistration;
use App\Services\StartGg\StartGgClient;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Throwable;

class StartGgController extends Controller
{
    public function tournaments(Request $request, StartGgClient $startGg)
    {
        return $this->respond(fn () => $startGg->tournaments($request->only([
            'page',
            'per_page',
            'country',
            'videogame_id',
            'videogame_ids',
            'upcoming',
        ])), $startGg);
    }

    public function tournament(Request $request, StartGgClient $startGg)
    {
        $slug = trim((string) $request->query('slug', ''));

        abort_if($slug === '', 422, 'Le slug Start.gg est requis.');

        return $this->respond(fn () => $startGg->tournament($slug), $startGg);
    }

    public function event(string $eventId, StartGgClient $startGg)
    {
        return $this->respond(fn () => $startGg->event($eventId), $startGg);
    }

    public function videogames(Request $request, StartGgClient $startGg)
    {
        return $this->respond(fn () => $startGg->videogames(
            $request->query('name'),
            (int) $request->query('per_page', 12)
        ), $startGg);
    }

    public function league(Request $request, StartGgClient $startGg)
    {
        $slug = trim((string) $request->query('slug', ''));

        abort_if($slug === '', 422, 'Le slug de league Start.gg est requis.');

        return $this->respond(fn () => $startGg->league($slug), $startGg);
    }

    public function register(Request $request, StartGgClient $startGg)
    {
        $data = $request->validate([
            'tournament_slug' => ['required', 'string', 'max:191'],
            'event_id' => ['nullable', 'string', 'max:80'],
            'team_name' => ['required', 'string', 'max:120'],
            'team_tag' => ['nullable', 'string', 'max:20'],
            'captain_name' => ['nullable', 'string', 'max:120'],
            'contact_whatsapp' => ['required', 'string', 'max:60'],
            'discord' => ['nullable', 'string', 'max:160'],
            'country' => ['nullable', 'string', 'max:80'],
            'members' => ['required', 'array', 'min:1', 'max:8'],
            'members.*.role' => ['nullable', 'string', 'max:40'],
            'members.*.name' => ['required', 'string', 'max:120'],
            'members.*.game_id' => ['nullable', 'string', 'max:80'],
            'members.*.whatsapp' => ['nullable', 'string', 'max:60'],
        ]);

        if (! $startGg->configured()) {
            return response()->json([
                'message' => 'Start.gg n est pas encore configure.',
            ], 503);
        }

        try {
            $payload = $startGg->tournament($data['tournament_slug']);
            $tournament = $payload['data'] ?? null;
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['message' => 'Impossible de verifier ce tournoi Start.gg.'], 502);
        }

        abort_if(! is_array($tournament), 404, 'Tournoi Start.gg introuvable.');

        $event = collect($tournament['events'] ?? [])->first(fn (array $item) => (string) ($item['id'] ?? '') === (string) ($data['event_id'] ?? ''));

        if (! empty($data['event_id'])) {
            abort_if(! $event, 422, 'Event Start.gg invalide pour ce tournoi.');
        } else {
            $event = Arr::first($tournament['events'] ?? []);
        }

        $exists = StartGgRegistration::query()
            ->where('user_id', $request->user()->id)
            ->where('tournament_slug', $data['tournament_slug'])
            ->when($event, fn ($query) => $query->where('event_id', (string) ($event['id'] ?? '')))
            ->exists();

        abort_if($exists, 422, 'Tu as deja inscrit une equipe pour cet event.');

        $registration = StartGgRegistration::create([
            'user_id' => $request->user()->id,
            'tournament_id' => $tournament['id'] ?? null,
            'tournament_slug' => $data['tournament_slug'],
            'tournament_name' => $tournament['name'] ?? 'Tournoi Start.gg',
            'event_id' => $event['id'] ?? null,
            'event_name' => $event['name'] ?? null,
            'team_name' => $data['team_name'],
            'team_tag' => $data['team_tag'] ?? null,
            'captain_name' => $data['captain_name'] ?? null,
            'contact_whatsapp' => $data['contact_whatsapp'],
            'discord' => $data['discord'] ?? null,
            'country' => $data['country'] ?? null,
            'status' => 'pending_validation',
            'members' => collect($data['members'])->map(fn (array $member, int $index) => [
                'role' => $member['role'] ?? 'Joueur '.($index + 1),
                'name' => trim((string) $member['name']),
                'game_id' => trim((string) ($member['game_id'] ?? '')) ?: null,
                'whatsapp' => trim((string) ($member['whatsapp'] ?? '')) ?: null,
            ])->values()->all(),
            'metadata' => [
                'source' => 'startgg',
                'registered_from' => 'astral4gamer',
                'tournament_url' => $tournament['url'] ?? null,
                'game' => data_get($event, 'videogame.name') ?: collect($tournament['games'] ?? [])->first(),
                'starts_at' => $tournament['start_at'] ?? null,
            ],
        ]);

        return response()->json([
            'data' => $registration,
            'message' => 'Inscription recue. Ton equipe est en attente de validation.',
        ], 201);
    }

    private function respond(callable $callback, StartGgClient $startGg)
    {
        if (! $startGg->configured()) {
            return response()->json([
                'configured' => false,
                'data' => [],
                'message' => 'Start.gg n est pas encore configure. Ajoute STARTGG_API_TOKEN dans le backend.',
            ]);
        }

        try {
            return response()->json($callback());
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'configured' => true,
                'data' => [],
                'message' => 'Start.gg est indisponible pour le moment.',
            ], 502);
        }
    }
}