<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\DispatchSupplierOrder;
use App\Models\Order;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\Tournament;
use App\Services\Shop\PricingService;
use App\Services\Suppliers\FazerCardsCatalogSyncService;
use App\Services\Suppliers\Item4GamerCatalogSyncService;
use App\Services\Suppliers\SupplierManager;
use Illuminate\Http\Request;

class ShopController extends Controller
{
    public function __construct(private readonly PricingService $pricing)
    {
    }

    public function home()
    {
        return [
            'products' => Product::whereActive(true)->where('price', '>', 0)->limit(8)->get(),
            'tournaments' => Tournament::latest('starts_at')->limit(6)->get(),
        ];
    }

    public function products(Request $request)
    {
        $query = Product::query()
            ->whereActive(true)
            ->where('price', '>', 0)
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

        $perPage = min(max((int) $request->integer('per_page', 24), 1), 240);

        return $query
            ->paginate($perPage)
            ->through(fn (Product $product) => $this->serializeProduct($product));
    }

    public function product(Product $product)
    {
        abort_unless($product->active, 404);

        return [
            'data' => $this->serializeProduct($product->load(['primarySupplierProduct', 'supplierProducts'])),
            'recommended' => Product::query()
                ->whereActive(true)
                ->where('price', '>', 0)
                ->with('primarySupplierProduct')
                ->whereKeyNot($product->id)
                ->where('game', $product->game)
                ->limit(6)
                ->get()
                ->map(fn (Product $item) => $this->serializeProduct($item)),
        ];
    }

    public function categories()
    {
        $products = Product::query()
            ->whereActive(true)
            ->where('price', '>', 0)
            ->get();

        return $products
            ->groupBy(fn (Product $product) => $product->metadata['category_slug'] ?? str($product->metadata['category'] ?? $product->game)->slug()->toString())
            ->map(function ($items, string $slug) {
                $first = $items->first();

                return [
                    'slug' => $slug,
                    'name' => $first->metadata['category'] ?? $first->game,
                    'game' => $first->game,
                    'type' => $first->metadata['type'] ?? 'top-up',
                    'products_count' => $items->count(),
                    'min_price' => $this->pricing->retailPrice($items->min('price')),
                ];
            })
            ->sortBy('name')
            ->values();
    }

    public function syncItem4Gamer(Item4GamerCatalogSyncService $sync)
    {
        return $sync->sync();
    }

    public function syncFazerCards(FazerCardsCatalogSyncService $sync)
    {
        return $sync->sync();
    }

    public function fazerCardsBalance(SupplierManager $suppliers)
    {
        $supplier = $this->fazerCardsSupplier();

        return $suppliers->gateway($supplier)->balance();
    }

    public function fazerCardsOrder(Request $request, SupplierManager $suppliers)
    {
        $data = $request->validate(['order_id' => ['required', 'string', 'max:120']]);
        $supplier = $this->fazerCardsSupplier();

        return $suppliers->gateway($supplier)->getOrder($data['order_id']);
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
            'variation_id' => ['nullable', 'string', 'max:255'],
            'game_uid' => ['required', 'string', 'max:64'],
            'nickname' => ['required', 'string', 'max:120'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
            'supplier_fields' => ['nullable', 'array'],
            'supplier_fields.*' => ['nullable', 'string', 'max:500'],
        ]);

        $product = Product::with('supplierProducts')->findOrFail($data['product_id']);
        $quantity = (int) ($data['quantity'] ?? 1);
        $supplierProduct = $this->selectedSupplierProduct($product, $data['variation_id'] ?? null);
        $supplierCost = (float) ($supplierProduct?->cost ?: $product->price);
        $unitPrice = $this->promoPrice($product, $this->pricing->retailPrice($supplierCost));

        $order = Order::create([
            'product_id' => $data['product_id'],
            'game_uid' => $data['game_uid'],
            'nickname' => $data['nickname'],
            'user_id' => $request->user()->id,
            'amount' => $unitPrice * $quantity,
            'currency' => $product->currency,
            'status' => 'pending_payment',
            'metadata' => [
                'variation_id' => $supplierProduct?->external_sku,
                'variation_name' => $supplierProduct?->metadata['name'] ?? null,
                'supplier' => $product->metadata['supplier'] ?? 'fazercards',
                'quantity' => $quantity,
                'supplier_cost' => $supplierCost,
                'margin_amount' => $unitPrice - $supplierCost,
                'promotion' => $this->activePromotion($product),
                'supplier_fields' => $this->supplierFields($product, $data),
            ],
        ]);

