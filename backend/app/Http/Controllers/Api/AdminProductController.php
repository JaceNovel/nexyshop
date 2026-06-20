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
                'variants_count' => (int) $product->supplier_products_count,
            ])->all(),
        ];
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'price' => ['required', 'numeric', 'min:0'],
            'active' => ['required', 'boolean'],
        ]);

        $product->update([
            'price' => $data['price'],
            'active' => $data['active'],
        ]);

        return [
            'message' => 'Produit mis à jour.',
            'product' => $product->fresh(),
        ];
    }
}