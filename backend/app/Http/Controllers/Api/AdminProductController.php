<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class AdminProductController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('q', ''));

        $products = Product::query()
            ->withCount('supplierProducts')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($builder) use ($search) {
                    $builder->where('name', 'like', "%{$search}%")
                        ->orWhere('game', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('metadata->permalink', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->limit(150)
            ->get();

        return [
            'data' => $products->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'game' => $product->game,
                'sku' => $product->sku,
                'price' => (float) $product->price,
                'currency' => $product->currency,
                'active' => (bool) $product->active,
                'type' => $product->metadata['type'] ?? 'top-up',
                'permalink' => $product->metadata['permalink'] ?? null,
                'delivery' => $product->metadata['delivery'] ?? 'automatic',
                'manual_fulfillment' => (bool) ($product->metadata['manual_fulfillment'] ?? false),
                'client_site_enabled' => $this->clientSiteEnabled($product),
                'variants_count' => (int) $product->supplier_products_count,
            ])->all(),
        ];
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'price' => ['required', 'numeric', 'min:0'],
            'active' => ['required', 'boolean'],
            'client_site_enabled' => ['sometimes', 'boolean'],
        ]);

        $metadata = $product->metadata ?? [];

        if (array_key_exists('client_site_enabled', $data)) {
            $metadata['client_site_enabled'] = (bool) $data['client_site_enabled'];
        }

        $product->update([
            'price' => $data['price'],
            'active' => $data['active'],
            'metadata' => $metadata,
        ]);

        return [
            'message' => 'Produit mis à jour.',
            'product' => $product->fresh(),
        ];
    }

    public function bulkClientSite(Request $request)
    {
        $data = $request->validate([
            'product_ids' => ['required', 'array'],
            'product_ids.*' => ['integer', 'exists:products,id'],
            'enabled' => ['required', 'boolean'],
        ]);

        Product::query()
            ->whereIn('id', $data['product_ids'])
            ->get()
            ->each(function (Product $product) use ($data) {
                $metadata = $product->metadata ?? [];
                $metadata['client_site_enabled'] = (bool) $data['enabled'];
                $product->forceFill(['metadata' => $metadata])->save();
            });

        return ['message' => 'Sélection client mise à jour.'];
    }

    private function clientSiteEnabled(Product $product): bool
    {
        if (array_key_exists('client_site_enabled', $product->metadata ?? [])) {
            return (bool) $product->metadata['client_site_enabled'];
        }

        $haystack = strtolower($product->name.' '.$product->game.' '.($product->metadata['category'] ?? '').' '.($product->metadata['type'] ?? ''));

        return str_contains($haystack, 'free fire') || str_contains($haystack, 'freefire');
    }
}