<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\DispatchSupplierOrder;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\SupplierOrder;
use App\Models\SupplierProduct;
use App\Models\Tournament;
use App\Services\FreeFire\FreeFireLookupService;
use App\Services\Shop\PricingService;
use App\Services\Suppliers\FazerCardsCatalogSyncService;
use App\Services\Suppliers\FazerCardsGateway;
use App\Services\Suppliers\Item4GamerCatalogSyncService;
use App\Services\Suppliers\SupplierManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ShopController extends Controller
{
    private const HIDDEN_PUBLIC_TYPES = [];
    private const FIRST_PURCHASE_PAID_STATUSES = ['paid', 'completed', 'delivered'];

    public function __construct(private readonly PricingService $pricing)
    {
    }

    public function home()
    {
        return [
            'products' => $this->publicCatalogQuery()->limit(8)->get(),
            'tournaments' => Tournament::latest('starts_at')->limit(6)->get(),
        ];
    }

    public function products(Request $request)
    {
        $query = $this->publicCatalogQuery()
            ->with('primarySupplierProduct')
            ->latest();

        if ($search = $request->query('q')) {
            $terms = collect(preg_split('/\s+/', trim((string) $search)) ?: [])
                ->map(fn ($term) => trim((string) $term))
                ->filter()
                ->take(6)
                ->values();

            $query->where(function ($builder) use ($search, $terms) {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('game', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('metadata->category', 'like', "%{$search}%")
                    ->orWhere('metadata->type', 'like', "%{$search}%")
                    ->orWhere('metadata->description', 'like', "%{$search}%");

                foreach ($terms as $term) {
                    $builder->orWhere(function ($nested) use ($term) {
                        $nested->where('name', 'like', "%{$term}%")
                            ->orWhere('game', 'like', "%{$term}%")
                            ->orWhere('sku', 'like', "%{$term}%")
                            ->orWhere('metadata->category', 'like', "%{$term}%")
                            ->orWhere('metadata->type', 'like', "%{$term}%")
                            ->orWhere('metadata->description', 'like', "%{$term}%");
                    });
                }
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

    public function product(string $product)
    {
        return $this->productPayload($product);
    }

    public function customerProduct(Request $request, string $product)
    {
        return $this->productPayload($product, $request->user()?->id);
    }

    private function productPayload(string $product, ?int $userId = null): array
    {
        $product = $this->resolvePublicProduct($product);

        abort_unless($product->active && ! $this->isHiddenPublicType($product), 404);

        return [
            'data' => $this->serializeProduct($product->load(['primarySupplierProduct', 'supplierProducts']), $userId),
            'recommended' => $this->publicCatalogQuery()
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
        $products = $this->publicCatalogQuery()
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
                    'image_url' => $first->metadata['image_url'] ?? $first->metadata['raw']['image'] ?? null,
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

    public function order(Request $request, SupplierManager $suppliers)
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
        $checkoutPricing = $this->resolveCheckoutPricing($product, $data['variation_id'] ?? null, $request->user()->id);
        $manualVariation = $checkoutPricing['manual_variation'];
        $supplierProduct = $checkoutPricing['supplier_product'];
        $publicVariation = $checkoutPricing['public_variation'];
        $supplierCost = $checkoutPricing['supplier_cost'];
        $unitPrice = $checkoutPricing['unit_price'];
        $unitCurrency = $checkoutPricing['currency'];
        $playerVerification = $this->verifyCheckoutPlayer($product, $supplierProduct, $data, $suppliers);

        $order = Order::create([
            'product_id' => $data['product_id'],
            'game_uid' => $data['game_uid'],
            'nickname' => $data['nickname'],
            'user_id' => $request->user()->id,
            'amount' => $unitPrice * $quantity,
            'currency' => $unitCurrency,
            'status' => 'pending_payment',
            'metadata' => [
                'variation_id' => $manualVariation['variation_id'] ?? $supplierProduct?->external_sku ?? ($publicVariation['variation_id'] ?? null),
                'variation_name' => $manualVariation['name'] ?? $supplierProduct?->metadata['name'] ?? ($publicVariation['name'] ?? null),
                'supplier' => $product->metadata['supplier'] ?? 'manual',
                'quantity' => $quantity,
                'supplier_cost' => $supplierCost,
                'base_unit_price' => $checkoutPricing['base_unit_price'],
                'regular_unit_price' => $checkoutPricing['regular_unit_price'],
                'margin_amount' => $unitPrice - $supplierCost,
                'nexy_benefit_credit_xof' => $checkoutPricing['nexy_benefit_credit_xof'],
                'display_unit_price' => $unitPrice,
                'display_currency' => $unitCurrency,
                'promotion' => $this->activePromotion($product),
                'first_purchase_discount' => $checkoutPricing['first_purchase_discount'],
                'manual_fulfillment' => (bool) ($product->metadata['manual_fulfillment'] ?? false),
                'fulfillment_status' => (bool) ($product->metadata['manual_fulfillment'] ?? false) ? 'awaiting_payment' : null,
                'required_fields' => $product->metadata['required_fields'] ?? [],
                'supplier_fields' => $this->supplierFields($product, $data),
                'player_verification' => $playerVerification,
            ],
        ]);

        DispatchSupplierOrder::dispatchIf($order->status === 'paid', $order);

        return response()->json($order, 201);
    }

    public function guestOrder(Request $request, SupplierManager $suppliers)
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
        $checkoutPricing = $this->resolveCheckoutPricing($product, $data['variation_id'] ?? null);
        $manualVariation = $checkoutPricing['manual_variation'];
        $supplierProduct = $checkoutPricing['supplier_product'];
        $publicVariation = $checkoutPricing['public_variation'];
        $supplierCost = $checkoutPricing['supplier_cost'];
        $unitPrice = $checkoutPricing['unit_price'];
        $unitCurrency = $checkoutPricing['currency'];
        $playerVerification = $this->verifyCheckoutPlayer($product, $supplierProduct, $data, $suppliers);

        $order = Order::create([
            'product_id' => $product->id,
            'game_uid' => $data['game_uid'],
            'nickname' => $data['nickname'],
            'amount' => $unitPrice * $quantity,
            'currency' => $unitCurrency,
            'status' => 'pending_payment',
            'metadata' => [
                'variation_id' => $manualVariation['variation_id'] ?? $supplierProduct?->external_sku ?? ($publicVariation['variation_id'] ?? null),
                'variation_name' => $manualVariation['name'] ?? $supplierProduct?->metadata['name'] ?? ($publicVariation['name'] ?? null),
                'supplier' => $product->metadata['supplier'] ?? 'manual',
                'checkout_mode' => 'guest',
                'payment_pending' => true,
                'quantity' => $quantity,
                'supplier_cost' => $supplierCost,
                'base_unit_price' => $checkoutPricing['base_unit_price'],
                'regular_unit_price' => $checkoutPricing['regular_unit_price'],
                'margin_amount' => $unitPrice - $supplierCost,
                'nexy_benefit_credit_xof' => $checkoutPricing['nexy_benefit_credit_xof'],
                'display_unit_price' => $unitPrice,
                'display_currency' => $unitCurrency,
                'promotion' => $this->activePromotion($product),
                'manual_fulfillment' => (bool) ($product->metadata['manual_fulfillment'] ?? false),
                'fulfillment_status' => (bool) ($product->metadata['manual_fulfillment'] ?? false) ? 'awaiting_payment' : null,
                'required_fields' => $product->metadata['required_fields'] ?? [],
                'supplier_fields' => $this->supplierFields($product, $data),
                'player_verification' => $playerVerification,
            ],
        ]);

        return response()->json([
            'order' => $order,
            'next_step' => 'payment_provider_to_integrate',
        ], 201);
    }

    public function orderDelivery(Request $request, Order $order)
    {
        $reference = trim((string) ($request->query('payment_reference') ?: $request->query('paymentId')));

        abort_if($reference === '', 404, 'Commande introuvable.');
        abort_unless(
            Payment::query()->where('order_id', $order->id)->where('reference', $reference)->exists(),
            404,
            'Commande introuvable.'
        );

        $order->refresh();
        $supplierOrder = SupplierOrder::query()
            ->where('order_id', $order->id)
            ->latest()
            ->first();

        return response()->json([
            'order' => [
                'id' => $order->id,
                'status' => $order->status,
                'fulfillment_status' => $order->metadata['fulfillment_status'] ?? null,
                'product_id' => $order->product_id,
                'amount' => $order->amount,
                'currency' => $order->currency,
            ],
            'supplier_order' => $supplierOrder ? [
                'external_id' => $supplierOrder->external_id,
                'status' => $supplierOrder->status,
            ] : null,
            'delivery_codes' => $order->metadata['delivery_codes'] ?? [],
        ]);
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

    private function resolveCheckoutPricing(Product $product, ?string $variationId, ?int $userId = null): array
    {
        $publicVariation = $this->selectedPublicVariation($product, $variationId, $userId);
        $selectedVariationId = (string) ($publicVariation['variation_id'] ?? $variationId ?? '');
        $manualVariation = $this->selectedManualVariation($product, $selectedVariationId ?: $variationId);
        $supplierProduct = $manualVariation ? null : $this->selectedSupplierProduct($product, $selectedVariationId ?: $variationId);
        $supplierCost = $manualVariation
            ? (float) ($manualVariation['astral_base_price'] ?? $manualVariation['base_price'] ?? $manualVariation['price'] ?? 0)
            : (float) ($supplierProduct?->cost ?: $product->price);
        $unitPrice = (float) ($publicVariation['price'] ?? 0);
        $firstPurchaseDiscount = $publicVariation['first_purchase_discount'] ?? null;

        if ($unitPrice <= 0) {
            $unitPrice = $manualVariation
                ? (float) ($manualVariation['price'] ?? 0)
                : $this->promoPrice($product, $this->pricing->retailPrice($supplierCost));
            $discounted = $this->firstPurchasePrice($product, $unitPrice, $supplierCost, $userId);
            $unitPrice = $discounted['price'];
            $firstPurchaseDiscount = $discounted['discount'];
        }

        return [
            'public_variation' => $publicVariation,
            'manual_variation' => $manualVariation,
            'supplier_product' => $supplierProduct,
            'supplier_cost' => $supplierCost,
            'base_unit_price' => $supplierCost,
            'unit_price' => round($unitPrice, 2),
            'regular_unit_price' => round((float) ($publicVariation['regular_price'] ?? $unitPrice), 2),
            'first_purchase_discount' => $firstPurchaseDiscount,
            'currency' => (string) ($publicVariation['currency'] ?? $product->currency),
            'nexy_benefit_credit_xof' => (int) ($manualVariation['nexy_benefit_credit_xof'] ?? 0),
        ];
    }

    private function selectedPublicVariation(Product $product, ?string $variationId, ?int $userId = null): ?array
    {
        $variations = collect($this->serializeProduct($product, $userId)['variations'] ?? []);

        if ($variations->isEmpty()) {
            return null;
        }

        if ($variationId) {
            $selected = $variations->first(fn ($variation) => (string) ($variation['variation_id'] ?? '') === (string) $variationId
                || (string) ($variation['id'] ?? '') === (string) $variationId);

            if ($selected) {
                return $selected;
            }
        }

        return $variations->first();
    }

    private function serializeProduct(Product $product, ?int $userId = null): array
    {
        $product->loadMissing('supplierProducts');
        $manualVariations = $this->manualVariations($product, $userId);
        $variations = $manualVariations->isNotEmpty()
            ? $manualVariations
            : $product->supplierProducts
            ->where('active', true)
            ->sortBy('cost')
            ->map(function (SupplierProduct $supplierProduct) use ($product, $userId) {
                $priceOverride = $this->publicVariationPriceOverride($product, (string) $supplierProduct->external_sku);
                $variationPrice = 0;

                if ($priceOverride) {
                    $variationPrice = (float) $priceOverride['price'];
                } elseif ((float) $supplierProduct->cost > 0) {
                    $variationPrice = $this->pricing->retailPrice($supplierProduct->cost);
                }

                if ($variationPrice <= 0 && (float) $product->price > 0) {
                    $variationPrice = $this->pricing->retailPrice($product->price);
                }

                if ($variationPrice <= 0) {
                    $variationPrice = (float) ($supplierProduct->metadata['retail_price'] ?? 0);
                }

                $retailPrice = $priceOverride ? $variationPrice : $this->promoPrice($product, $variationPrice);
                $discounted = $this->firstPurchasePrice($product, $retailPrice, (float) $supplierProduct->cost, $userId);

                return [
                    'id' => $supplierProduct->id,
                    'variation_id' => (string) $supplierProduct->external_sku,
                    'name' => $supplierProduct->metadata['name'] ?? $product->name,
                    'price' => $discounted['price'],
                    'regular_price' => $retailPrice,
                    'first_purchase_discount' => $discounted['discount'],
                    'currency' => $priceOverride['currency'] ?? $supplierProduct->metadata['currency'] ?? $product->currency,
                ];
            })
            ->values();
        $defaultVariationId = $product->primarySupplierProduct?->external_sku
            ?? ($variations->first()['variation_id'] ?? null);
        $variationRetailPrices = $variations->pluck('regular_price')
            ->filter(fn ($price) => (float) $price > 0)
            ->values();
        $priceRange = $variationRetailPrices->isNotEmpty()
            ? [
                'min' => (float) $variationRetailPrices->min(),
                'max' => (float) $variationRetailPrices->max(),
            ]
            : [
                'min' => $manualVariations->isNotEmpty() ? (float) $product->price : $this->pricing->retailPrice($product->price),
                'max' => $manualVariations->isNotEmpty() ? (float) $product->price : $this->pricing->retailPrice($product->price),
            ];
        $regularRetailPrice = (float) $product->price > 0
            ? ($manualVariations->isNotEmpty() ? (float) $product->price : $this->pricing->retailPrice($product->price))
            : 0;
        $visibleRetailPrice = $regularRetailPrice;

        if ($visibleRetailPrice <= 0 && $variations->isNotEmpty()) {
            $visibleRetailPrice = (float) $variations->pluck('price')->filter(fn ($price) => (float) $price > 0)->min();
        }

        $visibleRetailPrice = $this->promoPrice($product, $visibleRetailPrice);
        $productDiscounted = $this->firstPurchasePrice($product, $visibleRetailPrice, (float) $product->price, $userId);
        $visibleRetailPrice = $productDiscounted['price'];
        $promotion = $this->activePromotion($product);
        $regularPriceRange = $priceRange;

        if ($promotion) {
            $priceRange = [
                'min' => $this->promoPrice($product, (float) ($priceRange['min'] ?? 0)),
                'max' => $this->promoPrice($product, (float) ($priceRange['max'] ?? 0)),
            ];
        }

        if ($this->userCanUseFirstPurchaseDiscount($userId)) {
            $discountedPrices = $variations
                ->pluck('price')
                ->filter(fn ($price) => (float) $price > 0)
                ->values();

            if ($discountedPrices->isNotEmpty()) {
                $priceRange = [
                    'min' => (float) $discountedPrices->min(),
                    'max' => (float) $discountedPrices->max(),
                ];
            }
        }

        return [
            'id' => $product->id,
            'name' => $product->name,
            'name_fr' => $product->metadata['name_fr'] ?? null,
            'name_en' => $product->metadata['name_en'] ?? null,
            'names' => $product->metadata['names'] ?? null,
            'game' => $product->game,
            'sku' => $this->publicProductReference($product),
            'public_reference' => $this->publicProductReference($product),
            'price' => $visibleRetailPrice,
            'regular_price' => $regularRetailPrice,
            'currency' => $product->currency,
            'image_url' => $product->metadata['image_url'] ?? $product->metadata['raw']['image'] ?? null,
            'description' => $product->metadata['description'] ?? null,
            'description_fr' => $product->metadata['description_fr'] ?? ($product->metadata['descriptions']['fr'] ?? null),
            'description_en' => $product->metadata['description_en'] ?? ($product->metadata['descriptions']['en'] ?? null),
            'descriptions' => $product->metadata['descriptions'] ?? null,
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
            'first_purchase_discount' => $productDiscounted['discount'],
        ];
    }

    private function publicProductReference(Product $product): string
    {
        $metadataReference = trim((string) ($product->metadata['public_reference'] ?? ''));

        if ($metadataReference !== '') {
            return $metadataReference;
        }

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

    private function publicVariationPriceOverride(Product $product, string $variationId): ?array
    {
        $override = $product->metadata['public_variation_prices'][$variationId]
            ?? $product->metadata['nexy_display_prices'][$variationId]
            ?? null;

        if (is_numeric($override)) {
            return ['price' => round((float) $override, 2), 'currency' => $product->currency];
        }

        if (! is_array($override) || ! isset($override['price']) || ! is_numeric($override['price'])) {
            return null;
        }

        return [
            'price' => round((float) $override['price'], 2),
            'currency' => strtoupper((string) ($override['currency'] ?? $product->currency)),
        ];
    }

    private function selectedManualVariation(Product $product, ?string $variationId): ?array
    {
        $variations = $this->manualVariations($product);

        if ($variations->isEmpty()) {
            return null;
        }

        if ($variationId) {
            $selected = $variations->firstWhere('variation_id', $variationId);

            if ($selected) {
                return $selected;
            }
        }

        return $variations->first();
    }

    private function manualVariations(Product $product, ?int $userId = null)
    {
        return collect($product->metadata['manual_variations'] ?? [])
            ->filter(fn ($item) => is_array($item) && ! empty($item['variation_id']) && ! empty($item['name']))
            ->map(function (array $item, int $index) use ($product, $userId) {
                $regularPrice = round((float) ($item['price'] ?? 0), 2);
                $basePrice = round((float) ($item['astral_base_price'] ?? $item['base_price'] ?? $item['price'] ?? 0), 2);
                $discounted = $this->firstPurchasePrice($product, $regularPrice, $basePrice, $userId);

                return [
                    'id' => 'manual-'.$product->id.'-'.$index,
                    'variation_id' => (string) $item['variation_id'],
                    'name' => (string) $item['name'],
                    'name_fr' => $item['name_fr'] ?? null,
                    'name_en' => $item['name_en'] ?? null,
                    'names' => $item['names'] ?? null,
                    'price' => $discounted['price'],
                    'regular_price' => $regularPrice,
                    'first_purchase_discount' => $discounted['discount'],
                    'currency' => (string) ($item['currency'] ?? $product->currency),
                    'astral_base_price' => $basePrice,
                    'nexy_benefit_credit_xof' => (int) ($item['nexy_benefit_credit_xof'] ?? 0),
                ];
            })
            ->sortBy('price')
            ->values();
    }

    private function userCanUseFirstPurchaseDiscount(?int $userId): bool
    {
        if (! $userId) {
            return false;
        }

        return ! Order::query()
            ->where('user_id', $userId)
            ->where(function (Builder $builder) {
                $builder->whereIn('status', self::FIRST_PURCHASE_PAID_STATUSES)
                    ->orWhere(function (Builder $pending) {
                        $pending->where('status', 'pending_payment')
                            ->whereNotNull('metadata->first_purchase_discount');
                    });
            })
            ->exists();
    }

    private function firstPurchasePrice(Product $product, float $price, float $supplierCost, ?int $userId): array
    {
        $price = round(max(0, $price), (int) config('services.shop.price_decimals', 2));

        if (! $this->userCanUseFirstPurchaseDiscount($userId) || $price <= 0 || $supplierCost <= 0) {
            return ['price' => $price, 'discount' => null];
        }

        $maxRequestedPercent = (float) config('services.shop.first_purchase_discount_percent', 5);
        $minimumProfit = (float) config('services.shop.first_purchase_discount_min_profit', 0.01);
        $safeMinimumPrice = $supplierCost + max(0.01, $minimumProfit);

        if ($price <= $safeMinimumPrice) {
            return ['price' => $price, 'discount' => null];
        }

        $safePercent = (($price - $safeMinimumPrice) / $price) * 100;
        $discountPercent = floor(min($maxRequestedPercent, $safePercent) * 100) / 100;

        if ($discountPercent <= 0) {
            return ['price' => $price, 'discount' => null];
        }

        $discountedPrice = round($price * (1 - ($discountPercent / 100)), (int) config('services.shop.price_decimals', 2));

        if ($discountedPrice <= $supplierCost) {
            $discountedPrice = round($supplierCost + $minimumProfit, (int) config('services.shop.price_decimals', 2));
        }

        if ($discountedPrice >= $price) {
            return ['price' => $price, 'discount' => null];
        }

        return [
            'price' => $discountedPrice,
            'discount' => [
                'active' => true,
                'type' => 'first_purchase',
                'discount_percent' => $discountPercent,
                'label' => 'Offre premier achat',
                'original_price' => $price,
                'discounted_price' => $discountedPrice,
                'minimum_profit' => $minimumProfit,
            ],
        ];
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

    private function verifyCheckoutPlayer(Product $product, ?SupplierProduct $supplierProduct, array $data, SupplierManager $suppliers): ?array
    {
        if (($product->metadata['validation_provider'] ?? null) === 'free_fire') {
            return $this->verifyManualFreeFirePlayer($product, $data);
        }

        $variationId = (string) ($supplierProduct?->external_sku ?? $data['variation_id'] ?? '');
        $categoryId = FazerCardsGateway::decodedTopupCategory($variationId);

        if (! $categoryId || ! $this->requiresCheckoutPlayerValidation($categoryId)) {
            return null;
        }

        $supplier = Supplier::query()->where('slug', 'fazercards')->whereActive(true)->first();
        abort_unless($supplier, 503, 'Service de vérification joueur indisponible.');

        $gateway = $suppliers->gateway($supplier);
        abort_unless($gateway instanceof FazerCardsGateway, 503, 'Service de vérification joueur indisponible.');

        $fields = $this->supplierFields($product, $data);
        $gameUid = trim((string) ($data['game_uid'] ?? ''));

        if ($gameUid !== '') {
            $fields += [
                'player_id' => $gameUid,
                'user_id' => $gameUid,
                'uid' => $gameUid,
                'account_id' => $gameUid,
            ];
        }

        try {
            $validation = $gateway->validateTopupSku($variationId, $fields);
        } catch (\Throwable $exception) {
            if ($this->isSupplierValidationUnavailable($exception) && $this->hasValidRequiredCheckoutFields($categoryId, $fields, $gameUid)) {
                return [
                    'source' => 'format_validation',
                    'category_id' => $categoryId,
                    'verified_at' => now()->toIso8601String(),
                    'nickname' => $data['nickname'] ?? $gameUid,
                    'response' => ['validation' => 'supplier_unavailable_format_checked'],
                ];
            }

            abort(422, 'ID joueur invalide ou introuvable pour ce produit. Vérifie les informations du compte avant de payer.');
        }

        abort_unless($this->isSuccessfulTopupValidation($validation), 422, $validation['message'] ?? $validation['error'] ?? 'ID joueur invalide ou introuvable pour ce produit.');

        return [
            'source' => 'fazercards',
            'category_id' => $categoryId,
            'verified_at' => now()->toIso8601String(),
            'nickname' => $validation['nickname'] ?? $validation['username'] ?? data_get($validation, 'data.nickname') ?? data_get($validation, 'data.username') ?? null,
            'response' => $validation,
        ];
    }

    private function requiresCheckoutPlayerValidation(string $categoryId): bool
    {
        return preg_match('/^(genshin_impact|pubg_|mobile_legends)/', $categoryId) === 1;
    }

    private function isSuccessfulTopupValidation(array $validation): bool
    {
        foreach (['valid', 'verified', 'success', 'data.valid', 'data.verified', 'data.success'] as $key) {
            $value = data_get($validation, $key);

            if ($value !== null) {
                return (bool) $value;
            }
        }

        if (array_key_exists('ok', $validation)) {
            return (bool) $validation['ok'];
        }

        return true;
    }

    private function verifyManualFreeFirePlayer(Product $product, array $data): array
    {
        $fields = $this->supplierFields($product, $data);
        $gameUid = trim((string) ($data['game_uid'] ?? $fields['player_id'] ?? $fields['uid'] ?? ''));
        $region = trim((string) ($fields['region'] ?? $product->metadata['default_region'] ?? config('services.freefire.lookup.default_region', 'me')));

        abort_if($gameUid === '', 422, 'ID Free Fire requis.');
        abort_if($region === '', 422, 'Region Free Fire requise.');

        try {
            return app(FreeFireLookupService::class)->validateUid($gameUid, $region);
        } catch (\Throwable) {
            abort(422, 'ID Free Fire incorrect ou verification indisponible.');
        }
    }

    private function isSupplierValidationUnavailable(\Throwable $exception): bool
    {
        return str_contains($exception->getMessage(), 'ID validation is not available');
    }

    private function hasValidRequiredCheckoutFields(string $categoryId, array $fields, string $gameUid): bool
    {
        $playerId = trim((string) ($fields['player_id'] ?? $fields['user_id'] ?? $fields['uid'] ?? $fields['account_id'] ?? $gameUid));

        if ($playerId === '') {
            return false;
        }

        if (str_starts_with($categoryId, 'genshin_impact')) {
            return preg_match('/^\d{6,12}$/', $playerId) === 1 && trim((string) ($fields['server'] ?? '')) !== '';
        }

        if (str_starts_with($categoryId, 'mobile_legends')) {
            return preg_match('/^\d{4,20}$/', $playerId) === 1 && preg_match('/^\d{1,10}$/', (string) ($fields['server_id'] ?? '')) === 1;
        }

        if (str_starts_with($categoryId, 'pubg_')) {
            return preg_match('/^[A-Za-z0-9_\-]{5,40}$/', $playerId) === 1;
        }

        return true;
    }

    private function resolvePublicProduct(string $value): Product
    {
        if (ctype_digit($value)) {
            return Product::findOrFail((int) $value);
        }

        return Product::query()
            ->where(function (Builder $builder) use ($value) {
                $builder->where('sku', $value)
                    ->orWhere('metadata->permalink', $value);
            })
            ->firstOrFail();
    }

    private function publicCatalogQuery(): Builder
    {
        return Product::query()
            ->whereActive(true)
            ->where('price', '>', 0)
            ->where(function (Builder $builder) {
                $builder->whereNull('metadata->type')
                    ->orWhereNotIn('metadata->type', self::HIDDEN_PUBLIC_TYPES);
            });
    }

    private function isHiddenPublicType(Product $product): bool
    {
        return in_array((string) ($product->metadata['type'] ?? 'top-up'), self::HIDDEN_PUBLIC_TYPES, true);
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
