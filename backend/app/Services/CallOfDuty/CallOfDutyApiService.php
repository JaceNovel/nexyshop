<?php

namespace App\Services\CallOfDuty;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class CallOfDutyApiService
{
    public function playerIdentity(string $activisionId): ?array
    {
        $key = (string) config('services.callofdutyapi.key');

        if ($key === '') {
            throw new RuntimeException('Clé API Call of Duty manquante.');
        }

        $normalizedId = $this->normalizeActivisionId($activisionId);
        $cacheKey = 'callofdutyapi:player:'.sha1($normalizedId);
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return ($cached['found'] ?? false) ? ($cached['profile'] ?? null) : null;
        }

        $profile = $this->fetchPlayerIdentity($normalizedId, $key);
        $minutes = $profile
            ? (int) config('services.callofdutyapi.cache_minutes', 1440)
            : (int) config('services.callofdutyapi.miss_cache_minutes', 60);

        Cache::put($cacheKey, [
            'found' => (bool) $profile,
            'profile' => $profile,
            'cached_at' => now()->toISOString(),
        ], now()->addMinutes(max(1, $minutes)));

        return $profile;
    }

    private function fetchPlayerIdentity(string $activisionId, string $key): ?array
    {
        $baseUrl = rtrim((string) config('services.callofdutyapi.base_url', 'https://v1.callofdutyapi.com'), '/');
        $timeout = (int) config('services.callofdutyapi.timeout', 12);

        foreach (['id', 'uno'] as $platform) {
            try {
                $response = Http::timeout($timeout)
                    ->acceptJson()
                    ->withHeaders(['x-app-key' => $key])
                    ->get($baseUrl.'/player/'.$platform.'/'.rawurlencode($activisionId));

                if ($response->status() === 404) {
                    continue;
                }

                if ($response->failed()) {
                    $response->throw();
                }

                $payload = $response->json();

                if (is_array($payload) && filled($payload)) {
                    return [
                        'platform' => $platform,
                        'payload' => $payload,
                    ];
                }
            } catch (RequestException $exception) {
                if ($exception->response && $exception->response->status() === 404) {
                    continue;
                }

                throw $exception;
            }
        }

        return null;
    }

    private function normalizeActivisionId(string $activisionId): string
    {
        return mb_strtolower(trim($activisionId));
    }
}
