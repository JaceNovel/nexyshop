<?php

namespace App\Services\Suppliers;

use App\Models\Product;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Services\Shop\PricingService;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class FazerCardsCatalogSyncService
{
    public function __construct(
        private readonly SupplierManager $manager,
        private readonly PricingService $pricing,
    ) {
    }

    public function sync(): array
    {
        $supplier = Supplier::updateOrCreate(
            ['slug' => 'fazercards'],
            [
                'name' => 'FazerCards',
                'base_url' => config('services.suppliers.fazercards.base_url'),
                'priority' => 1,
                'active' => (bool) config('services.suppliers.fazercards.enabled', true),
            ]
        );

        $gateway = $this->manager->gateway($supplier);
        SupplierProduct::where('supplier_id', $supplier->id)->update(['active' => false]);
        Product::where('metadata->supplier', 'fazercards')->update(['active' => false]);

        $stats = [
            'products' => 0,
            'variations' => 0,
            'topups' => 0,
            'giftcards' => 0,
            'gamekeys' => 0,
            'manual_services' => 0,
        ];

        if (config('services.suppliers.fazercards.sync_topups', true)) {
            $this->syncTopups($gateway, $supplier, $stats);
        }

        if (config('services.suppliers.fazercards.sync_giftcards', true)) {
            $this->syncGiftcards($gateway, $supplier, $stats);
        }

        if (config('services.suppliers.fazercards.sync_gamekeys', true)) {
            $this->syncGameKeys($gateway, $supplier, $stats);
        }

        if (config('services.suppliers.fazercards.sync_manual_services', true)) {
            $this->syncManualServices($gateway, $supplier, $stats);
        }

        return $stats;
    }

    private function syncTopups(FazerCardsGateway $gateway, Supplier $supplier, array &$stats): void
    {
        foreach ($this->cursorItems(fn (array $query) => $gateway->topups($query)) as $category) {
            $categoryId = (string) Arr::get($category, 'category_id');

            if ($categoryId === '') {
                continue;
            }

            try {
                $details = $gateway->topupOffers($categoryId);
            } catch (\Throwable) {
                continue;
            }

            $offers = collect($details['offers'] ?? [])->filter(fn ($offer) => is_array($offer) && Arr::get($offer, 'offer_id'))->values();

            if ($offers->isEmpty()) {
                continue;
            }

            $product = $this->upsertProduct('topup', $categoryId, [
                'name' => $this->text(Arr::get($details, 'name') ?? Arr::get($category, 'name')),
                'category' => 'Game Credits',
                'type' => 'top-up',
                'image_url' => Arr::get($details, 'imageurl') ?? Arr::get($category, 'imageurl'),
                'description' => Arr::get($details, 'note') ?? Arr::get($category, 'note'),
                'requires_uid' => count($details['fields'] ?? []) > 0,
                'fields' => $details['fields'] ?? [],
                'raw' => ['category' => $category, 'details' => $details],
            ], $offers->pluck('price_usd')->map(fn ($price) => (float) $price)->filter(fn ($price) => $price > 0)->all());

            $stats['products']++;
            $stats['topups']++;

            foreach ($offers as $offer) {
                $this->upsertVariation($supplier, $product, FazerCardsGateway::encodeSku([
                    'kind' => 'topup',
                    'category_id' => $categoryId,
                    'offer_id' => (string) Arr::get($offer, 'offer_id'),
                ]), [
                    'name' => $this->text(Arr::get($offer, 'name')),
                    'cost' => (float) Arr::get($offer, 'price_usd', 0),
                    'metadata' => [
                        'currency' => 'USD',
                        'kind' => 'topup',
                        'category_id' => $categoryId,
                        'offer_id' => (string) Arr::get($offer, 'offer_id'),
                        'fields' => $details['fields'] ?? [],
                        'raw' => $offer,
                    ],
                ]);
                $stats['variations']++;
            }
        }
    }

    private function syncGiftcards(FazerCardsGateway $gateway, Supplier $supplier, array &$stats): void
    {
        foreach ($this->cursorItems(fn (array $query) => $gateway->giftcards($query)) as $category) {
            $categoryId = (string) Arr::get($category, 'category_id');

            if ($categoryId === '') {
                continue;
            }

            try {
                $details = $gateway->giftcardOffers($categoryId);
            } catch (\Throwable) {
                continue;
            }

            $offers = collect($details['offers'] ?? [])->filter(fn ($offer) => is_array($offer) && Arr::get($offer, 'card_id'))->values();

            if ($offers->isEmpty()) {
                continue;
            }

            $product = $this->upsertProduct('giftcard', $categoryId, [
                'name' => $this->text(Arr::get($details, 'name') ?? Arr::get($category, 'name')),
                'category' => 'Gift Cards',
                'type' => 'gift-card',
                'image_url' => Arr::get($details, 'imageurl') ?? Arr::get($category, 'imageurl'),
                'description' => Arr::get($details, 'note') ?? Arr::get($category, 'note'),
                'requires_uid' => false,
                'fields' => [],
                'raw' => ['category' => $category, 'details' => $details],
            ], $offers->pluck('price_usd')->map(fn ($price) => (float) $price)->filter(fn ($price) => $price > 0)->all());

            $stats['products']++;
            $stats['giftcards']++;

            foreach ($offers as $offer) {
                $this->upsertVariation($supplier, $product, FazerCardsGateway::encodeSku([
                    'kind' => 'gift_card',
                    'category_id' => $categoryId,
                    'card_id' => (string) Arr::get($offer, 'card_id'),
                ]), [
                    'name' => $this->text(Arr::get($offer, 'name')),
                    'cost' => (float) Arr::get($offer, 'price_usd', 0),
                    'metadata' => [
                        'currency' => 'USD',
                        'kind' => 'gift_card',
                        'category_id' => $categoryId,
                        'card_id' => (string) Arr::get($offer, 'card_id'),
                        'stock' => Arr::get($offer, 'stock'),
                        'min_order_quantity' => Arr::get($offer, 'min_order_quantity'),
                        'max_order_quantity' => Arr::get($offer, 'max_order_quantity'),
                        'raw' => $offer,
                    ],
                ]);
                $stats['variations']++;
            }
        }
    }

    private function syncGameKeys(FazerCardsGateway $gateway, Supplier $supplier, array &$stats): void
    {
        foreach ($this->cursorItems(fn (array $query) => $gateway->gameKeys($query)) as $game) {
            $gameId = (string) Arr::get($game, 'game_id');

            if ($gameId === '') {
                continue;
            }

            try {
                $details = $gateway->gameKeyOffers($gameId);
            } catch (\Throwable) {
                continue;
            }

            $offers = collect($details['keys'] ?? [])->filter(fn ($offer) => is_array($offer) && Arr::get($offer, 'key_id'))->values();

            if ($offers->isEmpty()) {
                continue;
            }

            $product = $this->upsertProduct('gamekey', $gameId, [
                'name' => $this->text(Arr::get($details, 'GameName') ?? Arr::get($game, 'name')),
                'category' => 'Game Keys',
                'type' => 'game-key',
                'image_url' => Arr::get($details, 'imageurl') ?? Arr::get($game, 'imageurl'),
                'description' => trim(implode(' ', array_filter([Arr::get($details, 'platform'), Arr::get($details, 'region')]))),
                'requires_uid' => false,
                'fields' => [],
                'raw' => ['category' => $game, 'details' => $details],
            ], $offers->pluck('price_usd')->map(fn ($price) => (float) $price)->filter(fn ($price) => $price > 0)->all());

            $stats['products']++;
            $stats['gamekeys']++;

            foreach ($offers as $offer) {
                $this->upsertVariation($supplier, $product, FazerCardsGateway::encodeSku([
                    'kind' => 'game_key',
                    'game_id' => $gameId,
                    'key_id' => (string) Arr::get($offer, 'key_id'),
                ]), [
                    'name' => $this->text(Arr::get($offer, 'name')),
                    'cost' => (float) Arr::get($offer, 'price_usd', 0),
                    'metadata' => [
                        'currency' => 'USD',
                        'kind' => 'game_key',
                        'game_id' => $gameId,
                        'key_id' => (string) Arr::get($offer, 'key_id'),
                        'stock' => Arr::get($offer, 'stock'),
                        'raw' => $offer,
                    ],
                ]);
                $stats['variations']++;
            }
        }
    }

    private function syncManualServices(FazerCardsGateway $gateway, Supplier $supplier, array &$stats): void
    {
        foreach (($gateway->manualServices()['items'] ?? []) as $category) {
            $serviceId = (string) Arr::get($category, 'id');

            if ($serviceId === '') {
                continue;
            }

            try {
                $details = $gateway->manualServiceOffers($serviceId);
            } catch (\Throwable) {
                continue;
            }

            $offers = collect($details['items'] ?? [])->filter(fn ($offer) => is_array($offer) && Arr::get($offer, 'id'))->values();

            if ($offers->isEmpty()) {
                continue;
            }

            $fields = collect($details['fields'] ?? [])->map(fn ($field) => [
                'key' => Arr::get($field, 'code'),
                'label' => Arr::get($field, 'name'),
                'type' => 'text',
            ])->filter(fn ($field) => $field['key'])->values()->all();

            $product = $this->upsertProduct('manual', $serviceId, [
                'name' => $this->text(Arr::get($details, 'category.name') ?? Arr::get($category, 'name')),
                'category' => 'Manual Services',
                'type' => 'manual-service',
                'image_url' => Arr::get($details, 'imageurl') ?? Arr::get($category, 'imageurl'),
                'description' => Arr::get($details, 'info') ?? Arr::get($category, 'info'),
                'requires_uid' => count($fields) > 0,
                'fields' => $fields,
                'raw' => ['category' => $category, 'details' => $details],
            ], $offers->pluck('price_usd')->map(fn ($price) => (float) $price)->filter(fn ($price) => $price > 0)->all());

            $stats['products']++;
            $stats['manual_services']++;

            foreach ($offers as $offer) {
                $this->upsertVariation($supplier, $product, FazerCardsGateway::encodeSku([
                    'kind' => 'manual_service',
                    'manual_service_id' => $serviceId,
                    'product_id' => (string) Arr::get($offer, 'id'),
                ]), [
                    'name' => $this->text(Arr::get($offer, 'name')),
                    'cost' => (float) Arr::get($offer, 'price_usd', 0),
                    'metadata' => [
                        'currency' => 'USD',
                        'kind' => 'manual_service',
                        'manual_service_id' => $serviceId,
                        'product_id' => (string) Arr::get($offer, 'id'),
                        'fields' => $fields,
                        'raw' => $offer,
                    ],
                ]);
                $stats['variations']++;
            }
        }
    }

    private function upsertProduct(string $kind, string $externalId, array $data, array $costs): Product
    {
        $costs = array_values(array_filter($costs, fn ($cost) => (float) $cost > 0));
        $min = $costs ? min($costs) : 0;
        $max = $costs ? max($costs) : $min;

        return Product::updateOrCreate(
            ['sku' => 'fazercards-'.$kind.'-'.$externalId],
            [
                'name' => $data['name'],
                'game' => $data['category'],
                'price' => $min,
                'currency' => 'USD',
                'active' => $min > 0,
                'metadata' => [
                    'supplier' => 'fazercards',
                    'external_id' => $externalId,
                    'category' => $data['category'],
                    'category_slug' => Str::slug($data['category']),
                    'type' => $data['type'],
                    'image_url' => $this->absoluteImage($data['image_url'] ?? null),
                    'description' => $data['description'] ?: null,
                    'requires_uid' => (bool) $data['requires_uid'],
                    'required_fields' => $data['fields'] ?? [],
                    'price_range' => $this->pricing->retailRange($min, $max),
                    'cost_range' => ['min' => $min, 'max' => $max],
                    'raw' => $data['raw'] ?? null,
                ],
            ]
        );
    }

    private function upsertVariation(Supplier $supplier, Product $product, string $sku, array $data): SupplierProduct
    {
        return SupplierProduct::updateOrCreate(
            ['supplier_id' => $supplier->id, 'external_sku' => $sku],
            [
                'product_id' => $product->id,
                'cost' => $data['cost'],
                'active' => $data['cost'] > 0,
                'metadata' => [
                    ...$data['metadata'],
                    'name' => $data['name'],
                ],
            ]
        );
    }

    private function cursorItems(callable $fetch): array
    {
        $items = [];
        $cursor = null;
        $limit = min(max((int) config('services.suppliers.fazercards.page_limit', 500), 1), 500);
        $maxPages = max((int) config('services.suppliers.fazercards.max_pages', 20), 1);

        for ($page = 0; $page < $maxPages; $page++) {
            $response = $fetch(array_filter([
                'limit' => $limit,
                'cursor' => $cursor,
                'include_ui' => 1,
            ]));
            $items = [...$items, ...($response['items'] ?? [])];
            $cursor = $response['meta']['next_cursor'] ?? null;

            if (! ($response['meta']['has_more'] ?? false) || ! $cursor) {
                break;
            }
        }

        return $items;
    }

    private function absoluteImage(?string $url): ?string
    {
        if (! is_string($url) || trim($url) === '') {
            return null;
        }

        $url = trim($url);

        if (str_starts_with($url, '//')) {
            return 'https:'.$url;
        }

        if (str_starts_with($url, '/')) {
            return 'https://api.fzr.cards'.$url;
        }

        return preg_match('/^https?:\/\//i', $url) ? $url : null;
    }

    private function text(mixed $value): string
    {
        return trim(html_entity_decode((string) $value, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }
}