        DispatchSupplierOrder::dispatchIf($order->status === 'paid', $order);

        return response()->json($order, 201);
    }

    public function guestOrder(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'variation_id' => ['nullable', 'string', 'max:255'],
            'game_uid' => ['required', 'string', 'max:64'],
            'nickname' => ['required', 'string', 'max:120'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
            'supplier_fields' => ['nullable', 'array'],
            'supplier_fields.*' => ['nullable', 'string', 'max:500'],
        ]);

        $product = Product::with('supplierProducts')->findOrFail($data['product_id']);
        $quantity = (int) ($data['quantity'] ?? 1);
        $supplierProduct = $this->selectedSupplierProduct($product, $data['variation_id'] ?? null);
        $supplierCost = (float) ($supplierProduct?->cost ?: $product->price);
        $unitPrice = $this->promoPrice($product, $this->pricing->retailPrice($supplierCost));

        $order = Order::create([
            'product_id' => $product->id,
            'game_uid' => $data['game_uid'],
            'nickname' => $data['nickname'],
            'amount' => $unitPrice * $quantity,
            'currency' => $product->currency,
            'status' => 'pending_payment',
            'metadata' => [
                'variation_id' => $supplierProduct?->external_sku,
                'variation_name' => $supplierProduct?->metadata['name'] ?? null,
                'supplier' => $product->metadata['supplier'] ?? 'item4gamer',
                'checkout_mode' => 'guest',
                'payment_pending' => true,
                'quantity' => $quantity,
                'supplier_cost' => $supplierCost,
                'margin_amount' => $unitPrice - $supplierCost,
                'promotion' => $this->activePromotion($product),
                'supplier_fields' => $this->supplierFields($product, $data),
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

    private function fazerCardsSupplier(): Supplier
    {
        return Supplier::firstOrCreate(
            ['slug' => 'fazercards'],
            ['name' => 'FazerCards', 'base_url' => config('services.suppliers.fazercards.base_url'), 'active' => true, 'priority' => 1]
        );
    }

    private function serializeProduct(Product $product): array
    {
        $product->loadMissing('supplierProducts');
        $variations = $product->supplierProducts
            ->where('active', true)
            ->sortBy('cost')
            ->map(function (SupplierProduct $supplierProduct) use ($product) {
                $variationPrice = (float) ($supplierProduct->metadata['retail_price'] ?? 0);

                if ($variationPrice <= 0 && (float) $supplierProduct->cost > 0) {
                    $variationPrice = $this->pricing->retailPrice($supplierProduct->cost);
                }

                if ($variationPrice <= 0 && (float) $product->price > 0) {
                    $variationPrice = $this->pricing->retailPrice($product->price);
                }

                $retailPrice = $this->promoPrice($product, $variationPrice);

                return [
                    'id' => $supplierProduct->id,
                    'variation_id' => (string) $supplierProduct->external_sku,
                    'name' => $supplierProduct->metadata['name'] ?? $product->name,
                    'price' => $retailPrice,
                    'regular_price' => $variationPrice,
                    'currency' => $supplierProduct->metadata['currency'] ?? $product->currency,
                ];
            })
            ->values();
        $defaultVariationId = $product->primarySupplierProduct?->external_sku
            ?? ($variations->first()['variation_id'] ?? null);
        $priceRange = $product->metadata['price_range'] ?? [
            'min' => $this->pricing->retailPrice($product->price),
            'max' => $this->pricing->retailPrice($product->price),
        ];
        $regularRetailPrice = (float) $product->price > 0 ? $this->pricing->retailPrice($product->price) : 0;
        $visibleRetailPrice = $regularRetailPrice;

        if ($visibleRetailPrice <= 0 && $variations->isNotEmpty()) {
            $visibleRetailPrice = (float) $variations->pluck('price')->filter(fn ($price) => (float) $price > 0)->min();
        }

        $visibleRetailPrice = $this->promoPrice($product, $visibleRetailPrice);
        $promotion = $this->activePromotion($product);
        $regularPriceRange = $priceRange;

        if ($promotion) {
            $priceRange = [
                'min' => $this->promoPrice($product, (float) ($priceRange['min'] ?? 0)),
                'max' => $this->promoPrice($product, (float) ($priceRange['max'] ?? 0)),
            ];
        }

        return [
            'id' => $product->id,
            'name' => $product->name,
            'game' => $product->game,
            'sku' => $this->publicProductReference($product),
            'public_reference' => $this->publicProductReference($product),
            'price' => $visibleRetailPrice,
            'regular_price' => $regularRetailPrice,
            'currency' => $product->currency,
            'image_url' => $product->metadata['image_url'] ?? $product->metadata['raw']['image'] ?? null,
            'description' => $product->metadata['description'] ?? null,
            'delivery' => $product->metadata['delivery'] ?? 'automatic',
            'requires_uid' => (bool) ($product->metadata['requires_uid'] ?? true),
            'required_fields' => $product->metadata['required_fields'] ?? [],
            'amounts' => $product->metadata['amounts'] ?? $variations->pluck('name')->all(),
            'variations' => $variations,
            'category' => $product->metadata['category'] ?? $product->game,
            'type' => $product->metadata['type'] ?? 'top-up',
            'price_range' => $priceRange,
            'regular_price_range' => $regularPriceRange,
            'permalink' => $product->metadata['permalink'] ?? null,
            'supplier' => 'Astral4gamer',
            'variation_id' => $defaultVariationId,
            'promotion' => $promotion,
        ];
    }

    private function publicProductReference(Product $product): string
    {
        $type = match ($product->metadata['type'] ?? 'top-up') {
            'gift-card', 'gift-cards' => 'giftcard',
            'game-key', 'game-keys' => 'gamekey',
            default => 'topup',
        };

        $base = str($product->name ?: $product->game ?: 'product-'.$product->id)
            ->ascii()
            ->lower()
            ->replaceMatches('/&/', ' and ')
            ->replaceMatches('/[^a-z0-9]+/', '_')
            ->trim('_')
            ->toString();

        return 'Astral4gamer-'.$type.'-'.($base ?: 'product_'.$product->id);
    }

    private function selectedSupplierProduct(Product $product, ?string $variationId): ?SupplierProduct
    {
        $activeSupplierProducts = $product->supplierProducts->where('active', true);

        if ($variationId) {
            $selected = $activeSupplierProducts->firstWhere('external_sku', $variationId);

            if ($selected) {
                return $selected;
            }
        }

        return $activeSupplierProducts->sortBy('cost')->first();
    }

    private function supplierFields(Product $product, array $data): array
    {
        $fields = collect($product->metadata['required_fields'] ?? [])
            ->pluck('key')
            ->filter()
            ->values();
        $provided = collect($data['supplier_fields'] ?? [])
            ->filter(fn ($value) => $value !== null && $value !== '')
            ->all();

        if ($fields->isEmpty()) {
            return $provided;
        }

        $fallback = $data['game_uid'] ?? null;

        return $fields
            ->mapWithKeys(fn (string $key) => [$key => $provided[$key] ?? $fallback])
            ->filter(fn ($value) => $value !== null && $value !== '')
            ->all();
    }

    private function activePromotion(Product $product): ?array
    {
        $promo = $product->metadata['promo'] ?? null;

        if (! is_array($promo) || empty($promo['active'])) {
            return null;
        }

        if (! empty($promo['expires_at']) && now()->greaterThan($promo['expires_at'])) {
            return null;
        }

        return [
            'active' => true,
            'discount_percent' => (float) ($promo['discount_percent'] ?? 0),
            'starts_at' => $promo['starts_at'] ?? null,
            'expires_at' => $promo['expires_at'] ?? null,
            'label' => $promo['label'] ?? 'Promotion 24h',
        ];
    }

    private function promoPrice(Product $product, float|int $price): float
    {
        $price = (float) $price;
        $promotion = $this->activePromotion($product);

        if (! $promotion || $price <= 0) {
            return $price;
        }

        $discount = min(95, max(0, (float) $promotion['discount_percent']));

        return round($price * (1 - ($discount / 100)), (int) config('services.shop.price_decimals', 2));
    }
}
