<?php

namespace App\Services\Games;

use App\Models\ApiLog;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class GenshinImpactService
{
    private const TYPES = ['characters', 'weapons', 'artifacts'];
    private const TTL_SECONDS = 3600;

    private string $endpoint;
    private ?string $userUid;
    private ?string $apiKey;

    public function __construct()
    {
        $this->endpoint = (string) config('services.hlgaming.genshin.endpoint');
        $this->userUid = config('services.hlgaming.useruid');
        $this->apiKey = config('services.hlgaming.api_key');
    }

    public function overview(): array
    {
        $payloads = [];

        foreach (self::TYPES as $type) {
            $payloads[$type] = $this->catalog($type, limit: 100);
        }

        $characters = $payloads['characters']['data'] ?? [];
        $weapons = $payloads['weapons']['data'] ?? [];
        $artifacts = $payloads['artifacts']['data'] ?? [];

        return [
            'data' => [
                'characters' => $characters,
                'weapons' => $weapons,
                'artifacts' => $artifacts,
                'guides' => $this->guides($characters),
                'builds' => $this->builds($characters, $weapons, $artifacts),
                'events' => $this->events(),
            ],
            'stats' => [
                'characters' => count($characters),
                'weapons' => count($weapons),
                'artifacts' => count($artifacts),
                'guides' => 67,
                'builds' => min(54, max(6, count($characters))),
            ],
            'usage' => collect($payloads)->pluck('usage')->filter()->values()->all(),
        ];
    }

    public function catalog(string $type, ?string $q = null, ?string $field = null, int $page = 1, int $limit = 100): array
    {
        $type = strtolower(trim($type));

        if (! in_array($type, self::TYPES, true)) {
            throw new RuntimeException('Catégorie Genshin non supportée.');
        }

        $page = max(1, $page);
        $limit = min(100, max(1, $limit));
        $q = $q ? mb_substr(trim($q), 0, 64) : null;
        $field = $field ? mb_substr(trim($field), 0, 64) : null;
        $cacheKey = 'genshin:catalog:'.md5(json_encode(compact('type', 'q', 'field', 'page', 'limit')));

        return Cache::remember($cacheKey, now()->addSeconds(self::TTL_SECONDS), function () use ($type, $q, $field, $page, $limit) {
            if (! $this->configured()) {
                return $this->demoCatalog($type, $q, $field, $page, $limit);
            }

            $query = [
                'sectionName' => 'genshin',
                'type' => $type,
                'page' => $page,
                'limit' => $limit,
            ];

            if ($q) {
                $query['q'] = $q;
            }

            if ($field) {
                $query['field'] = $field;
            }

            $payload = $this->get($query);
            $data = $this->extractData($payload);

            return [
                'data' => array_map(fn (array $item) => $this->normalizeItem($type, $item), $data),
                'meta' => $this->extractMeta($payload),
                'usage' => $payload['usage'] ?? null,
            ];
        });
    }

    private function get(array $query): array
    {
        $startedAt = microtime(true);
        $query = array_merge($query, [
            'useruid' => $this->userUid,
            'api' => $this->apiKey,
        ]);

        $response = $this->client()->get($this->endpoint, $query);
        $payload = $response->json() ?? [];

        try {
            ApiLog::create([
                'service' => 'genshin_catalog',
                'direction' => 'outbound',
                'endpoint' => $this->endpoint,
                'status_code' => $response->status(),
                'payload' => collect($query)->except('api')->all(),
                'response' => $payload,
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            ]);
        } catch (Throwable) {
            // Logging must never block catalog browsing.
        }

        if ($response->status() === 429) {
            throw new RuntimeException('Quota Genshin dépassé. Réessaie plus tard.');
        }

        if (! $response->successful()) {
            throw new RuntimeException($payload['message'] ?? $payload['error'] ?? 'Base Genshin indisponible.');
        }

        if (isset($payload['error'])) {
            throw new RuntimeException((string) $payload['error']);
        }

        return $payload;
    }

    private function client(): PendingRequest
    {
        return Http::timeout((int) config('services.hlgaming.timeout', 12))
            ->retry(2, 300)
            ->acceptJson();
    }

    private function configured(): bool
    {
        return filled($this->userUid) && filled($this->apiKey);
    }

    private function extractData(array $payload): array
    {
        $candidates = [
            $payload['data']['data'] ?? null,
            $payload['data']['items'] ?? null,
            $payload['result']['data'] ?? null,
            $payload['result']['items'] ?? null,
            $payload['items'] ?? null,
            $payload['data'] ?? null,
            $payload['result'] ?? null,
            $payload,
        ];

        foreach ($candidates as $candidate) {
            if (! is_array($candidate)) {
                continue;
            }

            $items = $this->catalogItems($candidate);

            if ($items !== []) {
                return $items;
            }
        }

        return [];
    }

    private function extractMeta(array $payload): ?array
    {
        $meta = $payload['meta'] ?? $payload['data']['meta'] ?? null;

        if (is_array($meta)) {
            return $meta;
        }

        $data = $payload['data'] ?? null;

        if (is_array($data) && isset($data['total'])) {
            return collect($data)->only(['total', 'page', 'limit', 'totalPages'])->all();
        }

        return null;
    }

    private function catalogItems(array $candidate): array
    {
        $directItems = array_values(array_filter(
            $candidate,
            fn ($value) => is_array($value) && $this->looksLikeCatalogItem($value)
        ));

        if ($directItems !== []) {
            return $directItems;
        }

        foreach ($candidate as $value) {
            if (! is_array($value)) {
                continue;
            }

            $nestedItems = array_values(array_filter(
                $value,
                fn ($nestedValue) => is_array($nestedValue) && $this->looksLikeCatalogItem($nestedValue)
            ));

            if ($nestedItems !== []) {
                return $nestedItems;
            }
        }

        return [];
    }

    private function looksLikeCatalogItem(array $item): bool
    {
        return isset($item['name']) || isset($item['title']) || isset($item['slug']) || isset($item['id']);
    }

    private function normalizeItem(string $type, array $item): array
    {
        $name = (string) ($item['name'] ?? $item['title'] ?? 'Inconnu');
        $slug = (string) ($item['slug'] ?? str($name)->slug());
        $bonus = $item['bonus'] ?? $item['set_bonus'] ?? $item['2_set_bonus'] ?? null;
        $stat = $item['stat'] ?? (isset($item['atk']) ? 'ATQ '.$item['atk'] : null);

        return [
            ...$item,
            'name' => $name,
            'slug' => $slug,
            'kind' => $type,
            'rarity' => isset($item['rarity']) ? (int) $item['rarity'] : null,
            'bonus' => $bonus,
            'stat' => $stat,
            'image_url' => $item['image_url'] ?? $item['image'] ?? $item['icon'] ?? $this->assetUrl($type, $slug, $name),
        ];
    }

    private function assetUrl(string $type, string $slug, string $name): string
    {
        $slug = $this->assetSlug($type, $slug, $name);
        $enka = $this->enkaAsset($type, $slug);

        if ($enka) {
            return $enka;
        }

        if ($type === 'characters') {
            return "https://api.genshin.dev/characters/{$slug}/icon-big";
        }

        $folder = match ($type) {
            'weapons' => 'weapons',
            'artifacts' => 'artifacts',
            default => 'characters',
        };

        return "https://api.genshin.dev/{$folder}/{$slug}/icon";
    }

    private function assetSlug(string $type, string $slug, string $name): string
    {
        $normalized = (string) str($slug ?: $name)->lower()->ascii()->slug();

        $known = [
            'raiden' => 'raiden-shogun',
            'bâton-de-homa' => 'staff-of-homa',
            'baton-de-homa' => 'staff-of-homa',
            'lumiere-du-faucheur' => 'engulfing-lightning',
            'lumière-du-faucheur' => 'engulfing-lightning',
            'mille-reves-flottants' => 'a-thousand-floating-dreams',
            'mille-rêves-flottants' => 'a-thousand-floating-dreams',
            'arc-aqua-simulacra' => 'aqua-simulacra',
            'sorciere-des-flammes-ardentes' => 'crimson-witch-of-flames',
            'sorcière-des-flammes-ardentes' => 'crimson-witch-of-flames',
            'embleme-du-destin-brise' => 'emblem-of-severed-fate',
            'emblème-du-destin-brisé' => 'emblem-of-severed-fate',
            'souvenir-de-foret' => 'deepwood-memories',
            'souvenir-de-forêt' => 'deepwood-memories',
            'ancien-rituel-royal' => 'noblesse-oblige',
        ];

        if ($type === 'characters') {
            $known['kaedehara-kazuha'] = 'kaedehara-kazuha';
        }

        return $known[$normalized] ?? $normalized;
    }

    private function enkaAsset(string $type, string $slug): ?string
    {
        $files = [
            'characters' => [
                'hu-tao' => 'UI_AvatarIcon_Hutao.png',
                'raiden-shogun' => 'UI_AvatarIcon_Shougun.png',
                'nahida' => 'UI_AvatarIcon_Nahida.png',
                'zhongli' => 'UI_AvatarIcon_Zhongli.png',
                'yelan' => 'UI_AvatarIcon_Yelan.png',
                'kaedehara-kazuha' => 'UI_AvatarIcon_Kazuha.png',
                'diluc' => 'UI_AvatarIcon_Diluc.png',
                'jean' => 'UI_AvatarIcon_Qin.png',
                'keqing' => 'UI_AvatarIcon_Keqing.png',
                'klee' => 'UI_AvatarIcon_Klee.png',
                'mona' => 'UI_AvatarIcon_Mona.png',
                'qiqi' => 'UI_AvatarIcon_Qiqi.png',
            ],
            'weapons' => [
                'staff-of-homa' => 'UI_EquipIcon_Pole_Homa.png',
                'engulfing-lightning' => 'UI_EquipIcon_Pole_Narukami.png',
                'a-thousand-floating-dreams' => 'UI_EquipIcon_Catalyst_Ayus.png',
                'aqua-simulacra' => 'UI_EquipIcon_Bow_Kirin.png',
            ],
            'artifacts' => [
                'crimson-witch-of-flames' => 'UI_RelicIcon_15006_4.png',
                'emblem-of-severed-fate' => 'UI_RelicIcon_15020_4.png',
                'deepwood-memories' => 'UI_RelicIcon_15025_4.png',
                'noblesse-oblige' => 'UI_RelicIcon_15007_4.png',
            ],
        ];

        $file = $files[$type][$slug] ?? null;

        return $file ? "https://enka.network/ui/{$file}" : null;
    }

    private function demoCatalog(string $type, ?string $q, ?string $field, int $page, int $limit): array
    {
        $data = match ($type) {
            'weapons' => $this->demoWeapons(),
            'artifacts' => $this->demoArtifacts(),
            default => $this->demoCharacters(),
        };

        if ($q) {
            $needle = mb_strtolower($q);
            $data = array_values(array_filter($data, function (array $item) use ($needle, $field) {
                $values = $field && array_key_exists($field, $item) ? [$item[$field]] : array_values($item);
                return collect($values)->flatten()->contains(fn ($value) => str_contains(mb_strtolower((string) $value), $needle));
            }));
        }

        $total = count($data);
        $slice = array_slice($data, ($page - 1) * $limit, $limit);

        return [
            'data' => array_map(fn (array $item) => $this->normalizeItem($type, $item), $slice),
            'meta' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => (int) ceil(max(1, $total) / $limit),
            ],
            'usage' => null,
        ];
    }

    private function demoCharacters(): array
    {
        return [
            ['id' => 1, 'name' => 'Hu Tao', 'slug' => 'hu-tao', 'rarity' => 5, 'vision' => 'pyro', 'weapon' => 'polearm', 'role' => 'Main DPS', 'birthday' => '15 juillet', 'obtain' => 'Vœux événement', 'description' => 'Directrice du Pavillon Wangsheng, excellente DPS Pyro basée sur les PV.'],
            ['id' => 2, 'name' => 'Raiden Shogun', 'slug' => 'raiden-shogun', 'rarity' => 5, 'vision' => 'electro', 'weapon' => 'polearm', 'role' => 'DPS / Batterie', 'birthday' => '26 juin', 'obtain' => 'Vœux événement', 'description' => 'Archon Electro, puissante batterie et carry burst.'],
            ['id' => 3, 'name' => 'Nahida', 'slug' => 'nahida', 'rarity' => 5, 'vision' => 'dendro', 'weapon' => 'catalyst', 'role' => 'Support', 'birthday' => '27 octobre', 'obtain' => 'Vœux événement', 'description' => 'Archon Dendro, application Dendro constante et maîtrise élémentaire.'],
            ['id' => 4, 'name' => 'Zhongli', 'slug' => 'zhongli', 'rarity' => 5, 'vision' => 'geo', 'weapon' => 'polearm', 'role' => 'Shield / Support', 'birthday' => '31 décembre', 'obtain' => 'Vœux événement', 'description' => 'Support défensif premium avec bouclier très résistant.'],
            ['id' => 5, 'name' => 'Yelan', 'slug' => 'yelan', 'rarity' => 5, 'vision' => 'hydro', 'weapon' => 'bow', 'role' => 'Sub DPS', 'birthday' => '20 avril', 'obtain' => 'Vœux événement', 'description' => 'Sub DPS Hydro mobile, excellente en réactions.'],
            ['id' => 6, 'name' => 'Kazuha', 'slug' => 'kaedehara-kazuha', 'rarity' => 5, 'vision' => 'anemo', 'weapon' => 'sword', 'role' => 'Support', 'birthday' => '29 octobre', 'obtain' => 'Vœux événement', 'description' => 'Support Anémo pour groupement, diffusion et bonus élémentaire.'],
        ];
    }

    private function demoWeapons(): array
    {
        return [
            ['id' => 101, 'name' => 'Bâton de Homa', 'slug' => 'staff-of-homa', 'rarity' => 5, 'type' => 'polearm', 'stat' => 'DGT CRIT', 'recommended_for' => 'Hu Tao', 'description' => 'Arme signature pour DPS PV et dégâts critiques.'],
            ['id' => 102, 'name' => 'Lumière du faucheur', 'slug' => 'engulfing-lightning', 'rarity' => 5, 'type' => 'polearm', 'stat' => 'Recharge énergie', 'recommended_for' => 'Raiden Shogun', 'description' => 'Optimisée pour burst et recharge énergie.'],
            ['id' => 103, 'name' => 'Mille rêves flottants', 'slug' => 'a-thousand-floating-dreams', 'rarity' => 5, 'type' => 'catalyst', 'stat' => 'Maîtrise élémentaire', 'recommended_for' => 'Nahida', 'description' => 'Catalyseur idéal pour réactions Dendro.'],
            ['id' => 104, 'name' => 'Arc Aqua Simulacra', 'slug' => 'aqua-simulacra', 'rarity' => 5, 'type' => 'bow', 'stat' => 'DGT CRIT', 'recommended_for' => 'Yelan', 'description' => 'Arc premium pour dégâts personnels.'],
        ];
    }

    private function demoArtifacts(): array
    {
        return [
            ['id' => 201, 'name' => 'Sorcière des flammes ardentes', 'slug' => 'crimson-witch-of-flames', 'rarity' => 5, 'bonus' => 'Bonus Pyro et réactions Pyro', 'compatible' => ['Hu Tao', 'Diluc'], 'description' => 'Set offensif Pyro pour vape/fonte.'],
            ['id' => 202, 'name' => 'Emblème du destin brisé', 'slug' => 'emblem-of-severed-fate', 'rarity' => 5, 'bonus' => 'Recharge énergie et burst', 'compatible' => ['Raiden Shogun', 'Yelan'], 'description' => 'Set burst DPS basé sur la recharge.'],
            ['id' => 203, 'name' => 'Souvenir de forêt', 'slug' => 'deepwood-memories', 'rarity' => 5, 'bonus' => 'Réduction résistance Dendro', 'compatible' => ['Nahida'], 'description' => 'Set essentiel pour équipes Dendro.'],
            ['id' => 204, 'name' => 'Ancien rituel royal', 'slug' => 'noblesse-oblige', 'rarity' => 5, 'bonus' => 'Burst et ATQ équipe', 'compatible' => ['Supports'], 'description' => 'Set universel pour supports burst.'],
        ];
    }

    private function builds(array $characters, array $weapons, array $artifacts): array
    {
        return collect($characters)->take(8)->map(function (array $character) use ($weapons, $artifacts) {
            $weapon = collect($weapons)->first(fn ($item) => mb_strtolower((string) ($item['recommended_for'] ?? '')) === mb_strtolower((string) $character['name'])) ?? $weapons[0] ?? null;
            $artifact = collect($artifacts)->first(fn ($item) => in_array($character['name'] ?? '', (array) ($item['compatible'] ?? []), true)) ?? $artifacts[0] ?? null;

            return [
                'character' => $character['name'],
                'role' => $character['role'] ?? 'DPS / Support',
                'weapon' => $weapon['name'] ?? 'Arme adaptée au rôle',
                'artifact' => $artifact['name'] ?? 'Set principal recommandé',
                'tip' => 'Priorise les stats cohérentes avec le rôle, puis ajuste selon ton équipe.',
            ];
        })->values()->all();
    }

    private function guides(array $characters): array
    {
        return collect($characters)->take(4)->map(fn (array $character) => [
            'title' => 'Build '.$character['name'],
            'slug' => 'build-'.str($character['name'])->slug(),
            'excerpt' => 'Armes, artéfacts et rôle conseillé pour '.$character['name'].'.',
        ])->values()->all();
    }

    private function events(): array
    {
        return [
            ['title' => 'Nouveau personnage disponible', 'label' => 'Nouveau', 'description' => 'Consulte les derniers ajouts et prépare tes ressources.'],
            ['title' => 'Événement exploration', 'label' => 'Event', 'description' => 'Objets, primogemmes et récompenses à récupérer.'],
        ];
    }
}
