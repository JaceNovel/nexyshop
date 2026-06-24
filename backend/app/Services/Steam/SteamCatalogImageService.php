<?php

namespace App\Services\Steam;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SteamCatalogImageService
{
    public function imageForGame(string $name): ?string
    {
        $query = $this->searchQuery($name);

        if ($query === '') {
            return null;
        }

        return Cache::remember('steam:catalog-image:'.sha1($query), now()->addDays(14), function () use ($query) {
            try {
                $app = $this->bestStoreMatch($query);

                if (! $app) {
                    return null;
                }

                $appid = (int) ($app['id'] ?? 0);
                $details = $appid > 0 ? $this->appDetails($appid) : [];

                return Arr::get($details, 'header_image')
                    ?? Arr::get($details, 'capsule_image')
                    ?? Arr::get($app, 'tiny_image')
                    ?? null;
            } catch (\Throwable) {
                return null;
            }
        });
    }

    private function bestStoreMatch(string $query): ?array
    {
        $response = Http::timeout(12)->get('https://store.steampowered.com/api/storesearch/', [
            'term' => $query,
            'cc' => 'US',
            'l' => 'en',
        ]);

        if (! $response->ok()) {
            return null;
        }

        $items = collect($response->json('items', []))
            ->filter(fn ($item) => is_array($item) && ! empty($item['id']) && ! empty($item['name']))
            ->map(fn (array $item) => [
                ...$item,
                '_score' => $this->matchScore($query, (string) ($item['name'] ?? '')),
            ])
            ->sortByDesc('_score')
            ->values();

        $best = $items->first();

        return $best && (int) ($best['_score'] ?? 0) > 0 ? $best : null;
    }

    private function appDetails(int $appid): array
    {
        $response = Http::timeout(12)->get('https://store.steampowered.com/api/appdetails', [
            'appids' => $appid,
            'cc' => 'US',
            'l' => 'en',
            'filters' => 'basic',
        ]);

        if (! $response->ok()) {
            return [];
        }

        return $response->json((string) $appid.'.data', []) ?: [];
    }

    private function searchQuery(string $name): string
    {
        return Str::of($name)
            ->replaceMatches('/\b(steam|key|global|row|region|account|gift|code|digital|standard|edition)\b/i', ' ')
            ->replaceMatches('/\([^)]*\)/', ' ')
            ->replaceMatches('/\[[^\]]*\]/', ' ')
            ->replaceMatches('/[^A-Za-z0-9:\-&\s]/', ' ')
            ->replaceMatches('/\s+/', ' ')
            ->trim()
            ->toString();
    }

    private function matchScore(string $query, string $candidate): int
    {
        $query = $this->normalize($query);
        $candidate = $this->normalize($candidate);

        if ($query === '' || $candidate === '') {
            return 0;
        }

        if ($query === $candidate) {
            return 1000;
        }

        if (str_contains($candidate, $query) || str_contains($query, $candidate)) {
            return 800 - abs(strlen($candidate) - strlen($query));
        }

        similar_text($query, $candidate, $percent);

        return (int) round($percent);
    }

    private function normalize(string $value): string
    {
        return Str::of($value)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->trim()
            ->toString();
    }
}
