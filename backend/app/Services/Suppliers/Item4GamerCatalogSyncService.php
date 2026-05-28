<?php

namespace App\Services\Suppliers;

use App\Models\Product;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class Item4GamerCatalogSyncService
{
    public function __construct(private readonly SupplierManager $manager)
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
        $remoteProducts = $this->unwrapCollection($gateway->products(['per_page' => 100]));

        if ($replaceDemoProducts) {
            Product::where('metadata->supplier', '!=', 'item4gamer')->orWhereNull('metadata->supplier')->update(['active' => false]);
        }

        $syncedProducts = 0;
        $syncedVariations = 0;

        foreach ($remoteProducts as $remoteProduct) {
            $productData = $this->normalizeProduct($remoteProduct);

            if (! $productData['external_id'] || ! $productData['name']) {
                continue;
            }

            $product = Product::updateOrCreate(
                ['sku' => 'item4gamer-product-'.$productData['external_id']],
                [
                    'name' => $productData['name'],
                    'game' => $productData['category'] ?: $productData['name'],
                    'price' => $productData['price'],
                    'currency' => $productData['currency'],
                    'active' => true,
                    'metadata' => [
                        'supplier' => 'item4gamer',
                        'external_id' => $productData['external_id'],
                        'image_url' => $productData['image_url'],
                        'permalink' => $productData['permalink'],
                        'raw' => $remoteProduct,
                    ],
                ]
            );
            $syncedProducts++;

            $variations = $this->extractVariations($remoteProduct);

            if ($variations === [] && $productData['external_id']) {
                try {
                    $variations = $this->unwrapCollection($gateway->variations($productData['external_id']));
                } catch (\Throwable) {
                    $variations = [];
                }
            }

            if ($variations === []) {
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

            foreach ($variations as $variation) {
                $variationData = $this->normalizeVariation($variation, $productData);

                if (! $variationData['external_id']) {
                    continue;
                }

                SupplierProduct::updateOrCreate(
                    ['supplier_id' => $supplier->id, 'external_sku' => (string) $variationData['external_id']],
                    [
                        'product_id' => $product->id,
                        'cost' => $variationData['price'],
                        'active' => true,
                        'metadata' => [
                            'name' => $variationData['name'],
                            'currency' => $variationData['currency'],
                            'raw' => $variation,
                        ],
                    ]
                );
                $syncedVariations++;
            }
        }

        return [
            'products' => $syncedProducts,
            'variations' => $syncedVariations,
        ];
    }

    private function unwrapCollection(array $payload): array
    {
        $data = $payload['data'] ?? $payload;

        foreach (['products', 'categories', 'variations', 'items', 'results'] as $key) {
            if (isset($data[$key]) && is_array($data[$key])) {
                return $data[$key];
            }
        }

        return array_is_list($data) ? $data : [];
    }

    private function extractVariations(array $remoteProduct): array
    {
        foreach (['variations', 'variation', 'children', 'items'] as $key) {
            if (isset($remoteProduct[$key]) && is_array($remoteProduct[$key])) {
                return $remoteProduct[$key];
            }
        }

        return [];
    }

    private function normalizeProduct(array $remoteProduct): array
    {
        $image = Arr::get($remoteProduct, 'image.src')
            ?? Arr::get($remoteProduct, 'images.0.src')
            ?? Arr::get($remoteProduct, 'image')
            ?? Arr::get($remoteProduct, 'thumbnail');

        return [
            'external_id' => Arr::get($remoteProduct, 'id') ?? Arr::get($remoteProduct, 'product_id'),
            'name' => Arr::get($remoteProduct, 'name') ?? Arr::get($remoteProduct, 'title'),
            'category' => Arr::get($remoteProduct, 'category.name') ?? Arr::get($remoteProduct, 'categories.0.name'),
            'price' => (float) (Arr::get($remoteProduct, 'price') ?? Arr::get($remoteProduct, 'regular_price') ?? Arr::get($remoteProduct, 'min_price') ?? 0),
            'currency' => Arr::get($remoteProduct, 'currency') ?? 'USD',
            'image_url' => is_array($image) ? ($image['src'] ?? null) : $image,
            'permalink' => Arr::get($remoteProduct, 'permalink') ?? Arr::get($remoteProduct, 'url'),
        ];
    }

    private function normalizeVariation(array $variation, array $productData): array
    {
        return [
            'external_id' => Arr::get($variation, 'id') ?? Arr::get($variation, 'variation_id'),
            'name' => Arr::get($variation, 'name') ?? Arr::get($variation, 'title') ?? $productData['name'],
            'price' => (float) (Arr::get($variation, 'price') ?? Arr::get($variation, 'regular_price') ?? $productData['price']),
            'currency' => Arr::get($variation, 'currency') ?? $productData['currency'],
        ];
    }
}
