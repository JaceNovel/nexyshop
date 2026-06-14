<?php

namespace App\Services;

use App\Models\Tournament;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class GoogleTournamentCalendarService
{
    public function slots(?string $date = null): array
    {
        $timezone = (string) config('services.google.calendar.timezone', 'UTC');
        $start = $date
            ? CarbonImmutable::parse($date, $timezone)->startOfDay()
            : CarbonImmutable::now($timezone)->addDay()->startOfDay();
        $end = $start->addDays(14)->endOfDay();
        $busy = $this->busyWindows($start, $end, $timezone);
        $duration = (int) config('services.google.calendar.slot_minutes', 60);
        $interval = (int) config('services.google.calendar.step_minutes', 60);
        $dayStart = (string) config('services.google.calendar.day_start', '18:00');
        $dayEnd = (string) config('services.google.calendar.day_end', '23:00');
        $slots = [];

        for ($day = $start; $day->lte($end); $day = $day->addDay()) {
            [$startHour, $startMinute] = array_map('intval', explode(':', $dayStart));
            [$endHour, $endMinute] = array_map('intval', explode(':', $dayEnd));
            $cursor = $day->setTime($startHour, $startMinute);
            $lastStart = $day->setTime($endHour, $endMinute)->subMinutes($duration);

            while ($cursor->lte($lastStart)) {
                $slotEnd = $cursor->addMinutes($duration);

                if ($cursor->isFuture() && ! $this->overlapsBusy($cursor, $slotEnd, $busy)) {
                    $slots[] = [
                        'id' => $cursor->format('YmdHi'),
                        'label' => $cursor->locale('fr')->translatedFormat('D d M').' · '.$cursor->format('H:i').' - '.$slotEnd->format('H:i'),
                        'starts_at' => $cursor->toIso8601String(),
                        'ends_at' => $slotEnd->toIso8601String(),
                        'timezone' => $timezone,
                    ];
                }

                $cursor = $cursor->addMinutes($interval);
            }
        }

        return array_slice($slots, 0, 48);
    }

    public function assertAvailable(string $startsAt, string $endsAt): void
    {
        $timezone = (string) config('services.google.calendar.timezone', 'UTC');
        $start = CarbonImmutable::parse($startsAt, $timezone);
        $end = CarbonImmutable::parse($endsAt, $timezone);

        if (! $start->isFuture() || $end->lte($start)) {
            throw new \RuntimeException('Créneau invalide.');
        }

        $duration = (int) config('services.google.calendar.slot_minutes', 60);
        $dayStart = (string) config('services.google.calendar.day_start', '18:00');
        $dayEnd = (string) config('services.google.calendar.day_end', '23:00');

        if ((int) $start->diffInMinutes($end) !== $duration) {
            throw new \RuntimeException('Les créneaux de tournoi doivent durer exactement '.$duration.' minutes.');
        }

        [$startHour, $startMinute] = array_map('intval', explode(':', $dayStart));
        [$endHour, $endMinute] = array_map('intval', explode(':', $dayEnd));
        $allowedStart = $start->setTime($startHour, $startMinute);
        $allowedEnd = $start->setTime($endHour, $endMinute);

        if ($start->lt($allowedStart) || $end->gt($allowedEnd)) {
            throw new \RuntimeException('Les tournois peuvent uniquement être réservés à partir de '.$dayStart.' GMT.');
        }

        if ($this->overlapsBusy($start, $end, $this->busyWindows($start->startOfDay(), $end->endOfDay(), $timezone))) {
            throw new \RuntimeException('Ce créneau est déjà réservé. Choisis un autre horaire.');
        }
    }

    private function busyWindows(CarbonImmutable $start, CarbonImmutable $end, string $timezone): array
    {
        $windows = $this->googleBusyWindows($start, $end, $timezone);

        $localWindows = Tournament::query()
            ->whereBetween('starts_at', [$start, $end])
            ->whereIn('status', ['scheduled', 'open', 'live', 'pending_financing_validation', 'pending_validation'])
            ->get()
            ->map(fn (Tournament $tournament) => [
                'start' => CarbonImmutable::parse($tournament->starts_at, $timezone),
                'end' => CarbonImmutable::parse($tournament->starts_at, $timezone)->addMinutes((int) ($tournament->rules['duration_minutes'] ?? 60)),
            ])
            ->all();

        return [...$windows, ...$localWindows];
    }

    private function googleBusyWindows(CarbonImmutable $start, CarbonImmutable $end, string $timezone): array
    {
        $calendarId = config('services.google.calendar.id');
        $apiKey = config('services.google.calendar.api_key');

        if (! $calendarId) {
            return [];
        }

        return Cache::remember(
            'google-calendar:tournament-busy:'.$start->format('Ymd').':'.$end->format('Ymd'),
            now()->addMinutes(10),
            function () use ($calendarId, $apiKey, $start, $end, $timezone) {
                $query = [
                    'singleEvents' => 'true',
                    'orderBy' => 'startTime',
                    'timeMin' => $start->toIso8601String(),
                    'timeMax' => $end->toIso8601String(),
                ];
                $token = $this->serviceAccountAccessToken();
                $request = Http::acceptJson();

                if ($token) {
                    $request = $request->withToken($token);
                } elseif ($apiKey) {
                    $query['key'] = $apiKey;
                } else {
                    return [];
                }

                $response = $request->get('https://www.googleapis.com/calendar/v3/calendars/'.rawurlencode($calendarId).'/events', $query);

                if (! $response->successful()) {
                    return [];
                }

                return collect($response->json('items', []))
                    ->map(function (array $event) use ($timezone) {
                        $eventStart = $event['start']['dateTime'] ?? $event['start']['date'] ?? null;
                        $eventEnd = $event['end']['dateTime'] ?? $event['end']['date'] ?? null;

                        if (! $eventStart || ! $eventEnd) {
                            return null;
                        }

                        return [
                            'start' => CarbonImmutable::parse($eventStart, $timezone),
                            'end' => CarbonImmutable::parse($eventEnd, $timezone),
                        ];
                    })
                    ->filter()
                    ->values()
                    ->all();
            }
        );
    }

    private function serviceAccountAccessToken(): ?string
    {
        $path = (string) config('services.google.calendar.service_account_json');

        if ($path === '') {
            return null;
        }

        $resolvedPath = str_starts_with($path, '/')
            ? $path
            : storage_path($path);

        if (! is_file($resolvedPath)) {
            return null;
        }

        return Cache::remember('google-calendar:service-account-token:'.md5($resolvedPath), now()->addMinutes(50), function () use ($resolvedPath) {
            $credentials = json_decode((string) file_get_contents($resolvedPath), true);
            $clientEmail = Arr::get($credentials, 'client_email');
            $privateKey = Arr::get($credentials, 'private_key');
            $tokenUri = Arr::get($credentials, 'token_uri', 'https://oauth2.googleapis.com/token');

            if (! $clientEmail || ! $privateKey) {
                return null;
            }

            $now = time();
            $header = $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
            $claim = $this->base64UrlEncode(json_encode([
                'iss' => $clientEmail,
                'scope' => 'https://www.googleapis.com/auth/calendar.events.readonly',
                'aud' => $tokenUri,
                'iat' => $now,
                'exp' => $now + 3600,
            ], JSON_THROW_ON_ERROR));
            $unsignedJwt = $header.'.'.$claim;

            if (! openssl_sign($unsignedJwt, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
                return null;
            }

            $response = Http::asForm()->post($tokenUri, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $unsignedJwt.'.'.$this->base64UrlEncode($signature),
            ]);

            if (! $response->successful()) {
                return null;
            }

            return $response->json('access_token');
        });
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function overlapsBusy(CarbonImmutable $start, CarbonImmutable $end, array $busy): bool
    {
        foreach ($busy as $window) {
            if ($start->lt($window['end']) && $end->gt($window['start'])) {
                return true;
            }
        }

        return false;
    }
}
