<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\DispatchSupplierOrder;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PartnershipRequest;
use App\Models\Product;
use App\Models\ResellerApiKey;
use App\Models\ResellerOrder;
use App\Models\ResellerPartner;
use App\Models\ResellerWalletTransaction;
use App\Models\SupplierProduct;
use App\Services\Payments\PaymentManager;
use App\Services\Reseller\ResellerWalletService;
use App\Services\Shop\PricingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ResellerApiController extends Controller
{
    public function __construct(private readonly PricingService $pricing)
    {
    }

    public function categories()
    {
        return [
            'data' => [[
                'slug' => 'free-fire',
                'name' => 'Free Fire',
                'products_count' => $this->freeFireProducts()->count(),
            ]],
        ];
    }

    public function products(Request $request)
    {
        $query = $this->freeFireProducts()->with('supplierProducts');

        if ($search = trim((string) $request->query('q', ''))) {
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('game', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        $perPage = min(max((int) $request->integer('per_page', 50), 1), 200);

        return $query->latest()
            ->paginate($perPage)
            ->through(fn (Product $product) => $this->serializeProduct($product, $this->partner($request)));
    }

    public function product(Request $request, Product $product)
    {
        abort_unless($this->isFreeFireProduct($product) && $product->active, 404);

        return ['data' => $this->serializeProduct($product->load('supplierProducts'), $this->partner($request))];
    }

    public function balance(Request $request, ResellerWalletService $wallets)
    {
        $partner = $this->partner($request);
        $wallet = $wallets->ensureWallet($partner);

        return [
            'data' => [
                'status' => 200,
                'balance' => (float) $wallet->balance,
                'currency' => $wallet->currency,
                'minimum_topup' => (float) $partner->minimum_topup,
                'low_balance_threshold' => (float) $partner->low_balance_threshold,
            ],
        ];
    }

    public function panelOverview(Request $request, ResellerWalletService $wallets)
    {
        $partner = $this->partner($request)->loadMissing('wallet');
        $wallet = $wallets->ensureWallet($partner);
        $now = now();
        $startOfDay = $now->copy()->startOfDay();
        $startOfMonth = $now->copy()->startOfMonth();

        $ordersToday = ResellerOrder::query()
            ->where('reseller_partner_id', $partner->id)
            ->where('created_at', '>=', $startOfDay)
            ->count();

        $ordersThisMonth = ResellerOrder::query()
            ->where('reseller_partner_id', $partner->id)
            ->where('created_at', '>=', $startOfMonth)
            ->count();

        $successfulOrders = ResellerOrder::query()
            ->where('reseller_partner_id', $partner->id)
            ->where('created_at', '>=', $startOfMonth)
            ->whereIn('status', ['accepted', 'processing', 'completed', 'success', 'paid'])
            ->count();

        $failedOrders = ResellerOrder::query()
            ->where('reseller_partner_id', $partner->id)
            ->where('created_at', '>=', $startOfMonth)
            ->whereIn('status', ['failed', 'cancelled', 'refused'])
            ->count();

        $resolvedOrders = $successfulOrders + $failedOrders;
        $successRate = $resolvedOrders > 0
            ? round(($successfulOrders / $resolvedOrders) * 100, 1)
            : null;

        $recentOrders = ResellerOrder::query()
            ->with('product')
            ->where('reseller_partner_id', $partner->id)
            ->latest()
            ->limit(20)
            ->get();

        $recentTransactions = ResellerWalletTransaction::query()
            ->where('reseller_partner_id', $partner->id)
            ->latest()
            ->limit(20)
            ->get();

        $liveKey = ResellerApiKey::query()
            ->where('reseller_partner_id', $partner->id)
            ->where('type', 'api')
            ->latest()
            ->first();
        $partnershipLiveKey = $this->partnershipLiveKey($partner);

        return response()->json([
            'partner' => [
                'id' => $partner->id,
                'name' => $partner->name,
                'company_name' => $partner->company_name,
                'email' => $partner->email,
                'status' => $partner->status,
                'allowed_scope' => $partner->allowed_scope,
                'allowed_games' => $partner->metadata['allowed_games'] ?? [],
                'margin_percent' => (float) $partner->margin_percent,
                'minimum_topup' => (float) $partner->minimum_topup,
                'low_balance_threshold' => (float) $partner->low_balance_threshold,
                'wallet' => [
                    'balance' => (float) $wallet->balance,
                    'currency' => $wallet->currency,
                ],
            ],
            'api_keys' => [
                'sandbox' => [
                    'name' => 'Sandbox API key',
                    'key' => $this->sandboxKey($partner),
                    'shareable_for_integration' => true,
                    'production_only' => false,
                ],
                'live' => $liveKey ? [
                    'name' => $liveKey->name,
                    'key' => $partnershipLiveKey,
                    'prefix' => $liveKey->prefix,
                    'active' => (bool) $liveKey->active,
                    'last_used_at' => optional($liveKey->last_used_at)?->toIso8601String(),
                    'created_at' => optional($liveKey->created_at)?->toIso8601String(),
                    'expires_at' => optional($liveKey->expires_at)?->toIso8601String(),
                    'production_only' => true,
                    'recoverable' => $partnershipLiveKey !== null,
                    'source' => $partnershipLiveKey !== null ? 'partnership_approval' : 'reseller_api_key',
                ] : null,
            ],
            'stats' => [
                'orders_today' => $ordersToday,
                'orders_this_month' => $ordersThisMonth,
                'success_rate' => $successRate,
                'catalog_products' => $this->freeFireProducts()->count(),
                'wallet_balance' => (float) $wallet->balance,
                'topups_this_month' => (float) ResellerWalletTransaction::query()
                    ->where('reseller_partner_id', $partner->id)
                    ->where('type', 'credit')
                    ->where('created_at', '>=', $startOfMonth)
                    ->sum('amount'),
                'spend_this_month' => (float) ResellerWalletTransaction::query()
                    ->where('reseller_partner_id', $partner->id)
                    ->where('type', 'debit')
                    ->where('created_at', '>=', $startOfMonth)
                    ->sum('amount'),
            ],
            'recent_orders' => $recentOrders->map(fn (ResellerOrder $order) => $this->serializeResellerOrder($order))->values(),
            'recent_transactions' => $recentTransactions->map(fn (ResellerWalletTransaction $transaction) => $this->serializeWalletTransaction($transaction))->values(),
            'documentation' => [
                'base_url' => rtrim((string) config('app.url'), '/').'/api/reseller/v1',
                'panel_url' => (string) config('services.reseller.panel_url'),
                'endpoints' => [
                    ['method' => 'GET', 'path' => '/products', 'description' => 'Lister les produits disponibles'],
                    ['method' => 'GET', 'path' => '/get-balance', 'description' => 'Lire le solde partenaire'],
                    ['method' => 'POST', 'path' => '/order/add-order', 'description' => 'Créer une commande reseller'],
                    ['method' => 'GET', 'path' => '/order/get-order', 'description' => 'Lire le détail d\'une commande'],
                ],
            ],
        ]);
    }

    public function regenerateLiveKey(Request $request)
    {
        $partner = $this->partner($request);
        $plainKey = 'ag_live_'.Str::random(64);

        ResellerApiKey::query()
            ->where('reseller_partner_id', $partner->id)
            ->where('type', 'api')
            ->update(['active' => false]);

        $apiKey = ResellerApiKey::create([
            'reseller_partner_id' => $partner->id,
            'name' => 'Live API key',
            'prefix' => substr($plainKey, 0, 12),
            'key_hash' => hash('sha256', $plainKey),
            'type' => 'api',
            'active' => true,
        ]);

        $this->storePartnershipLiveKey($partner, $plainKey);

        return response()->json([
            'live_key' => [
                'key' => $plainKey,
                'prefix' => $apiKey->prefix,
                'name' => $apiKey->name,
                'created_at' => optional($apiKey->created_at)?->toIso8601String(),
                'warning' => 'Cette clé live est affichée une seule fois. Stockez-la côté serveur uniquement.',
            ],
        ], 201);
    }

    public function orders(Request $request)
    {
        $partner = $this->partner($request);
        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);

        return ResellerOrder::query()
            ->with('product')
            ->where('reseller_partner_id', $partner->id)
            ->latest()
            ->paginate($perPage)
            ->through(fn (ResellerOrder $order) => $this->serializeResellerOrder($order));
    }

    public function transactions(Request $request)
    {
        $partner = $this->partner($request);
        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);

        return ResellerWalletTransaction::query()
            ->where('reseller_partner_id', $partner->id)
            ->latest()
            ->paginate($perPage)
            ->through(fn (ResellerWalletTransaction $transaction) => $this->serializeWalletTransaction($transaction));
    }

    public function topup(Request $request, ResellerWalletService $wallets)
    {
        $partner = $this->partner($request);
        $wallet = $wallets->ensureWallet($partner);
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'customer.email' => ['required', 'email'],
            'customer.first_name' => ['required', 'string', 'max:120'],
            'customer.last_name' => ['required', 'string', 'max:120'],
            'customer.phone' => ['nullable', 'string', 'max:40'],
        ]);

        $currency = strtoupper((string) ($wallet->currency ?: config('services.payments.moneroo.default_currency', 'USD')));
        $amount = round((float) $data['amount'], 2);
        $minimumAmount = max((float) $partner->minimum_topup, $this->minimumMonerooTopupForCurrency($currency));
        abort_if($amount < $minimumAmount, 422, 'Recharge minimum Moneroo: '.$minimumAmount.' '.$currency.'.');

        $reference = $wallets->reference('A4G-RESELLER-TOPUP');
        $label = $partner->company_name ?: $partner->name;
        $checkout = (new PaymentManager('moneroo'))->initiate([
            'amount' => $amount,
            'currency' => $currency,
            'description' => 'Recharge reseller Astral4Gamer '.$label,
            'return_url' => config('services.payments.moneroo.return_url').'?reseller_topup='.$reference,
            'customer' => $data['customer'],
            'metadata' => [
                'type' => 'reseller_topup',
                'reseller_partner_id' => (string) $partner->id,
                'reference' => $reference,
            ],
        ]);

        abort_unless(! empty($checkout['checkout_url']) && ! empty($checkout['reference']), 422, 'Moneroo n’a pas renvoyé de lien de paiement.');

        $payment = Payment::create([
            'provider' => 'moneroo',
            'reference' => $checkout['reference'],
            'amount' => $amount,
            'currency' => $currency,
            'status' => 'initiated',
            'payload' => array_merge($checkout, [
                'metadata' => [
                    'type' => 'reseller_topup',
                    'reseller_partner_id' => $partner->id,
                    'reference' => $reference,
                ],
                'customer' => $data['customer'],
            ]),
        ]);

        return response()->json([
            'payment' => $payment,
            'checkout_url' => $checkout['checkout_url'],
        ], 201);
    }

    private function minimumMonerooTopupForCurrency(string $currency): float
    {
        return match (strtoupper($currency)) {
            'USD', 'XOF', 'XAF' => 100.0,
            default => 10.0,
        };
    }

    public function addOrder(Request $request, ResellerWalletService $wallets)
    {
        $partner = $this->partner($request);
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'variation_id' => ['nullable', 'string', 'max:255'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:20'],
            'partner_reference' => ['nullable', 'string', 'max:120'],
            'customer.first_name' => ['nullable', 'string', 'max:120'],
            'customer.last_name' => ['nullable', 'string', 'max:120'],
            'customer.email' => ['nullable', 'email'],
            'customer.phone' => ['nullable', 'string', 'max:40'],
            'data' => ['required', 'array'],
            'data.user_id' => ['nullable', 'string', 'max:120'],
            'data.player_id' => ['nullable', 'string', 'max:120'],
            'data.uid' => ['nullable', 'string', 'max:120'],
            'data.nickname' => ['nullable', 'string', 'max:120'],
            'data.player_name' => ['nullable', 'string', 'max:120'],
            'data.region' => ['nullable', 'string', 'max:80'],
        ]);

        $product = Product::with('supplierProducts')->findOrFail($data['product_id']);
        abort_unless($this->isFreeFireProduct($product) && $product->active, 404, 'Produit non autorisé pour ce partenaire.');

        $supplierProduct = $this->selectedSupplierProduct($product, $data['variation_id'] ?? null);
        abort_if(($data['variation_id'] ?? null) && ! $supplierProduct, 422, 'Variation invalide ou indisponible.');
        $supplierCost = (float) ($supplierProduct?->cost ?: $product->price);
        abort_if($supplierCost <= 0, 422, 'Produit indisponible.');

        $quantity = (int) ($data['quantity'] ?? 1);
        $unitPrice = $this->resellerPrice($partner, $supplierCost);
        $amount = round($unitPrice * $quantity, 2);
        $gameUid = (string) ($data['data']['player_id'] ?? $data['data']['user_id'] ?? $data['data']['uid'] ?? '');
        abort_if($gameUid === '', 422, 'ID joueur Free Fire requis.');
        $nickname = (string) ($data['data']['nickname'] ?? $data['data']['player_name'] ?? $gameUid);
        $reference = 'A4G-RS-'.now()->format('YmdHis').'-'.Str::upper(Str::random(6));

        $resellerOrder = DB::transaction(function () use ($partner, $wallets, $amount, $reference, $product, $supplierProduct, $supplierCost, $unitPrice, $quantity, $gameUid, $nickname, $data) {
            $wallets->debit($partner, $amount, $reference, [
                'product_id' => $product->id,
                'variation_id' => $supplierProduct?->external_sku,
            ]);

            $order = Order::create([
                'product_id' => $product->id,
                'game_uid' => $gameUid,
                'nickname' => $nickname,
                'amount' => $amount,
                'currency' => 'USD',
                'status' => 'paid',
                'metadata' => [
                    'source' => 'reseller_api',
                    'reseller_partner_id' => $partner->id,
                    'reseller_reference' => $reference,
                    'partner_reference' => $data['partner_reference'] ?? null,
                    'variation_id' => $supplierProduct?->external_sku,
                    'variation_name' => $supplierProduct?->metadata['name'] ?? null,
                    'supplier' => $product->metadata['supplier'] ?? 'fazercards',
                    'quantity' => $quantity,
                    'supplier_cost' => $supplierCost,
                    'unit_price' => $unitPrice,
                    'margin_amount' => $unitPrice - $supplierCost,
                    'customer' => $data['customer'] ?? [],
                    'supplier_fields' => $data['data'],
                ],
            ]);

            return ResellerOrder::create([
                'reseller_partner_id' => $partner->id,
                'order_id' => $order->id,
                'product_id' => $product->id,
                'supplier_product_id' => $supplierProduct?->id,
                'external_reference' => $reference,
                'partner_reference' => $data['partner_reference'] ?? null,
                'supplier_cost' => $supplierCost * $quantity,
                'amount' => $amount,
                'margin_amount' => ($unitPrice - $supplierCost) * $quantity,
                'currency' => 'USD',
                'status' => 'accepted',
                'request_payload' => $data,
                'response_payload' => ['order_id' => $order->id],
            ]);
        });

        DispatchSupplierOrder::dispatch($resellerOrder->order);

        return response()->json([
            'data' => [
                'status' => 200,
                'order_id' => $resellerOrder->external_reference,
                'astral_order_id' => $resellerOrder->order_id,
                'total' => (float) $resellerOrder->amount,
                'currency' => $resellerOrder->currency,
                'state' => $resellerOrder->status,
            ],
        ], 201);
    }

    public function getOrder(Request $request)
    {
        $partner = $this->partner($request);
        $data = $request->validate([
            'order_id' => ['required', 'string', 'max:120'],
        ]);

        $order = ResellerOrder::query()
            ->with(['order'])
            ->where('reseller_partner_id', $partner->id)
            ->where(function ($query) use ($data) {
                $query->where('external_reference', $data['order_id'])
                    ->orWhere('partner_reference', $data['order_id']);
            })
            ->firstOrFail();

        return [
            'data' => [
                'status' => 200,
                'order' => [
                    'id' => $order->external_reference,
                    'partner_reference' => $order->partner_reference,
                    'status' => $order->order?->status ?? $order->status,
                    'total' => (float) $order->amount,
                    'currency' => $order->currency,
                    'created_at' => $order->created_at?->toIso8601String(),
                ],
            ],
        ];
    }

    private function freeFireProducts()
    {
        return Product::query()
            ->whereActive(true)
            ->where('price', '>', 0)
            ->where(function ($query) {
                $query->where('name', 'like', '%free fire%')
                    ->orWhere('game', 'like', '%free fire%')
                    ->orWhere('metadata->category', 'like', '%free fire%')
                    ->orWhere('metadata->type', 'free_fire');
            });
    }

    private function isFreeFireProduct(Product $product): bool
    {
        $haystack = strtolower($product->name.' '.$product->game.' '.($product->metadata['category'] ?? '').' '.($product->metadata['type'] ?? ''));

        return str_contains($haystack, 'free fire') || str_contains($haystack, 'freefire');
    }

    private function serializeProduct(Product $product, ResellerPartner $partner): array
    {
        $product->loadMissing('supplierProducts');
        $variations = $product->supplierProducts
            ->where('active', true)
            ->sortBy('cost')
            ->map(fn (SupplierProduct $variation) => [
                'variation_id' => (string) $variation->external_sku,
                'name' => $variation->metadata['name'] ?? $product->name,
                'price' => $this->resellerPrice($partner, (float) $variation->cost),
                'currency' => 'USD',
                'required_fields' => $product->metadata['required_fields'] ?? ['player_id', 'region'],
            ])
            ->values();

        $fallbackPrice = $this->resellerPrice($partner, (float) $product->price);

        return [
            'id' => $product->id,
            'name' => $product->name,
            'category' => 'Free Fire',
            'sku' => 'astral4gamer-freefire-'.$product->id,
            'image_url' => $product->metadata['image_url'] ?? null,
            'description' => $product->metadata['description'] ?? null,
            'price' => $variations->pluck('price')->filter()->min() ?: $fallbackPrice,
            'currency' => 'USD',
            'requires_uid' => true,
            'required_fields' => $product->metadata['required_fields'] ?? ['player_id', 'region'],
            'variations' => $variations,
        ];
    }

    private function serializeResellerOrder(ResellerOrder $order): array
    {
        return [
            'id' => $order->id,
            'external_reference' => $order->external_reference,
            'partner_reference' => $order->partner_reference,
            'product_id' => $order->product_id,
            'product_name' => $order->product?->name,
            'status' => $order->order?->status ?? $order->status,
            'amount' => (float) $order->amount,
            'supplier_cost' => (float) $order->supplier_cost,
            'margin_amount' => (float) $order->margin_amount,
            'currency' => $order->currency,
            'created_at' => optional($order->created_at)?->toIso8601String(),
        ];
    }

    private function serializeWalletTransaction(ResellerWalletTransaction $transaction): array
    {
        return [
            'id' => $transaction->id,
            'type' => $transaction->type,
            'amount' => (float) $transaction->amount,
            'balance_after' => (float) $transaction->balance_after,
            'currency' => $transaction->currency,
            'reference' => $transaction->reference,
            'metadata' => $transaction->metadata ?? [],
            'created_at' => optional($transaction->created_at)?->toIso8601String(),
        ];
    }

    private function sandboxKey(ResellerPartner $partner): string
    {
        return 'ag_sandbox_'.substr(hash('sha256', 'partner:'.$partner->id.':'.$partner->email), 0, 40);
    }

    private function partnershipLiveKey(ResellerPartner $partner): ?string
    {
        $request = $this->partnershipRequest($partner);

        return data_get($request?->metadata, 'credentials.api_key');
    }

    private function storePartnershipLiveKey(ResellerPartner $partner, string $plainKey): void
    {
        $request = $this->partnershipRequest($partner);

        if (! $request) {
            return;
        }

        $metadata = is_array($request->metadata) ? $request->metadata : [];
        $credentials = is_array($metadata['credentials'] ?? null) ? $metadata['credentials'] : [];
        $credentials['api_key'] = $plainKey;
        $metadata['credentials'] = $credentials;

        $request->update(['metadata' => $metadata]);
    }

    private function partnershipRequest(ResellerPartner $partner): ?PartnershipRequest
    {
        $requestId = data_get($partner->metadata, 'partnership_request_id');

        if (! $requestId) {
            return null;
        }

        return PartnershipRequest::find($requestId);
    }

    private function resellerPrice(ResellerPartner $partner, float $cost): float
    {
        $cost = max(0, $cost);

        return round($cost + ($cost * ((float) $partner->margin_percent / 100)), 2);
    }

    private function selectedSupplierProduct(Product $product, ?string $variationId): ?SupplierProduct
    {
        $active = $product->supplierProducts->where('active', true);

        if ($variationId) {
            return $active->firstWhere('external_sku', $variationId);
        }

        return $active->sortBy('cost')->first();
    }

    private function partner(Request $request): ResellerPartner
    {
        return $request->attributes->get('reseller_partner');
    }
}
