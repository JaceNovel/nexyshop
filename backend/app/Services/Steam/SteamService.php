<?php

namespace App\Services\Steam;

use App\Models\User;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class SteamService
{
    public function loginUrl(string $returnUrl): string
    {
        $realm = parse_url($returnUrl, PHP_URL_SCHEME).'://'.parse_url($returnUrl, PHP_URL_HOST);

        return 'https://steamcommunity.com/openid/login?'.http_build_query([
            'openid.ns' => 'http://specs.openid.net/auth/2.0',
            'openid.mode' => 'checkid_setup',
            'openid.return_to' => $returnUrl,
            'openid.realm' => $realm,
            'openid.identity' => 'http://specs.openid.net/auth/2.0/identifier_select',
            'openid.claimed_id' => 'http://specs.openid.net/auth/2.0/identifier_select',
        ]);
    }

    public function validateOpenId(array $payload): string
    {
        $claimedId = (string) ($payload['openid_claimed_id'] ?? $payload['openid.claimed_id'] ?? '');
        $steamId = Str::after($claimedId, 'https://steamcommunity.com/openid/id/');

        if (! preg_match('/^\d{17}$/', $steamId)) {
            throw new \RuntimeException('SteamID invalide.');
        }

        $checkPayload = [];
        foreach ($payload as $key => $value) {
            $normalizedKey = str_replace('_', '.', $key);
            if (str_starts_with($normalizedKey, 'openid.')) {
                $checkPayload[$normalizedKey] = $value;
            }
        }
        $checkPayload['openid.mode'] = 'check_authentication';

        $response = Http::asForm()->post('https://steamcommunity.com/openid/login', $checkPayload);
        $body = $response->body();

        if (! $response->ok() || ! str_contains($body, 'is_valid:true')) {
            throw new \RuntimeException('Connexion Steam non valide.');
        }

        return $steamId;
    }

    public function linkUser(User $user, string $steamId): User
    {
        $profile = $this->playerSummaries([$steamId])[0] ?? [];

        $user->update([
            'steam_id' => $steamId,
            'steam_persona_name' => $profile['personaname'] ?? null,
            'steam_avatar_url' => $profile['avatarfull'] ?? $profile['avatarmedium'] ?? $profile['avatar'] ?? null,
            'steam_connected_at' => now(),
        ]);

        return $user->fresh();
    }

    public function playerProfile(string $steamId): array
    {
        $profile = $this->playerSummaries([$steamId])[0] ?? null;

        if (! $profile) {
            throw new \RuntimeException('Profil Steam introuvable.');
        }

        return [
            'steam_id' => (string) ($profile['steamid'] ?? $steamId),
            'persona_name' => $profile['personaname'] ?? 'Steam Player',
            'avatar' => $profile['avatarfull'] ?? $profile['avatarmedium'] ?? $profile['avatar'] ?? null,
            'country' => $profile['loccountrycode'] ?? null,
            'profile_url' => $profile['profileurl'] ?? null,
            'visibility_state' => $profile['communityvisibilitystate'] ?? null,
            'profile_visible' => (int) ($profile['communityvisibilitystate'] ?? 0) === 3,
            'online_status' => $this->personaState((int) ($profile['personastate'] ?? 0)),
            'last_logoff' => $profile['lastlogoff'] ?? null,
            'raw' => $profile,
        ];
    }

    public function officialNews(?int $appid = null, int $count = 5): array
    {
        $apps = $appid ? [['appid' => $appid, 'name' => 'Steam', 'category' => 'Steam']] : config('services.steam.news_apps', []);
        $minutes = (int) config('services.steam.news_cache_minutes', 60);

        return Cache::remember('steam:official-news:'.($appid ?: 'home').':'.$count, now()->addMinutes($minutes), function () use ($apps, $count) {
            return collect($apps)
                ->flatMap(fn (array $app) => $this->newsForApp((int) $app['appid'], $app, $count))
                ->sortByDesc('date')
                ->values()
                ->take($count * max(1, count($apps)))
                ->all();
        });
    }

    public function upcomingReleases(int $count = 10): array
    {
        $minutes = (int) config('services.steam.news_cache_minutes', 60);

        return Cache::remember('steam:upcoming-releases:'.$count, now()->addMinutes($minutes), function () use ($count) {
            $items = collect($this->storeUpcomingItems())
                ->filter(fn (array $item) => (int) ($item['type'] ?? 0) === 0)
                ->filter(fn (array $item) => ! $this->isAdultStoreTitle((string) ($item['name'] ?? '')))
                ->take(max(20, $count * 3))
                ->values();

            if ($items->isEmpty()) {
                return [];
            }

            $details = $this->storeAppDetails($items->pluck('id')->map(fn ($id) => (int) $id)->all());

            return $items
                ->map(function (array $item) use ($details) {
                    $appid = (int) ($item['id'] ?? 0);
                    $detail = $details[$appid]['data'] ?? [];
                    $releaseDate = $this->normalizeStoreReleaseDate((string) Arr::get($detail, 'release_date.date', ''));

                    return [
                        'appid' => $appid,
                        'release_timestamp' => $releaseDate ? strtotime($releaseDate) ?: PHP_INT_MAX : PHP_INT_MAX,
                        'gameName' => (string) ($item['name'] ?? Arr::get($detail, 'name', 'Steam Upcoming')),
                        'gameUrl' => 'https://store.steampowered.com/app/'.$appid,
                        'releaseDate' => $releaseDate,
                        'gameImage' => $item['large_capsule_image'] ?? $item['header_image'] ?? Arr::get($detail, 'header_image'),
                        'price' => $this->storePriceLabel($item),
                        'credits' => $this->storeGenresLabel(collect(Arr::get($detail, 'genres', []))),
                    ];
                })
                ->filter(fn (array $game) => ! $this->isAdultStoreTitle((string) ($game['gameName'] ?? '')))
                ->sortBy(fn (array $game) => $game['release_timestamp'] ?? PHP_INT_MAX)
                ->take($count)
                ->map(function (array $game) {
                    unset($game['appid'], $game['release_timestamp']);

                    return $game;
                })
                ->values()
                ->all();
        });
    }

    public function globalAchievements(int $appid): array
    {
        $response = $this->client()->get('https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/', [
            'gameid' => $appid,
            'format' => 'json',
        ]);

        $response->throw();

        return collect($response->json('achievementpercentages.achievements', []))
            ->take(40)
            ->values()
            ->all();
    }

    public function playerAchievements(string $steamId, int $appid): array
    {
        $key = (string) config('services.steam.key');

        if ($key === '') {
            throw new \RuntimeException('STEAM_WEB_API_KEY manquant.');
        }

        $response = $this->client()->get('https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/', [
            'key' => $key,
            'steamid' => $steamId,
            'appid' => $appid,
            'l' => 'french',
            'format' => 'json',
        ]);

        $response->throw();

        return [
            'steam_id' => $steamId,
            'appid' => $appid,
            'game_name' => $response->json('playerstats.gameName'),
            'achievements' => collect($response->json('playerstats.achievements', []))
                ->map(fn (array $achievement) => [
                    'api_name' => $achievement['apiname'] ?? null,
                    'name' => $achievement['name'] ?? $achievement['apiname'] ?? null,
                    'description' => $achievement['description'] ?? null,
                    'achieved' => (bool) ($achievement['achieved'] ?? false),
                    'unlock_time' => ! empty($achievement['unlocktime']) ? date('c', (int) $achievement['unlocktime']) : null,
                ])
                ->values()
                ->all(),
        ];
    }

    public function teamFortressItems(): array
    {
        $key = (string) config('services.steam.key');

        if ($key === '') {
            throw new \RuntimeException('STEAM_WEB_API_KEY manquant.');
        }

        $response = $this->client()->get('https://api.steampowered.com/ITFItems_440/GetSchema/v0001/', [
            'key' => $key,
            'language' => 'fr',
            'format' => 'json',
        ]);

        $response->throw();

        return collect($response->json('result.items', []))
            ->take(80)
            ->map(fn (array $item) => [
                'defindex' => $item['defindex'] ?? null,
                'name' => $item['item_name'] ?? $item['name'] ?? null,
                'type' => $item['item_type_name'] ?? null,
                'quality' => $item['item_quality'] ?? null,
                'image' => $item['image_url'] ?? $item['image_url_large'] ?? null,
                'raw' => $item,
            ])
            ->values()
            ->all();
    }

    public function officialNewsApps(): array
    {
        return config('services.steam.news_apps', []);
    }

    private function storeUpcomingItems(): array
    {
        $response = $this->client()->get('https://store.steampowered.com/api/featuredcategories', [
            'cc' => 'us',
            'l' => 'english',
        ]);

        $response->throw();

        return $response->json('coming_soon.items', []);
    }

    private function storeAppDetails(array $appIds): array
    {
        if ($appIds === []) {
            return [];
        }

        return collect(array_unique($appIds))
            ->mapWithKeys(function (int $appId) {
                $response = $this->client()->get('https://store.steampowered.com/api/appdetails', [
                    'appids' => $appId,
                    'cc' => 'us',
                    'l' => 'english',
                ]);

                $response->throw();

                return [$appId => ($response->json((string) $appId) ?? [])];
            })
            ->all();
    }

    private function playerSummaries(array $steamIds): array
    {
        $key = (string) config('services.steam.key');

        if ($key === '') {
            throw new \RuntimeException('STEAM_WEB_API_KEY manquant.');
        }

        $response = $this->client()->get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/', [
            'key' => $key,
            'steamids' => implode(',', $steamIds),
            'format' => 'json',
        ]);

        $response->throw();

        return $response->json('response.players', []);
    }

    private function newsForApp(int $appid, array $app, int $count): array
    {
        try {
            $response = $this->client()->get('https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/', [
                'appid' => $appid,
                'count' => $count,
                'maxlength' => 420,
                'format' => 'json',
            ]);

            $response->throw();

            return collect($response->json('appnews.newsitems', []))
                ->map(fn (array $item) => [
                    'appid' => $appid,
                    'app_name' => $app['name'] ?? 'Steam',
                    'category' => $app['category'] ?? 'Steam',
                    'title' => html_entity_decode((string) ($item['title'] ?? 'Actualite Steam')),
                    'excerpt' => trim(strip_tags(html_entity_decode((string) ($item['contents'] ?? '')))),
                    'url' => $item['url'] ?? null,
                    'author' => $item['author'] ?? null,
                    'date' => isset($item['date']) ? date('c', (int) $item['date']) : null,
                    'feedlabel' => Arr::get($item, 'feedlabel'),
                ])
                ->all();
        } catch (\Throwable) {
            return [];
        }
    }

    private function client(): PendingRequest
    {
        return Http::timeout(12)->acceptJson();
    }

    private function normalizeStoreReleaseDate(string $value): ?string
    {
        $value = trim($value);

        if ($value === '' || in_array(Str::lower($value), ['coming soon', 'to be announced'], true)) {
            return null;
        }

        $timestamp = strtotime($value);

        if ($timestamp === false) {
            return null;
        }

        return date('Y-m-d', $timestamp);
    }

    private function storePriceLabel(array $item): ?string
    {
        $currency = (string) ($item['currency'] ?? 'USD');
        $finalPrice = $item['final_price'] ?? null;
        $originalPrice = $item['original_price'] ?? null;

        foreach ([$finalPrice, $originalPrice] as $amount) {
            if (is_numeric($amount) && (int) $amount > 0) {
                return number_format(((int) $amount) / 100, 2, '.', '').' '.$currency;
            }
        }

        return null;
    }

    private function storeGenresLabel(Collection $genres): ?string
    {
        $names = $genres
            ->map(fn (array $genre) => trim((string) ($genre['description'] ?? '')))
            ->filter()
            ->take(2)
            ->values();

        return $names->isEmpty() ? null : $names->implode(' / ');
    }

    private function isAdultStoreTitle(string $title): bool
    {
        return preg_match('/hentai|adult|nsfw|futa|milf|ntr|sex|succubus|erotic|nude/i', $title) === 1;
    }

    private function personaState(int $state): string
    {
        return match ($state) {
            1 => 'online',
            2 => 'busy',
            3 => 'away',
            4 => 'snooze',
            5 => 'looking_to_trade',
            6 => 'looking_to_play',
            default => 'offline',
        };
    }
}
