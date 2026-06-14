<?php

namespace App\Services\Suppliers;

use App\Models\Product;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Services\Shop\PricingService;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class Item4GamerCatalogSyncService
{
    public function __construct(
        private readonly SupplierManager $manager,
        private readonly PricingService $pricing,
    )
    {
    }

    public function sync(bool $replaceDemoProducts = true): array
    {
        $supplier = Supplier::firstOrCreate(
            ['slug' => 'item4gamer'],
            [
                'name' => 'Item4Gamer',
                'base_url' => config('services.suppliers.item4gamer.base_url'),
                'priority' => 1,
                'active' => true,
            ]
        );

        $gateway = $this->manager->gateway($supplier);
        try {
            $remoteCategories = $this->unwrapCollection($gateway->categories());
        } catch (\Throwable) {
            $remoteCategories = [];
        }

        $categories = $this->indexCategories($remoteCategories);
        $remoteProducts = $this->loadProducts($gateway, $categories);

        if ($replaceDemoProducts) {
            Product::where('metadata->supplier', '!=', 'item4gamer')
                ->orWhereNull('metadata->supplier')
                ->update(['active' => false]);
        }

        Product::where('metadata->supplier', 'item4gamer')->update(['active' => false]);
        SupplierProduct::where('supplier_id', $supplier->id)->update(['active' => false]);

        $syncedProducts = 0;
        $syncedVariations = 0;

        foreach ($remoteProducts as $remoteProduct) {
            $productData = $this->normalizeProduct($remoteProduct, $categories);

            if (! $productData['external_id'] || ! $productData['name']) {
                continue;
            }

            $variations = $this->extractVariations($remoteProduct);

            if ($variations === [] && $productData['external_id']) {
                try {
                    $variations = $this->unwrapVariationsResponse($gateway->variations($productData['external_id']));
                } catch (\Throwable) {
                    $variations = [];
                }
            }

            $normalizedVariations = collect($variations)
                ->map(fn (array $variation) => $this->normalizeVariation($variation, $productData))
                ->filter(fn (array $variation) => (bool) $variation['external_id'])
                ->values();
            $variationPrices = $normalizedVariations->pluck('price')->filter(fn ($price) => (float) $price > 0);
            $baseVisiblePrice = $variationPrices->min() ?? $productData['price'];
            $retailRange = $this->pricing->retailRange(
                $variationPrices->min() ?? $productData['price'],
                $variationPrices->max() ?? $productData['price'],
            );

            $product = Product::updateOrCreate(
                ['sku' => 'item4gamer-product-'.$productData['external_id']],
                [
                    'name' => $productData['name'],
                    'game' => $productData['game'] ?: $productData['category'] ?: $productData['name'],
                    'price' => $baseVisiblePrice,
                    'currency' => $productData['currency'],
                    'active' => true,
                    'metadata' => [
                        'supplier' => 'item4gamer',
                        'external_id' => $productData['external_id'],
                        'category' => $productData['category'],
                        'category_id' => $productData['category_id'],
                        'category_slug' => $productData['category_slug'],
                        'type' => $productData['type'],
                        'image_url' => $productData['image_url'],
                        'permalink' => $productData['permalink'],
                        'description' => $productData['description'],
                        'requires_uid' => $productData['requires_uid'],
                        'amounts' => $normalizedVariations->pluck('name')->filter()->values()->all(),
                        'price_range' => [
                            'min' => $retailRange['min'],
                            'max' => $retailRange['max'],
                        ],
                        'cost_range' => [
                            'min' => $variationPrices->min() ?? $productData['price'],
                            'max' => $variationPrices->max() ?? $productData['price'],
                        ],
                        'raw' => $remoteProduct,
                    ],
                ]
            );
            $syncedProducts++;

            if ($normalizedVariations->isEmpty()) {
                SupplierProduct::updateOrCreate(
                    ['supplier_id' => $supplier->id, 'external_sku' => (string) $productData['external_id']],
                    [
                        'product_id' => $product->id,
                        'cost' => $productData['price'],
                        'active' => true,
                        'metadata' => ['raw' => $remoteProduct],
                    ]
                );
                $syncedVariations++;
                continue;
            }

            foreach ($normalizedVariations as $variationData) {
                SupplierProduct::updateOrCreate(
                    ['supplier_id' => $supplier->id, 'external_sku' => (string) $variationData['external_id']],
                    [
                        'product_id' => $product->id,
                        'cost' => $variationData['price'],
                        'active' => true,
                        'metadata' => [
                            'name' => $variationData['name'],
                            'currency' => $variationData['currency'],
                            'raw' => $variationData['raw'],
                        ],
                    ]
                );
                $syncedVariations++;
            }
        }

        return [
            'products' => $syncedProducts,
            'variations' => $syncedVariations,
            'categories' => count($categories),
        ];
    }

    private function unwrapCollection(array $payload): array
    {
        $data = $payload['data'] ?? $payload;

        foreach (['products', 'categories', 'variations', 'product_variations', 'items', 'results'] as $key) {
            if (isset($data[$key]) && is_array($data[$key])) {
                return $data[$key];
            }
        }

        return array_is_list($data) ? $data : [];
    }

    private function unwrapVariationsResponse(array $payload): array
    {
        $variations = $this->unwrapCollection($payload);

        if ($variations !== []) {
            return $variations;
        }

        foreach ([
            $payload['data']['product'] ?? null,
            $payload['data']['item'] ?? null,
            $payload['data'] ?? null,
            $payload['product'] ?? null,
            $payload['item'] ?? null,
            $payload,
        ] as $candidate) {
            if (is_array($candidate)) {
                $variations = $this->extractVariations($candidate);

                if ($variations !== []) {
                    return $variations;
                }
            }
        }

        return [];
    }

    private function extractVariations(array $remoteProduct): array
    {
        foreach (['variations', 'variation', 'product_variations', 'children', 'items'] as $key) {
            if (isset($remoteProduct[$key]) && is_array($remoteProduct[$key])) {
                return $remoteProduct[$key];
            }
        }

        return [];
    }

    private function normalizeProduct(array $remoteProduct, array $categories): array
    {
        $image = $this->firstValue($remoteProduct, [
            'image.src',
            'image.url',
            'images.0.src',
            'images.0.url',
            'images.0',
            'image',
            'img',
            'thumbnail',
            'thumbnail_url',
            'image_url',
            'product_image',
            'product_img',
            'featured_image',
            'featured_image_url',
            'icon',
            'logo',
        ]) ?? $this->firstMatchingValue($remoteProduct, [
            'src',
            'url',
            'image',
            'img',
            'thumbnail',
            'thumbnail_url',
            'image_url',
            'product_image',
            'product_img',
            'featured_image',
            'featured_image_url',
            'icon',
            'logo',
        ]);
        $categoryId = Arr::get($remoteProduct, '_item4gamer_category.id')
            ?? Arr::get($remoteProduct, 'category_id')
            ?? Arr::get($remoteProduct, 'category.id')
            ?? Arr::get($remoteProduct, 'categories.0.id');
        $category = Arr::get($remoteProduct, '_item4gamer_category.name')
            ?? Arr::get($remoteProduct, 'category.name')
            ?? Arr::get($remoteProduct, 'categories.0.name')
            ?? Arr::get($remoteProduct, 'category')
            ?? ($categoryId ? ($categories[(string) $categoryId]['name'] ?? null) : null);
        $categorySlug = Arr::get($remoteProduct, '_item4gamer_category.slug')
            ?? Arr::get($remoteProduct, 'category.slug')
            ?? Arr::get($remoteProduct, 'categories.0.slug')
            ?? ($category ? Str::slug($category) : null);
        $name = Arr::get($remoteProduct, 'name') ?? Arr::get($remoteProduct, 'title');

        return [
            'external_id' => Arr::get($remoteProduct, 'id') ?? Arr::get($remoteProduct, 'product_id'),
            'name' => $this->decodeText($name),
            'game' => Arr::get($remoteProduct, 'game') ?? Arr::get($remoteProduct, 'game_name'),
            'category' => $this->decodeText($category),
            'category_id' => $categoryId,
            'category_slug' => $categorySlug,
            'type' => $this->detectType($remoteProduct, $category),
            'price' => $this->money($this->firstValue($remoteProduct, [
                'price',
                'price_html',
                'api_price',
                'reseller_price',
                'reseller_price_html',
                'regular_price',
                'sale_price',
                'min_price',
                'price_min',
                'amount',
                'cost',
            ]) ?? $this->firstMatchingValue($remoteProduct, [
                'price',
                'price_html',
                'api_price',
                'reseller_price',
                'reseller_price_html',
                'regular_price',
                'sale_price',
                'min_price',
                'price_min',
                'amount',
                'cost',
            ])),
            'currency' => Arr::get($remoteProduct, 'currency') ?? Arr::get($remoteProduct, 'currency_code') ?? 'XOF',
            'image_url' => $this->normalizeImage($image),
            'permalink' => Arr::get($remoteProduct, 'permalink') ?? Arr::get($remoteProduct, 'url'),
            'description' => Arr::get($remoteProduct, 'description') ?? Arr::get($remoteProduct, 'short_description'),
            'requires_uid' => (bool) (Arr::get($remoteProduct, 'requires_uid') ?? Arr::get($remoteProduct, 'require_uid') ?? true),
        ];
    }

    private function normalizeVariation(array $variation, array $productData): array
    {
        $name = Arr::get($variation, 'name') ?? Arr::get($variation, 'title') ?? $productData['name'];

        return [
            'external_id' => Arr::get($variation, 'id') ?? Arr::get($variation, 'variation_id'),
            'name' => $this->decodeText($name),
            'price' => $this->money($this->firstValue($variation, [
                'price',
                'price_html',
                'api_price',
                'reseller_price',
                'reseller_price_html',
                'regular_price',
                'sale_price',
                'amount',
                'cost',
            ]) ?? $this->firstMatchingValue($variation, [
                'price',
                'price_html',
                'api_price',
                'reseller_price',
                'reseller_price_html',
                'regular_price',
                'sale_price',
                'amount',
                'cost',
            ]) ?? $productData['price']),
            'currency' => Arr::get($variation, 'currency') ?? $productData['currency'],
            'raw' => $variation,
        ];
    }

    private function loadProducts(SupplierGateway $gateway, array $categories): array
    {
        if ($categories === []) {
            $configuredCategoryIds = config('services.suppliers.item4gamer.category_ids', []);

            $categories = collect($configuredCategoryIds)
                ->mapWithKeys(fn (string $id) => [
                    $id => [
                        'id' => $id,
                        'name' => 'Item4Gamer '.$id,
                        'slug' => 'item4gamer-'.$id,
                        'raw' => ['fallback' => true],
                    ],
                ])
                ->all();
        }

        $products = [];

        if ($categories === []) {
            return $this->fetchProductPages($gateway);
        }

        foreach ($categories as $category) {
            $categoryProducts = $this->fetchProductPages($gateway, ['category_id' => $category['id']]);

            foreach ($categoryProducts as $product) {
                $product['_item4gamer_category'] = $category;
                $products[(string) (Arr::get($product, 'id') ?? Arr::get($product, 'product_id') ?? count($products))] = $product;
            }
        }

        return array_values($products);
    }

    private function fetchProductPages(SupplierGateway $gateway, array $query = []): array
    {
        $perPage = max(1, (int) config('services.suppliers.item4gamer.per_page', 100));
        $maxPages = max(1, (int) config('services.suppliers.item4gamer.max_pages', 20));
        $products = [];

        for ($page = 1; $page <= $maxPages; $page++) {
            try {
                $pageProducts = $this->unwrapCollection($gateway->products([
                    ...$query,
                    'per_page' => $perPage,
                    'page' => $page,
                ]));
            } catch (\Throwable) {
                break;
            }

            if ($pageProducts === []) {
                break;
            }

            $added = 0;

            foreach ($pageProducts as $product) {
                $key = (string) (Arr::get($product, 'id') ?? Arr::get($product, 'product_id') ?? md5(json_encode($product)));

                if (! isset($products[$key])) {
                    $products[$key] = $product;
                    $added++;
                }
            }

            if ($added === 0 || count($pageProducts) < $perPage) {
                break;
            }
        }

        return array_values($products);
    }

    private function indexCategories(array $remoteCategories): array
    {
        $categories = [];

        foreach ($remoteCategories as $remoteCategory) {
            $id = Arr::get($remoteCategory, 'id') ?? Arr::get($remoteCategory, 'category_id');
            $name = $this->decodeText(Arr::get($remoteCategory, 'name') ?? Arr::get($remoteCategory, 'title'));

            if (! $id || ! $name) {
                continue;
            }

            $categories[(string) $id] = [
                'id' => $id,
                'name' => $name,
                'slug' => Arr::get($remoteCategory, 'slug') ?? Str::slug($name),
                'raw' => $remoteCategory,
            ];
        }

        return $categories;
    }

    private function detectType(array $remoteProduct, ?string $category): string
    {
        $text = Str::lower(implode(' ', array_filter([
            Arr::get($remoteProduct, 'type'),
            Arr::get($remoteProduct, 'name'),
            Arr::get($remoteProduct, 'title'),
            $category,
        ])));

        return Str::contains($text, ['gift', 'card', 'voucher', 'code'])
            ? 'gift-card'
            : 'top-up';
    }

    private function decodeText(?string $value): ?string
    {
        return $value === null ? null : html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    private function firstValue(array $payload, array $paths, mixed $fallback = null): mixed
    {
        foreach ($paths as $path) {
            $value = Arr::get($payload, $path);

            if ($value !== null && $value !== '' && $value !== []) {
                return $value;
            }
        }

        return $fallback;
    }

    private function firstMatchingValue(array $payload, array $keys): mixed
    {
        $normalizedKeys = array_map(fn (string $key) => Str::lower($key), $keys);

        foreach ($payload as $key => $value) {
            if (in_array(Str::lower((string) $key), $normalizedKeys, true) && $value !== null && $value !== '' && $value !== []) {
                return $value;
            }

            if (is_array($value)) {
                $nested = $this->firstMatchingValue($value, $keys);

                if ($nested !== null && $nested !== '' && $nested !== []) {
                    return $nested;
                }
            }
        }

        return null;
    }

    private function money(mixed $value): float
    {
        if (is_array($value)) {
            $value = $value['value'] ?? $value['amount'] ?? $value['price'] ?? null;
        }

        $value = html_entity_decode((string) $value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $value = strip_tags($value);
        $value = preg_replace('/[^\d,.\-]/', '', $value) ?: '0';

        if (str_contains($value, ',') && str_contains($value, '.')) {
            $value = str_replace(',', '', $value);
        } elseif (str_contains($value, ',')) {
            $value = str_replace(',', '.', $value);
        }

        return round((float) $value, 2);
    }

    private function normalizeImage(mixed $image): ?string
    {
        if (is_array($image)) {
            $image = $image['src'] ?? $image['url'] ?? $image['image'] ?? null;
        }

        if (! is_string($image) || trim($image) === '') {
            return null;
        }

        $image = html_entity_decode(trim($image), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        if (preg_match('/src=["\']([^"\']+)["\']/i', $image, $match)) {
            $image = $match[1];
        }

        if (str_contains($image, ',')) {
            $image = trim(explode(',', $image)[0]);
        }

        $image = preg_replace('/\s+\d+w$/', '', $image);

        if (str_starts_with($image, '//')) {
            return 'https:'.$image;
        }

        if (str_starts_with($image, '/')) {
            return rtrim((string) config('services.suppliers.item4gamer.site_url', 'https://item4gamer.com'), '/').$image;
        }

        return preg_match('/^https?:\/\//i', $image) ? $image : null;
    }
}
