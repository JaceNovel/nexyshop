<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\DispatchSupplierOrder;
use App\Models\Order;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Tournament;
use App\Services\Suppliers\Item4GamerCatalogSyncService;
use App\Services\Suppliers\SupplierManager;
use Illuminate\Http\Request;

class ShopController extends Controller
{
    public function home()
    {
        return [
            'products' => Product::whereActive(true)->limit(8)->get(),
            'tournaments' => Tournament::latest('starts_at')->limit(6)->get(),
        ];
    }

    public function products(Request $request)
    {
        $query = Product::query()
            ->whereActive(true)
            ->with('primarySupplierProduct')
            ->latest();

        if ($search = $request->query('q')) {
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('game', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($game = $request->query('game')) {
            $query->where('game', 'like', "%{$game}%");
        }

        if ($category = $request->query('category')) {
            $query->where(function ($builder) use ($category) {
                $builder->where('metadata->category', $category)
                    ->orWhere('metadata->type', $category)
                    ->orWhere('game', 'like', "%{$category}%");
            });
        }

        return $query
            ->paginate((int) $request->integer('per_page', 24))
            ->through(fn (Product $product) => $this->serializeProduct($product));
    }

    public function product(Product $product)
    {
        abort_unless($product->active, 404);

        return [
            'data' => $this->serializeProduct($product->load('primarySupplierProduct')),
            'recommended' => Product::query()
                ->whereActive(true)
                ->whereKeyNot($product->id)
                ->where('game', $product->game)
                ->limit(6)
                ->get()
                ->map(fn (Product $item) => $this->serializeProduct($item)),
        ];
    }

    public function categories()
    {
        return Product::query()
            ->whereActive(true)
            ->selectRaw('game, count(*) as products_count, min(price) as min_price')
            ->groupBy('game')
            ->orderBy('game')
            ->get();
    }

    public function syncItem4Gamer(Item4GamerCatalogSyncService $sync)
    {
        return $sync->sync();
    }

    public function item4GamerBalance(SupplierManager $suppliers)
    {
        $supplier = $this->item4GamerSupplier();

        return $suppliers->gateway($supplier)->balance();
    }

    public function item4GamerOrder(Request $request, SupplierManager $suppliers)
    {
        $data = $request->validate(['order_id' => ['required', 'string', 'max:80']]);
        $supplier = $this->item4GamerSupplier();

        return $suppliers->gateway($supplier)->getOrder($data['order_id']);
    }

    public function order(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'variation_id' => ['nullable', 'string', 'max:80'],
            'game_uid' => ['required', 'string', 'max:64'],
            'nickname' => ['required', 'string', 'max:120'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
        ]);

        $product = Product::findOrFail($data['product_id']);
        $quantity = (int) ($data['quantity'] ?? 1);
        $order = Order::create([
            'product_id' => $data['product_id'],
            'game_uid' => $data['game_uid'],
            'nickname' => $data['nickname'],
            'user_id' => $request->user()->id,
            'amount' => $product->price * $quantity,
            'currency' => $product->currency,
            'status' => 'pending_payment',
            'metadata' => [
                'variation_id' => $data['variation_id'] ?? $product->supplierProducts()->first()?->external_sku,
                'supplier' => 'item4gamer',
                'quantity' => $quantity,
            ],
        ]);

        DispatchSupplierOrder::dispatchIf($order->status === 'paid', $order);

        return response()->json($order, 201);
    }

    public function guestOrder(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'variation_id' => ['nullable', 'string', 'max:80'],
            'game_uid' => ['required', 'string', 'max:64'],
            'nickname' => ['required', 'string', 'max:120'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
        ]);

        $product = Product::findOrFail($data['product_id']);
        $quantity = (int) ($data['quantity'] ?? 1);

        $order = Order::create([
            'product_id' => $product->id,
            'game_uid' => $data['game_uid'],
            'nickname' => $data['nickname'],
            'amount' => $product->price * $quantity,
            'currency' => $product->currency,
            'status' => 'pending_payment',
            'metadata' => [
                'variation_id' => $data['variation_id'] ?? $product->supplierProducts()->first()?->external_sku,
                'supplier' => $product->metadata['supplier'] ?? 'item4gamer',
                'checkout_mode' => 'guest',
                'payment_pending' => true,
                'quantity' => $quantity,
            ],
        ]);

        return response()->json([
            'order' => $order,
            'next_step' => 'payment_provider_to_integrate',
        ], 201);
    }

    private function item4GamerSupplier(): Supplier
    {
        return Supplier::firstOrCreate(
            ['slug' => 'item4gamer'],
            ['name' => 'Item4Gamer', 'base_url' => config('services.suppliers.item4gamer.base_url'), 'active' => true, 'priority' => 1]
        );
    }

    private function serializeProduct(Product $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'game' => $product->game,
            'sku' => $product->sku,
            'price' => (float) $product->price,
            'currency' => $product->currency,
            'image_url' => $product->metadata['image_url'] ?? null,
            'description' => $product->metadata['description'] ?? null,
            'delivery' => $product->metadata['delivery'] ?? 'automatic',
            'requires_uid' => (bool) ($product->metadata['requires_uid'] ?? true),
            'amounts' => $product->metadata['amounts'] ?? [],
            'permalink' => $product->metadata['permalink'] ?? null,
            'supplier' => $product->metadata['supplier'] ?? 'internal',
            'variation_id' => $product->primarySupplierProduct?->external_sku,
        ];
    }
}
