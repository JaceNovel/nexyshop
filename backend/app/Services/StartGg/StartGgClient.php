<?php

namespace App\Services\StartGg;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class StartGgClient
{
    public function configured(): bool
    {
        return filled($this->token());
    }

    /**
     * @throws RequestException
     */
    public function tournaments(array $filters = []): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));
        $perPage = min(24, max(1, (int) ($filters['per_page'] ?? 12)));
        $videogameIds = $this->ids($filters['videogame_ids'] ?? $filters['videogame_id'] ?? null);

        $variables = [
            'page' => $page,
            'perPage' => $perPage,
            'countryCode' => $this->blankToNull($filters['country'] ?? null),
            'videogameIds' => $videogameIds ?: null,
            'upcoming' => array_key_exists('upcoming', $filters) ? filter_var($filters['upcoming'], FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) : true,
        ];

        $query = <<<'GRAPHQL'
query StartGgTournaments($page: Int!, $perPage: Int!, $countryCode: String, $videogameIds: [ID], $upcoming: Boolean) {
  tournaments(query: {
    page: $page,
    perPage: $perPage,
    sortBy: "startAt asc",
    filter: { countryCode: $countryCode, videogameIds: $videogameIds, upcoming: $upcoming }
  }) {
    pageInfo { total totalPages }
    nodes {
      id
      name
      slug
      startAt
      endAt
      city
      addrState
      countryCode
      events {
        id
        name
        slug
        videogame { id name displayName }
      }
    }
  }
}
GRAPHQL;

        $payload = $this->graphql($query, $variables, 'startgg:tournaments:'.md5(json_encode($variables)), $this->cacheMinutes());
        $tournaments = data_get($payload, 'tournaments.nodes', []);

        return [
            'configured' => true,
            'data' => collect($tournaments)->map(fn (array $item) => $this->tournamentSummary($item))->values()->all(),
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => (int) data_get($payload, 'tournaments.pageInfo.total', 0),
                'total_pages' => (int) data_get($payload, 'tournaments.pageInfo.totalPages', 1),
            ],
        ];
    }

    /**
     * @throws RequestException
     */
    public function tournament(string $slug): array
    {
        $query = <<<'GRAPHQL'
query StartGgTournament($slug: String!, $page: Int!, $perPage: Int!) {
  tournament(slug: $slug) {
    id
    name
    slug
    startAt
    endAt
    timezone
    city
    addrState
    countryCode
    venueName
    events {
      id
      name
      slug
      videogame { id name displayName }
      entrants(query: { page: $page, perPage: $perPage }) {
        pageInfo { total }
        nodes { id name participants { id gamerTag prefix } }
      }
      standings(query: { page: $page, perPage: $perPage }) {
        nodes { id placement entrant { id name } }
      }
      sets(page: $page, perPage: $perPage, sortType: STANDARD) {
        pageInfo { total }
        nodes {
          id
          state
          displayScore
          station { id number }
          slots { id entrant { id name } }
        }
      }
    }
    participants(query: { page: $page, perPage: $perPage }) {
      pageInfo { total }
      nodes { id gamerTag prefix }
    }
    streamQueue {
      stream { streamSource streamName }
      sets { id state displayScore slots { entrant { id name } } }
    }
  }
}
GRAPHQL;

        $variables = ['slug' => $slug, 'page' => 1, 'perPage' => 12];
        $payload = $this->graphql($query, $variables, 'startgg:tournament:'.md5($slug), $this->cacheMinutes());
        $tournament = data_get($payload, 'tournament');

        if (! is_array($tournament)) {
            return ['configured' => true, 'data' => null];
        }

        return ['configured' => true, 'data' => $this->tournamentDetail($tournament)];
    }

    /**
     * @throws RequestException
     */
    public function event(int|string $eventId): array
    {
        $query = <<<'GRAPHQL'
query StartGgEvent($eventId: ID!, $page: Int!, $perPage: Int!) {
  event(id: $eventId) {
    id
    name
    slug
    videogame { id name displayName }
    tournament { id name slug startAt countryCode city }
    entrants(query: { page: $page, perPage: $perPage }) {
      pageInfo { total totalPages }
      nodes { id name participants { id gamerTag prefix } seeds { seedNum } }
    }
    standings(query: { page: $page, perPage: $perPage }) {
      nodes { id placement entrant { id name } }
    }
    phaseGroups { id displayIdentifier }
    sets(page: $page, perPage: $perPage, sortType: STANDARD) {
      pageInfo { total totalPages }
      nodes {
        id
        state
        displayScore
        station { id number }
        slots { id entrant { id name } standing { placement stats { score { value label } } } }
      }
    }
  }
}
GRAPHQL;

        $variables = ['eventId' => (string) $eventId, 'page' => 1, 'perPage' => 24];
        $payload = $this->graphql($query, $variables, 'startgg:event:'.$eventId, $this->cacheMinutes());
        $event = data_get($payload, 'event');

        return ['configured' => true, 'data' => is_array($event) ? $this->eventDetail($event) : null];
    }

    /**
     * @throws RequestException
     */
    public function videogames(?string $name = null, int $perPage = 12): array
    {
        $query = <<<'GRAPHQL'
query StartGgVideogames($name: String, $perPage: Int!) {
  videogames(query: { filter: { name: $name }, perPage: $perPage }) {
    nodes { id name displayName }
  }
}
GRAPHQL;

        $variables = ['name' => $this->blankToNull($name), 'perPage' => min(25, max(1, $perPage))];
        $payload = $this->graphql($query, $variables, 'startgg:videogames:'.md5(json_encode($variables)), now()->addHours(12));

        return [
            'configured' => true,
            'data' => collect(data_get($payload, 'videogames.nodes', []))->map(fn (array $item) => [
                'id' => (string) ($item['id'] ?? ''),
                'name' => (string) ($item['displayName'] ?? $item['name'] ?? ''),
                'raw_name' => (string) ($item['name'] ?? ''),
            ])->filter(fn (array $item) => $item['id'] !== '')->values()->all(),
        ];
    }

    /**
     * @throws RequestException
     */
    public function league(string $slug): array
    {
        $query = <<<'GRAPHQL'
query StartGgLeague($slug: String!) {
  league(slug: $slug) {
    id
    name
    slug
    events(query: { page: 1, perPage: 16 }) {
      pageInfo { total }
      nodes { id name startAt tournament { id name slug } }
    }
    standings(query: { page: 1, perPage: 16 }) {
      nodes { id placement entrant { id name } }
    }
  }
}
GRAPHQL;

        $payload = $this->graphql($query, ['slug' => $slug], 'startgg:league:'.md5($slug), $this->cacheMinutes());
        $league = data_get($payload, 'league');

        return ['configured' => true, 'data' => is_array($league) ? $league : null];
    }

    /**
     * @throws RequestException
     */
    private function graphql(string $query, array $variables, string $cacheKey, mixed $ttl): array
    {
        if (! $this->configured()) {
            throw new RuntimeException('Start.gg API token is not configured.');
        }

        return Cache::remember($cacheKey, $ttl, function () use ($query, $variables) {
            $response = Http::timeout((int) config('services.startgg.timeout', 15))
                ->withToken($this->token())
                ->acceptJson()
                ->post((string) config('services.startgg.base_url', 'https://api.start.gg/gql/alpha'), [
                    'query' => $query,
                    'variables' => $variables,
                ])
                ->throw();

            $body = $response->json();

            if (! empty($body['errors'])) {
                throw new RuntimeException((string) data_get($body, 'errors.0.message', 'Start.gg request failed.'));
            }

            return (array) ($body['data'] ?? []);
        });
    }

    private function tournamentSummary(array $item): array
    {
        $events = collect($item['events'] ?? [])->map(fn (array $event) => $this->eventSummary($event))->values()->all();

        return [
            'id' => (string) ($item['id'] ?? ''),
            'name' => (string) ($item['name'] ?? 'Tournoi Start.gg'),
            'slug' => (string) ($item['slug'] ?? ''),
            'url' => $this->startGgUrl((string) ($item['slug'] ?? '')),
            'start_at' => $this->timestamp($item['startAt'] ?? null),
            'end_at' => $this->timestamp($item['endAt'] ?? null),
            'city' => $item['city'] ?? null,
            'state' => $item['addrState'] ?? null,
            'country_code' => $item['countryCode'] ?? null,
            'events' => $events,
            'games' => collect($events)->pluck('videogame.name')->filter()->unique()->values()->all(),
            'source' => 'startgg',
        ];
    }

    private function tournamentDetail(array $item): array
    {
        $summary = $this->tournamentSummary($item);

        return [
            ...$summary,
            'timezone' => $item['timezone'] ?? null,
            'venue_name' => $item['venueName'] ?? null,
            'participants_total' => (int) data_get($item, 'participants.pageInfo.total', 0),
            'participants' => collect(data_get($item, 'participants.nodes', []))->map(fn (array $participant) => [
                'id' => (string) ($participant['id'] ?? ''),
                'gamer_tag' => (string) ($participant['gamerTag'] ?? ''),
                'prefix' => $participant['prefix'] ?? null,
            ])->values()->all(),
            'events' => collect($item['events'] ?? [])->map(fn (array $event) => $this->eventDetail($event))->values()->all(),
            'stream_queue' => collect($item['streamQueue'] ?? [])->map(fn (array $queue) => [
                'stream' => [
                    'source' => data_get($queue, 'stream.streamSource'),
                    'name' => data_get($queue, 'stream.streamName'),
                ],
                'sets' => collect($queue['sets'] ?? [])->map(fn (array $set) => $this->setSummary($set))->values()->all(),
            ])->values()->all(),
        ];
    }

    private function eventDetail(array $event): array
    {
        return [
            ...$this->eventSummary($event),
            'tournament' => isset($event['tournament']) && is_array($event['tournament']) ? $this->tournamentSummary($event['tournament']) : null,
            'entrants_total' => (int) data_get($event, 'entrants.pageInfo.total', 0),
            'entrants' => collect(data_get($event, 'entrants.nodes', []))->map(fn (array $entrant) => [
                'id' => (string) ($entrant['id'] ?? ''),
                'name' => (string) ($entrant['name'] ?? ''),
                'seed' => data_get($entrant, 'seeds.0.seedNum'),
                'participants' => collect($entrant['participants'] ?? [])->map(fn (array $participant) => [
                    'id' => (string) ($participant['id'] ?? ''),
                    'gamer_tag' => (string) ($participant['gamerTag'] ?? ''),
                    'prefix' => $participant['prefix'] ?? null,
                ])->values()->all(),
            ])->values()->all(),
            'standings' => collect(data_get($event, 'standings.nodes', []))->map(fn (array $standing) => [
                'id' => (string) ($standing['id'] ?? ''),
                'placement' => $standing['placement'] ?? null,
                'entrant' => [
                    'id' => (string) data_get($standing, 'entrant.id', ''),
                    'name' => (string) data_get($standing, 'entrant.name', ''),
                ],
            ])->values()->all(),
            'phase_groups' => collect($event['phaseGroups'] ?? [])->map(fn (array $group) => [
                'id' => (string) ($group['id'] ?? ''),
                'display_identifier' => (string) ($group['displayIdentifier'] ?? ''),
            ])->values()->all(),
            'sets_total' => (int) data_get($event, 'sets.pageInfo.total', 0),
            'sets' => collect(data_get($event, 'sets.nodes', []))->map(fn (array $set) => $this->setSummary($set))->values()->all(),
        ];
    }

    private function eventSummary(array $event): array
    {
        return [
            'id' => (string) ($event['id'] ?? ''),
            'name' => (string) ($event['name'] ?? 'Event'),
            'slug' => (string) ($event['slug'] ?? ''),
            'videogame' => [
                'id' => (string) data_get($event, 'videogame.id', ''),
                'name' => (string) (data_get($event, 'videogame.displayName') ?: data_get($event, 'videogame.name', '')),
            ],
        ];
    }

    private function setSummary(array $set): array
    {
        return [
            'id' => (string) ($set['id'] ?? ''),
            'state' => $set['state'] ?? null,
            'display_score' => $set['displayScore'] ?? null,
            'station' => data_get($set, 'station.number'),
            'slots' => collect($set['slots'] ?? [])->map(fn (array $slot) => [
                'id' => (string) ($slot['id'] ?? ''),
                'entrant' => [
                    'id' => (string) data_get($slot, 'entrant.id', ''),
                    'name' => (string) data_get($slot, 'entrant.name', 'TBD'),
                ],
                'placement' => data_get($slot, 'standing.placement'),
                'score' => data_get($slot, 'standing.stats.score.value'),
            ])->values()->all(),
        ];
    }

    private function token(): ?string
    {
        return config('services.startgg.token');
    }

    private function cacheMinutes(): mixed
    {
        return now()->addMinutes((int) config('services.startgg.cache_minutes', 10));
    }

    private function blankToNull(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' || strtolower($value) === 'all' || strtolower($value) === 'tous' ? null : $value;
    }

    private function ids(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map('strval', Arr::flatten($value))));
        }

        return array_values(array_filter(array_map('trim', explode(',', (string) $value))));
    }

    private function timestamp(mixed $value): ?string
    {
        if (! is_numeric($value)) {
            return null;
        }

        return now()->setTimestamp((int) $value)->toIso8601String();
    }

    private function startGgUrl(string $slug): string
    {
        return $slug ? 'https://www.start.gg/'.ltrim($slug, '/') : 'https://www.start.gg';
    }
}