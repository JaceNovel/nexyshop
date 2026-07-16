<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\DispatchSupplierOrder;
use App\Models\ApiLog;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PartnershipRequest;
use App\Models\Product;
use App\Models\ResellerApiKey;
use App\Models\ResellerLoan;
use App\Models\ResellerOrder;
use App\Models\ResellerPartner;
use App\Models\ResellerRecharge;
use App\Models\ResellerWalletTransaction;
use App\Models\SupplierProduct;
use App\Services\FreeFire\FreeFireLookupService;
use App\Services\FreeFire\RedeemCodeService;
use App\Services\Payments\PaymentManager;
use App\Services\Reseller\AdvancedResellerWalletService;
use App\Services\Reseller\ResellerApiSubscriptionService;
use App\Services\Reseller\PendingResellerOrderService;
use App\Services\Reseller\ResellerWalletService;
use App\Services\Shop\PricingService;
use App\Services\Discord\DiscordNotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class ResellerApiController extends Controller
{
    public function __construct(private readonly PricingService $pricing)
    {
    }

    public function categories(Request $request)
    {
        $partner = $this->partner($request);

        return [
            'data' => collect($this->partnerAllowedGames($partner))
                ->map(fn (string $slug) => [
                    'slug' => str_replace('_', '-', $slug),
                    'name' => $this->gameLabel($slug),
                    'products_count' => $this->partnerProducts($partner, [$slug])->count(),
                ])
                ->values(),
        ];
    }

    public function products(Request $request)
    {
        $partner = $this->partner($request);
        $query = $this->partnerProducts($partner)->with('supplierProducts');

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
            ->through(fn (Product $product) => $this->serializeProduct($product, $partner));
    }

    public function product(Request $request, Product $product)
    {
        $partner = $this->partner($request);

        abort_unless($this->isPartnerAllowedProduct($product, $partner) && $product->active, 404);

        return ['data' => $this->serializeProduct($product->load('supplierProducts'), $partner)];
    }

    public function balance(Request $request, ResellerWalletService $wallets, ResellerApiSubscriptionService $subscriptions)
    {
        $partner = $this->partner($request);
        $wallet = $wallets->ensureWallet($partner);
        $partner->setRelation('wallet', $wallet);

        return [
            'data' => [
                'status' => 200,
                'balance' => (float) $wallet->balance,
                'available_balance' => (float) $wallet->available_balance,
                'pending_balance' => (float) $wallet->pending_balance,
                'credit_balance' => (float) $wallet->credit_balance,
                'currency' => $wallet->currency,
                'minimum_topup' => (float) $partner->minimum_topup,
                'low_balance_threshold' => (float) $partner->low_balance_threshold,
                'wallet_status' => $wallet->wallet_status,
                'api_status' => $partner->api_status,
                'astral_score' => (int) $partner->astral_score,
                'api_subscription' => $subscriptions->subscriptionPayload($partner),
            ],
        ];
    }

    public function panelOverview(Request $request, ResellerWalletService $wallets, ResellerApiSubscriptionService $subscriptions)
    {
        $partner = $this->partner($request)->loadMissing('wallet');
        $wallet = $wallets->ensureWallet($partner);
        $partner->setRelation('wallet', $wallet);
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
            ->with(['product', 'order'])
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
                'api_status' => $partner->api_status ?? 'active',
                'risk_level' => $partner->risk_level ?? 'excellent',
                'astral_score' => (int) ($partner->astral_score ?? 900),
                'order_creation_allowed' => (bool) ($partner->order_creation_allowed ?? true),
                'allowed_scope' => $partner->allowed_scope,
                'allowed_games' => $partner->metadata['allowed_games'] ?? [],
                'margin_percent' => (float) $partner->margin_percent,
                'minimum_topup' => (float) $partner->minimum_topup,
                'low_balance_threshold' => (float) $partner->low_balance_threshold,
                'wallet' => [
                    'balance' => (float) $wallet->balance,
                    'available_balance' => (float) $wallet->available_balance,
                    'pending_balance' => (float) $wallet->pending_balance,
                    'credit_balance' => (float) $wallet->credit_balance,
                    'total_recharged' => (float) $wallet->total_recharged,
                    'total_spent' => (float) $wallet->total_spent,
                    'total_borrowed' => (float) $wallet->total_borrowed,
                    'total_repaid' => (float) $wallet->total_repaid,
                    'total_fees_paid' => (float) $wallet->total_fees_paid,
                    'wallet_status' => $wallet->wallet_status,
                    'currency' => $wallet->currency,
                ],
                'loan' => $this->activeLoanPayload($partner),
                'api_subscription' => $subscriptions->subscriptionPayload($partner),
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
                'catalog_products' => $this->partnerProducts($partner)->count(),
                'wallet_balance' => (float) $wallet->balance,
                'topups_this_month' => (float) ResellerWalletTransaction::query()
                    ->where('reseller_partner_id', $partner->id)
                    ->whereIn('type', ['wallet_credit', 'recharge_standard', 'recharge_express'])
                    ->where('created_at', '>=', $startOfMonth)
                    ->sum('amount'),
                'spend_this_month' => (float) ResellerWalletTransaction::query()
                    ->where('reseller_partner_id', $partner->id)
                    ->whereIn('type', ['wallet_debit', 'loan_repayment'])
                    ->where('created_at', '>=', $startOfMonth)
                    ->sum('amount'),
                'express_fees_paid' => (float) ResellerWalletTransaction::query()
                    ->where('reseller_partner_id', $partner->id)
                    ->where('type', 'express_fee')
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
                    ['method' => 'POST', 'path' => '/freefire/lookup', 'description' => 'Vérifier un ID Free Fire avant paiement (réservé au partenaire Nexy)'],
                    ['method' => 'POST', 'path' => '/order/add-order', 'description' => 'Créer une commande reseller'],
                    ['method' => 'GET', 'path' => '/order/get-order', 'description' => 'Lire le détail d\'une commande'],
                ],
                'api_subscription' => [
                    'description' => 'Abonnement mensuel API Astral pour les partenaires non-Nexy.',
                    'monthly_fee' => $subscriptions->feeEquivalents(),
                    'grace_days' => $subscriptions->graceDays(),
                    'nexy_exempt' => true,
                ],
            ],
        ]);
    }

    public function redeemCodes(Request $request, RedeemCodeService $redeemCodes)
    {
        $partner = $this->partner($request);

        abort_unless($this->partnerHasFreeFireAccess($partner), 403, 'Free Fire n\'est pas activé pour ce partenaire.');

        try {
            return $redeemCodes->publicCodes(
                $request->query('user_id'),
                $request->query('date')
            );
        } catch (\RuntimeException $exception) {
            return response()->json([
                'enabled' => false,
                'message' => $exception->getMessage() ?: 'Redeem codes indisponibles.',
                'codes' => [],
            ]);
        } catch (\Throwable) {
            return response()->json([
                'enabled' => false,
                'message' => 'Redeem codes indisponibles.',
                'codes' => [],
            ]);
        }
    }

    public function claimRedeemCode(Request $request, RedeemCodeService $redeemCodes)
    {
        $partner = $this->partner($request);

        abort_unless($this->partnerHasFreeFireAccess($partner), 403, 'Free Fire n\'est pas activé pour ce partenaire.');

        $data = $request->validate([
            'code_id' => ['required', 'string', 'max:80'],
            'user_id' => ['required', 'string', 'max:120'],
            'date' => ['nullable', 'string', 'max:40'],
        ]);

        try {
            return $redeemCodes->claim($data['code_id'], $data['user_id'], $data['date'] ?? null);
        } catch (\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function freeFireLookup(Request $request, FreeFireLookupService $freeFire)
    {
        $partner = $this->partner($request);

        abort_unless($this->partnerHasFreeFireAccess($partner), 403, 'Free Fire n\'est pas activé pour ce partenaire.');
        abort_unless($this->partnerCanVerifyFreeFireIds($partner), 403, 'La vérification des ID Free Fire est réservée au partenaire Nexy.');

        $data = $request->validate([
            'uid' => ['required_without_all:user_id,player_id', 'nullable', 'string', 'max:32'],
            'user_id' => ['required_without_all:uid,player_id', 'nullable', 'string', 'max:32'],
            'player_id' => ['required_without_all:uid,user_id', 'nullable', 'string', 'max:32'],
            'region' => ['required', 'string', 'max:8'],
        ]);

        $uid = (string) ($data['uid'] ?? $data['user_id'] ?? $data['player_id'] ?? '');

        try {
            $profile = $freeFire->profile($uid, $data['region']);
            $payload = [
                'data' => [
                    'status' => 200,
                    'verified' => true,
                    'uid' => $profile['uid'] ?? $uid,
                    'region' => $profile['region'] ?? strtolower((string) $data['region']),
                    'nickname' => $profile['nickname'] ?? null,
                    'level' => $profile['level'] ?? null,
                    'likes' => $profile['likes'] ?? null,
                    'avatar_url' => $profile['outfit_url'] ?? null,
                    'banner_url' => $profile['banner_url'] ?? null,
                    'guild' => $profile['guild'] ?? null,
                    'rank' => $profile['rank'] ?? null,
                ],
            ];

            $this->logResellerFreeFireLookup($request, $partner, 200, $payload['data']);

            return response()->json($payload);
        } catch (RuntimeException $exception) {
            $payload = [
                'data' => [
                    'status' => 422,
                    'verified' => false,
                    'uid' => $uid,
                    'region' => strtolower((string) $data['region']),
                    'message' => $this->resellerFreeFireMessage($exception),
                ],
            ];

            $this->logResellerFreeFireLookup($request, $partner, 422, $payload['data']);

            return response()->json($payload, 422);
        }
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
            ->with(['product', 'order'])
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

    public function topup(Request $request, ResellerWalletService $wallets, AdvancedResellerWalletService $advancedWallets)
    {
        $partner = $this->partner($request);
        $wallet = $wallets->ensureWallet($partner);
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'recharge_type' => ['nullable', 'in:standard,express'],
            'accept_express_fee' => ['nullable', 'boolean'],
            'customer.email' => ['required', 'email'],
            'customer.first_name' => ['required', 'string', 'max:120'],
            'customer.last_name' => ['required', 'string', 'max:120'],
            'customer.phone' => ['nullable', 'string', 'max:40'],
            'methods' => ['nullable', 'array'],
            'methods.*' => ['string', 'max:80'],
        ]);
        $this->requireExplicitPaymentMethod($data);

        $currency = strtoupper((string) ($wallet->currency ?: config('services.payments.moneroo.default_currency', 'USD')));
        $amount = round((float) $data['amount'], 2);
        $type = $data['recharge_type'] ?? 'standard';
        abort_if($wallet->wallet_status === 'suspended', 403, 'Wallet partenaire suspendu. Contactez le support.');
        abort_if($type === 'express' && ! (bool) config('services.reseller.express_enabled', true), 422, 'Recharge express désactivée par Astral4Gamer.');
        abort_if($type === 'express' && ! (bool) ($data['accept_express_fee'] ?? false), 422, 'Vous devez accepter les frais express.');
        $minimumAmount = max($advancedWallets->minimumTopup($partner), $this->minimumMonerooTopupForCurrency($currency));
        abort_if($amount < $minimumAmount, 422, 'Le montant minimum de recharge est de '.$minimumAmount.' '.$currency.'. Si vous n’avez pas les fonds nécessaires, vous pouvez demander un Prêt Astral.');
        $fee = $type === 'express' ? $advancedWallets->expressFee($amount, $partner) : 0;
        $totalToPay = round($amount + $fee, 2);

        $reference = $wallets->reference('A4G-RESELLER-TOPUP');
        $label = $partner->company_name ?: $partner->name;
        $checkout = (new PaymentManager('moneroo'))->initiate([
            'amount' => $totalToPay,
            'currency' => $currency,
            'description' => 'Recharge '.($type === 'express' ? 'express' : 'standard').' reseller Astral4Gamer '.$label,
            'return_url' => config('services.payments.moneroo.return_url').'?reseller_topup='.$reference,
            'customer' => $data['customer'],
            'methods' => $data['methods'] ?? null,
            'metadata' => [
                'type' => 'reseller_topup',
                'reseller_partner_id' => (string) $partner->id,
                'reference' => $reference,
                'recharge_type' => $type,
                'credited_amount' => $amount,
                'fee' => $fee,
            ],
        ]);

        abort_unless(! empty($checkout['checkout_url']) && ! empty($checkout['reference']), 422, 'Moneroo n’a pas renvoyé de lien de paiement.');

        $payment = Payment::create([
            'provider' => 'moneroo',
            'reference' => $checkout['reference'],
            'amount' => $totalToPay,
            'currency' => $currency,
            'status' => 'initiated',
            'payload' => array_merge($checkout, [
                'metadata' => [
                    'type' => 'reseller_topup',
                    'reseller_partner_id' => $partner->id,
                    'reference' => $reference,
                    'recharge_type' => $type,
                    'credited_amount' => $amount,
                    'fee' => $fee,
                ],
                'customer' => $data['customer'],
            ]),
        ]);

        $recharge = $advancedWallets->createRecharge($partner, $payment, $type, $amount, $fee, $reference, [
            'business_day' => $advancedWallets->isBusinessDay(now()),
            'notice' => $type === 'standard' && ! $advancedWallets->isBusinessDay(now()) ? 'Votre recharge sera créditée le lundi à partir de 09h00.' : null,
        ]);

        return response()->json([
            'payment' => $payment,
            'recharge' => $recharge,
            'checkout_url' => $checkout['checkout_url'],
        ], 201);
    }

    public function requestLoan(Request $request, AdvancedResellerWalletService $wallets)
    {
        $partner = $this->partner($request);
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:1000'],
            'partner_note' => ['nullable', 'string', 'max:600'],
            'accept_terms' => ['accepted'],
        ]);

        $loan = $wallets->requestLoan($partner, round((float) $data['amount'], 2), $data['partner_note'] ?? null);

        return response()->json(['loan' => $this->loanPayload($loan)], 201);
    }

    private function minimumMonerooTopupForCurrency(string $currency): float
    {
        return match (strtoupper($currency)) {
            'USD', 'XOF', 'XAF' => 100.0,
            default => 10.0,
        };
    }

    private function requireExplicitPaymentMethod(array $data): void
    {
        $methods = array_values(array_filter($data['methods'] ?? [], static fn ($method) => is_string($method) && trim($method) !== ''));

        abort_if($methods === [], 422, 'Choisissez votre mode de paiement avant de continuer.');
    }

    public function addOrder(Request $request, ResellerWalletService $wallets, PendingResellerOrderService $pendingOrders)
    {
        $partner = $this->partner($request);
        $this->logResellerOrderAttempt($request, $partner, 0, ['state' => 'received']);
        $data = $request->validate([
            'product_id' => ['nullable'],
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
            'data.server' => ['nullable', 'string', 'max:80'],
        ]);

        $variationId = $data['variation_id'] ?? null;
        $productIdInput = $data['product_id'] ?? null;

        if ($variationId === '') {
            $variationId = null;
        }

        if ($productIdInput !== null && $productIdInput !== '' && ! is_numeric($productIdInput) && ! $variationId) {
            $variationId = (string) $productIdInput;
            $productIdInput = null;
        }

        $data['product_id'] = is_numeric($productIdInput) ? (int) $productIdInput : null;
        $data['variation_id'] = $variationId;

        abort_if(empty($data['product_id']) && empty($data['variation_id']), 422, 'product_id ou variation_id requis.');

        [$product, $prefilledSupplierProduct] = $this->resolveOrderProduct($data['product_id'] ?? null, $data['variation_id'] ?? null);

        abort_unless($product, 404, 'Produit introuvable.');
        abort_unless($this->isPartnerAllowedProduct($product, $partner) && $product->active, 404, 'Produit non autorisé pour ce partenaire.');

        $supplierProduct = $prefilledSupplierProduct ?: $this->selectedSupplierProduct($product, $data['variation_id'] ?? null);
        abort_if(($data['variation_id'] ?? null) && ! $supplierProduct, 422, 'Variation invalide ou indisponible.');
        $supplierCost = (float) ($supplierProduct?->cost ?: $product->price);
        abort_if($supplierCost <= 0, 422, 'Produit indisponible.');

        $quantity = (int) ($data['quantity'] ?? 1);
        $unitPrice = $this->resellerPrice($partner, $supplierCost, $product, $supplierProduct);
        $amount = round($unitPrice * $quantity, 2);
        $gameUid = (string) ($data['data']['player_id'] ?? $data['data']['user_id'] ?? $data['data']['uid'] ?? '');
        $requiresUid = (bool) ($product->metadata['requires_uid'] ?? true);
        abort_if($requiresUid && $gameUid === '', 422, 'ID joueur requis pour ce produit.');
        $nickname = (string) ($data['data']['nickname'] ?? $data['data']['player_name'] ?? $gameUid);
        $playerVerification = $requiresUid && $gameUid !== '' ? $this->verifyResellerPlayer($product, $gameUid, $data['data']) : null;

        if ($playerVerification && ! empty($playerVerification['nickname'])) {
            $nickname = (string) $playerVerification['nickname'];
        }

        $reference = 'A4G-RS-'.now()->format('YmdHis').'-'.Str::upper(Str::random(6));
        $orderPayload = $data + [
            '_astral' => [
                'variation_id' => $supplierProduct?->external_sku,
                'variation_name' => $supplierProduct?->metadata['name'] ?? null,
                'supplier' => $product->metadata['supplier'] ?? 'fazercards',
                'quantity' => $quantity,
                'supplier_cost' => $supplierCost,
                'unit_price' => $unitPrice,
                'player_verification' => $playerVerification,
                'nexy_benefit_credit_xof' => (int) ($supplierProduct?->metadata['nexy_benefit_credit_xof'] ?? 0),
                'nexy_benefit_credit_usd' => (float) ($supplierProduct?->metadata['nexy_benefit_credit_usd'] ?? 0),
            ],
        ];

        if ((bool) $request->attributes->get('reseller_sandbox', false)) {
            $payload = [
                'data' => [
                    'status' => 202,
                    'order_id' => 'SANDBOX-'.$reference,
                    'total' => $amount,
                    'currency' => 'USD',
                    'state' => 'sandbox',
                    'message' => 'Commande test acceptée. Aucun solde débité.',
                ],
            ];
            $this->logResellerOrderAttempt($request, $partner, 202, $payload['data']);

            return response()->json($payload, 202);
        }

        $wallet = $wallets->ensureWallet($partner);
        abort_if($wallet->wallet_status !== 'active', 403, 'Wallet reseller bloqué.');
        abort_if($partner->status !== 'active' || $partner->api_status === 'suspended' || ! $partner->order_creation_allowed, 403, 'API partenaire suspendue.');

        if ((float) $wallet->available_balance < $amount) {
            $pendingOrder = $pendingOrders->queue($partner, $wallet, [
                'reference' => $reference,
                'partner_reference' => $data['partner_reference'] ?? null,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'supplier_product_id' => $supplierProduct?->id,
                'variation_id' => $supplierProduct?->external_sku,
                'variation_name' => $supplierProduct?->metadata['name'] ?? null,
                'supplier_cost_total' => $supplierCost * $quantity,
                'amount' => $amount,
                'margin_amount_total' => ($unitPrice - $supplierCost) * $quantity,
                'currency' => 'USD',
                'request_payload' => $orderPayload,
            ]);

            $payload = [
                'data' => [
                    'status' => 202,
                    'order_id' => $pendingOrder->external_reference,
                    'astral_order_id' => null,
                    'total' => (float) $pendingOrder->amount,
                    'currency' => $pendingOrder->currency,
                    'state' => 'pending_balance',
                    'available_balance' => (float) $wallet->available_balance,
                    'missing_amount' => max(0, round($amount - (float) $wallet->available_balance, 2)),
                    'message' => 'Commande enregistrée. Elle sera exécutée automatiquement dès que le solde partenaire sera suffisant.',
                ],
            ];
            $this->logResellerOrderAttempt($request, $partner, 202, $payload['data']);

            return response()->json($payload, 202);
        }

        $resellerOrder = DB::transaction(function () use ($partner, $wallets, $amount, $reference, $product, $supplierProduct, $supplierCost, $unitPrice, $quantity, $gameUid, $nickname, $data, $orderPayload, $playerVerification) {
            $manualFulfillment = (bool) ($product->metadata['manual_fulfillment'] ?? false);

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
                    'nexy_benefit_credit_xof' => (int) ($supplierProduct?->metadata['nexy_benefit_credit_xof'] ?? 0),
                    'nexy_benefit_credit_usd' => (float) ($supplierProduct?->metadata['nexy_benefit_credit_usd'] ?? 0),
                    'manual_fulfillment' => $manualFulfillment,
                    'fulfillment_status' => $manualFulfillment ? 'awaiting_delivery' : 'pending_supplier',
                    'required_fields' => $product->metadata['required_fields'] ?? [],
                    'customer' => $data['customer'] ?? [],
                    'supplier_fields' => $data['data'],
                    'player_verification' => $playerVerification,
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
                'request_payload' => $orderPayload,
                'response_payload' => ['order_id' => $order->id],
            ]);
        });

        $this->creditNexyBenefitIfNeeded($partner, $wallets, $resellerOrder);

        if (! empty($resellerOrder->order?->metadata['manual_fulfillment'])) {
            app(DiscordNotificationService::class)->manualFulfillmentPaid($resellerOrder->order);
        } else {
            DispatchSupplierOrder::dispatch($resellerOrder->order);
        }

        $payload = [
            'data' => [
                'status' => 200,
                'order_id' => $resellerOrder->external_reference,
                'astral_order_id' => $resellerOrder->order_id,
                'total' => (float) $resellerOrder->amount,
                'currency' => $resellerOrder->currency,
                'state' => $resellerOrder->status,
            ],
        ];
        $this->logResellerOrderAttempt($request, $partner, 201, $payload['data']);

        return response()->json($payload, 201);
    }

    public function getOrder(Request $request)
    {
        $partner = $this->partner($request);
        $data = $request->validate([
            'order_id' => ['required', 'string', 'max:120'],
        ]);

        $order = ResellerOrder::query()
            ->with(['order', 'product'])
            ->where('reseller_partner_id', $partner->id)
            ->where(function ($query) use ($data) {
                $query->where('external_reference', $data['order_id'])
                    ->orWhere('partner_reference', $data['order_id']);
            })
            ->firstOrFail();

        return [
            'data' => [
                'status' => 200,
                'order' => $this->serializeResellerOrder($order),
            ],
        ];
    }

    private function freeFireProducts()
    {
        return Product::query()
            ->whereActive(true)
            ->where('price', '>', 0)
            ->where(function ($query) {
                $query->where('metadata->client_site_enabled', true)
                    ->orWhere(function ($legacy) {
                        $legacy->whereNull('metadata->client_site_enabled')
                            ->where(function ($freeFire) {
                                $freeFire->where('name', 'like', '%free fire%')
                                    ->orWhere('game', 'like', '%free fire%')
                                    ->orWhere('metadata->category', 'like', '%free fire%')
                                    ->orWhere('metadata->type', 'free_fire');
                            });
                    });
            });
    }

    private function partnerProducts(ResellerPartner $partner, ?array $onlyGames = null): Builder
    {
        $allowedGames = $onlyGames ?: $this->partnerAllowedGames($partner);

        return Product::query()
            ->whereActive(true)
            ->where('price', '>', 0)
            ->where(function (Builder $availability) {
                $availability->where('metadata->manual_fulfillment', true)
                    ->orWhereHas('supplierProducts', fn (Builder $supplierProducts) => $supplierProducts
                        ->where('active', true)
                        ->where('cost', '>', 0));
            })
            ->where(function (Builder $accessQuery) use ($partner) {
                $partnerCodes = $this->partnerCodes($partner);
                $accessQuery->whereNull('metadata->reseller_partner_codes');

                foreach ($partnerCodes as $partnerCode) {
                    $accessQuery->orWhereJsonContains('metadata->reseller_partner_codes', $partnerCode);
                }
            })
            ->where(function (Builder $query) use ($allowedGames) {
                $this->applyAllowedGamesFilter($query, $allowedGames);
            });
    }

    private function applyAllowedGamesFilter(Builder $query, array $allowedGames): void
    {
        foreach ($allowedGames as $slug) {
            foreach ($this->gameNeedles((string) $slug) as $needle) {
                $query->orWhere('name', 'like', "%{$needle}%")
                    ->orWhere('game', 'like', "%{$needle}%")
                    ->orWhere('sku', 'like', "%{$needle}%")
                    ->orWhere('metadata->category', 'like', "%{$needle}%")
                    ->orWhere('metadata->type', 'like', "%{$needle}%");
            }
        }
    }

    private function partnerAllowedGames(ResellerPartner $partner): array
    {
        $aliases = [
            'free_fire' => 'free_fire_mena',
            'pubg' => 'pubg_mobile_global',
            'blood_strike' => 'blood_strike_mena',
            'gift_cards' => 'gift_cards',
            'mobile_legend' => 'mobile_legends',
            'mobile_legend_bang_bang' => 'mobile_legends',
            'farlight' => 'farlight_84',
            'psn' => 'playstation',
            'playstation_network' => 'playstation',
        ];

        $games = collect($partner->metadata['allowed_games'] ?? Arr::wrap($partner->allowed_scope))
            ->filter(fn ($game) => is_string($game) && trim($game) !== '')
            ->map(fn ($game) => trim((string) $game))
            ->map(fn ($game) => $aliases[$game] ?? $game)
            ->unique()
            ->values()
            ->all();

        return $games !== [] ? $games : $this->defaultAllowedGames();
    }

    private function defaultAllowedGames(): array
    {
        return [
            'free_fire_mena',
            'pubg_mobile_global',
            'blood_strike_mena',
            'clash_of_clans_gems',
            'brawl_stars',
            'clash_royale_gems',
            'roblox_global',
            'garena_free_fire_global',
            'mobile_legends',
            'farlight_84',
            'playstation',
            'gift_cards',
        ];
    }

    private function gameNeedles(string $slug): array
    {
        return match ($slug) {
            'free_fire' => ['free fire', 'freefire', 'free_fire', 'ff_subscription'],
            'free_fire_mena' => ['free fire mena', 'mena free fire', 'free fire', 'freefire', 'diamonds free fire', 'ff_subscription'],
            'garena_free_fire_global' => ['garena free fire', 'free fire global', 'garena', 'free fire', 'freefire', 'ff_subscription'],
            'pubg' => ['pubg', 'pubg mobile'],
            'pubg_mobile_global' => ['pubg mobile global', 'pubg global', 'pubg mobile', 'pubg'],
            'blood_strike_mena' => ['blood strike mena', 'blood strike', 'bloodstrike'],
            'clash_of_clans_gems' => ['clash of clans gems', 'clash of clans', 'coc gems'],
            'brawl_stars' => ['brawl stars', 'brawl'],
            'clash_royale_gems' => ['clash royale gems', 'clash royale'],
            'roblox_global' => ['roblox global', 'roblox', 'robux'],
            'mobile_legends' => ['mobile legends', 'mobile legend', 'mlbb'],
            'farlight_84' => ['farlight 84', 'farlight'],
            'playstation' => ['playstation', 'playstation network', 'psn'],
            'call_of_duty_mobile' => ['call of duty mobile', 'cod mobile', 'codm', 'call_of_duty_mobile'],
            'valorant' => ['valorant'],
            'genshin_impact' => ['genshin', 'genshin impact', 'genshin_impact'],
            'steam' => ['steam'],
            'gift_cards' => ['gift card', 'gift cards', 'gift-card', 'giftcard', 'gift_cards'],
            default => [str_replace('_', ' ', $slug), $slug],
        };
    }

    private function gameLabel(string $slug): string
    {
        return match ($slug) {
            'free_fire' => 'Free Fire',
            'free_fire_mena' => 'Free Fire MENA',
            'garena_free_fire_global' => 'Garena Free Fire Global',
            'pubg' => 'PUBG Mobile',
            'pubg_mobile_global' => 'PUBG Mobile Auto Global',
            'blood_strike_mena' => 'Blood Strike MENA',
            'clash_of_clans_gems' => 'Clash of Clans Gems',
            'brawl_stars' => 'Brawl Stars',
            'clash_royale_gems' => 'Clash Royale Gems',
            'roblox_global' => 'Roblox Global',
            'mobile_legends' => 'Mobile Legends',
            'farlight_84' => 'Farlight 84',
            'playstation' => 'PlayStation',
            'call_of_duty_mobile' => 'Call of Duty Mobile',
            'valorant' => 'Valorant',
            'genshin_impact' => 'Genshin Impact',
            'steam' => 'Steam',
            'gift_cards' => 'Gift Cards',
            default => Str::headline(str_replace('_', ' ', $slug)),
        };
    }

    private function isFreeFireProduct(Product $product): bool
    {
        $haystack = strtolower($product->name.' '.$product->game.' '.($product->metadata['category'] ?? '').' '.($product->metadata['type'] ?? ''));

        return str_contains($haystack, 'free fire') || str_contains($haystack, 'freefire');
    }

    private function partnerHasFreeFireAccess(ResellerPartner $partner): bool
    {
        return collect($this->partnerAllowedGames($partner))
            ->contains(fn (string $slug) => in_array($slug, ['free_fire', 'free_fire_mena', 'garena_free_fire_global'], true));
    }

    private function isClientSiteProduct(Product $product): bool
    {
        if (array_key_exists('client_site_enabled', $product->metadata ?? [])) {
            return (bool) $product->metadata['client_site_enabled'];
        }

        return $this->isFreeFireProduct($product);
    }

    private function isPartnerAllowedProduct(Product $product, ResellerPartner $partner): bool
    {
        $haystack = strtolower($product->name.' '.$product->game.' '.$product->sku.' '.($product->metadata['category'] ?? '').' '.($product->metadata['type'] ?? ''));

        foreach ($this->partnerAllowedGames($partner) as $slug) {
            foreach ($this->gameNeedles((string) $slug) as $needle) {
                if (str_contains($haystack, strtolower($needle))) {
                    return true;
                }
            }
        }

        return false;
    }

    private function partnerCanVerifyFreeFireIds(ResellerPartner $partner): bool
    {
        $metadata = $partner->metadata ?? [];

        if ((bool) data_get($metadata, 'features.freefire_lookup') || (bool) data_get($metadata, 'exclusive_features.freefire_lookup')) {
            return true;
        }

        if (strtolower((string) data_get($metadata, 'partner_code')) === 'nexy') {
            return true;
        }

        $identity = Str::lower(trim($partner->name.' '.$partner->company_name.' '.$partner->email));

        return str_contains($identity, 'nexy');
    }

    private function resellerFreeFireMessage(RuntimeException $exception): string
    {
        $message = $exception->getMessage();

        if (str_contains($message, 'clé') || str_contains($message, 'API')) {
            return 'Service Free Fire indisponible pour le moment.';
        }

        return $message ?: 'ID Free Fire incorrect.';
    }

    private function serializeProduct(Product $product, ResellerPartner $partner): array
    {
        $product->loadMissing('supplierProducts');
        $requiresUid = (bool) ($product->metadata['requires_uid'] ?? true);
        $requiredFields = $product->metadata['required_fields'] ?? ($requiresUid ? ['player_id', 'region'] : []);
        $variations = $product->supplierProducts
            ->where('active', true)
            ->filter(fn (SupplierProduct $variation) => (float) $variation->cost > 0)
            ->sortBy('cost')
            ->map(fn (SupplierProduct $variation) => [
                'variation_id' => (string) $variation->external_sku,
                'name' => $variation->metadata['name'] ?? $product->name,
                'price' => $this->resellerPrice($partner, (float) $variation->cost, $product, $variation),
                'currency' => 'USD',
                'required_fields' => $requiredFields,
            ])
            ->values();

        $fallbackPrice = $this->resellerPrice($partner, (float) $product->price, $product);

        return [
            'id' => $product->id,
            'name' => $product->name,
            'category' => $product->game ?: ($product->metadata['category'] ?? null),
            'sku' => $product->metadata['public_reference'] ?? $product->sku ?? 'astral4gamer-product-'.$product->id,
            'image_url' => $product->metadata['image_url'] ?? null,
            'description' => $product->metadata['description'] ?? null,
            'price' => $variations->pluck('price')->filter()->min() ?: $fallbackPrice,
            'currency' => 'USD',
            'requires_uid' => $requiresUid,
            'required_fields' => $requiredFields,
            'variations' => $variations,
        ];
    }

    private function serializeResellerOrder(ResellerOrder $order): array
    {
        $request = $order->request_payload ?? [];
        $response = $order->response_payload ?? [];
        $meta = $request['_astral'] ?? [];
        $walletTransactions = ResellerWalletTransaction::query()
            ->where('reseller_partner_id', $order->reseller_partner_id)
            ->where('reference', $order->external_reference)
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (ResellerWalletTransaction $transaction) => $this->serializeWalletTransaction($transaction))
            ->values();

        return [
            'id' => $order->id,
            'external_reference' => $order->external_reference,
            'partner_reference' => $order->partner_reference,
            'product_id' => $order->product_id,
            'product_name' => $order->product?->name,
            'variation_id' => $meta['variation_id'] ?? null,
            'variation_name' => $meta['variation_name'] ?? null,
            'status' => $order->order?->status ?? $order->status,
            'reseller_status' => $order->status,
            'fulfillment_status' => $order->order?->metadata['fulfillment_status'] ?? null,
            'supplier_external_id' => $order->order?->metadata['supplier_external_id'] ?? null,
            'delivery_codes' => $order->order?->metadata['delivery_codes'] ?? [],
            'state_message' => $this->resellerOrderStateMessage($order),
            'pending_reason' => $response['reason'] ?? null,
            'required_amount' => isset($response['required_amount']) ? (float) $response['required_amount'] : (float) $order->amount,
            'available_balance' => isset($response['available_balance']) ? (float) $response['available_balance'] : null,
            'missing_amount' => isset($response['missing_amount']) ? (float) $response['missing_amount'] : null,
            'amount' => (float) $order->amount,
            'supplier_cost' => (float) $order->supplier_cost,
            'margin_amount' => (float) $order->margin_amount,
            'currency' => $order->currency,
            'player_id' => $request['data']['player_id'] ?? $request['data']['user_id'] ?? $request['data']['uid'] ?? null,
            'server' => $request['data']['server'] ?? $request['data']['region'] ?? null,
            'nickname' => $request['data']['nickname'] ?? $request['data']['player_name'] ?? null,
            'customer' => $request['customer'] ?? [],
            'wallet_transactions' => $walletTransactions,
            'released_at' => $response['released_at'] ?? null,
            'queued_at' => $response['queued_at'] ?? null,
            'created_at' => optional($order->created_at)?->toIso8601String(),
        ];
    }

    private function resellerOrderStateMessage(ResellerOrder $order): string
    {
        return match ($order->status) {
            'pending_balance' => 'En attente de solde suffisant. La commande partira automatiquement après recharge.',
            'accepted', 'processing' => 'Commande acceptée et en cours de traitement.',
            'completed', 'success', 'paid' => 'Commande traitée avec succès.',
            'failed', 'cancelled', 'refused' => 'Commande échouée ou refusée.',
            default => 'Commande enregistrée.',
        };
    }

    private function serializeWalletTransaction(ResellerWalletTransaction $transaction): array
    {
        return [
            'id' => $transaction->id,
            'type' => $transaction->type,
            'amount' => (float) $transaction->amount,
            'direction' => $transaction->direction ?? ((float) $transaction->amount >= 0 ? 'credit' : 'debit'),
            'status' => $transaction->status ?? 'completed',
            'description' => $transaction->description,
            'balance_after' => (float) $transaction->balance_after,
            'currency' => $transaction->currency,
            'reference' => $transaction->reference,
            'metadata' => $transaction->metadata ?? [],
            'created_at' => optional($transaction->created_at)?->toIso8601String(),
        ];
    }

    private function activeLoanPayload(ResellerPartner $partner): ?array
    {
        $loan = ResellerLoan::query()
            ->where('reseller_partner_id', $partner->id)
            ->whereIn('status', ['requested', 'approved', 'active', 'overdue', 'grace_period', 'defaulted'])
            ->latest()
            ->first();

        if (! $loan) {
            return null;
        }

        return $this->loanPayload($loan);
    }

    private function loanPayload(ResellerLoan $loan): array
    {
        return [
            'id' => $loan->id,
            'reference' => $loan->reference,
            'principal_amount' => (float) $loan->principal_amount,
            'margin_rate' => (float) $loan->margin_rate,
            'margin_amount' => (float) $loan->margin_amount,
            'total_due' => (float) $loan->total_due,
            'amount_repaid' => (float) $loan->amount_repaid,
            'remaining_due' => (float) $loan->remaining_due,
            'currency' => $loan->currency,
            'status' => $loan->status,
            'due_date' => optional($loan->due_date)?->toIso8601String(),
            'grace_until' => optional($loan->grace_until)?->toIso8601String(),
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

    private function resellerPrice(ResellerPartner $partner, float $cost, ?Product $product = null, ?SupplierProduct $variation = null): float
    {
        $cost = max(0, $cost);

        if ($product && $this->isNexyPartner($partner)) {
            $mode = (string) ($product->metadata['reseller_pricing']['nexy']['mode'] ?? '');

            if ($mode === 'net_cost') {
                return round($cost, 2);
            }
        }

        return round($cost + ($cost * ((float) $partner->margin_percent / 100)), 2);
    }

    private function verifyResellerPlayer(Product $product, string $gameUid, array $data): ?array
    {
        if (($product->metadata['validation_provider'] ?? null) !== 'free_fire') {
            return null;
        }

        $region = trim((string) ($data['region'] ?? $data['server'] ?? $product->metadata['default_region'] ?? config('services.freefire.lookup.default_region', 'me')));
        abort_if($region === '', 422, 'Region Free Fire requise.');

        try {
            return app(FreeFireLookupService::class)->validateUid($gameUid, $region);
        } catch (\Throwable) {
            abort(422, 'ID Free Fire incorrect ou verification indisponible.');
        }
    }

    private function creditNexyBenefitIfNeeded(ResellerPartner $partner, ResellerWalletService $wallets, ResellerOrder $resellerOrder): void
    {
        if (! $this->isNexyPartner($partner)) {
            return;
        }

        $order = $resellerOrder->order;
        $quantity = max(1, (int) ($order?->metadata['quantity'] ?? 1));
        $benefitXof = (int) ($order?->metadata['nexy_benefit_credit_xof'] ?? 0);

        if ($benefitXof <= 0) {
            return;
        }

        $partner->loadMissing('wallet');
        $walletCurrency = strtoupper((string) ($partner->wallet?->currency ?? 'USD'));
        $amount = $walletCurrency === 'XOF'
            ? $benefitXof * $quantity
            : round(($benefitXof * $quantity) / 610, 2);

        if ($amount <= 0) {
            return;
        }

        $reference = 'NEXY-BENEFIT-'.$resellerOrder->external_reference;

        if (ResellerWalletTransaction::query()
            ->where('reseller_partner_id', $partner->id)
            ->where('reference', $reference)
            ->where('status', 'completed')
            ->exists()) {
            return;
        }

        $wallets->credit($partner, $amount, $reference, null, [
            'type' => 'nexy_subscription_benefit',
            'description' => 'Bénéfice Nexy crédité sur abonnement Free Fire.',
            'reseller_order_id' => $resellerOrder->id,
            'order_id' => $resellerOrder->order_id,
            'product_id' => $resellerOrder->product_id,
            'variation_id' => $order?->metadata['variation_id'] ?? null,
            'benefit_xof' => $benefitXof * $quantity,
            'quantity' => $quantity,
        ]);
    }

    private function isNexyPartner(ResellerPartner $partner): bool
    {
        return in_array('nexy', $this->partnerCodes($partner), true);
    }

    private function partnerCodes(ResellerPartner $partner): array
    {
        return collect([
            $partner->metadata['partner_code'] ?? null,
            $partner->company_name,
            $partner->name,
            $partner->email,
        ])
            ->filter()
            ->map(fn ($value) => str((string) $value)->ascii()->lower()->replaceMatches('/[^a-z0-9]+/', '_')->trim('_')->toString())
            ->flatMap(fn (string $value) => str_contains($value, 'nexy') ? [$value, 'nexy'] : [$value])
            ->unique()
            ->values()
            ->all();
    }

    private function selectedSupplierProduct(Product $product, ?string $variationId): ?SupplierProduct
    {
        $active = $product->supplierProducts
            ->where('active', true)
            ->filter(fn (SupplierProduct $supplierProduct) => (float) $supplierProduct->cost > 0);

        if ($variationId) {
            return $active->firstWhere('external_sku', $variationId);
        }

        return $active->sortBy('cost')->first();
    }

    private function resolveOrderProduct(?int $productId, ?string $variationId): array
    {
        if ($productId) {
            return [Product::with('supplierProducts')->find($productId), null];
        }

        if (! $variationId) {
            return [null, null];
        }

        $supplierProduct = SupplierProduct::query()
            ->with('product.supplierProducts')
            ->where('external_sku', $variationId)
            ->where('active', true)
            ->where('cost', '>', 0)
            ->first();

        return [$supplierProduct?->product, $supplierProduct];
    }

    private function partner(Request $request): ResellerPartner
    {
        return $request->attributes->get('reseller_partner');
    }

    private function logResellerOrderAttempt(Request $request, ResellerPartner $partner, int $statusCode, array $response): void
    {
        try {
            ApiLog::create([
                'service' => 'reseller_api',
                'direction' => 'incoming',
                'endpoint' => $request->path(),
                'status_code' => $statusCode,
                'payload' => [
                    'partner_id' => $partner->id,
                    'partner_name' => $partner->name,
                    'sandbox' => (bool) $request->attributes->get('reseller_sandbox', false),
                    'product_id' => $request->input('product_id'),
                    'variation_id' => $request->input('variation_id'),
                    'partner_reference' => $request->input('partner_reference'),
                    'has_bearer_token' => $request->bearerToken() !== null,
                    'has_api_key_header' => $request->headers->has('X-API-Key') || $request->headers->has('api-key'),
                    'has_api_key_input' => $request->has('api_key'),
                ],
                'response' => Arr::only($response, ['status', 'order_id', 'astral_order_id', 'state', 'message']),
            ]);
        } catch (\Throwable) {
            // Logging must never block reseller order processing.
        }
    }

    private function logResellerFreeFireLookup(Request $request, ResellerPartner $partner, int $statusCode, array $response): void
    {
        try {
            ApiLog::create([
                'service' => 'reseller_api',
                'direction' => 'incoming',
                'endpoint' => $request->path(),
                'status_code' => $statusCode,
                'payload' => [
                    'partner_id' => $partner->id,
                    'partner_name' => $partner->name,
                    'sandbox' => (bool) $request->attributes->get('reseller_sandbox', false),
                    'uid' => $request->input('uid') ?: $request->input('user_id') ?: $request->input('player_id'),
                    'region' => $request->input('region'),
                    'has_bearer_token' => $request->bearerToken() !== null,
                    'has_api_key_header' => $request->headers->has('X-API-Key') || $request->headers->has('api-key'),
                    'has_api_key_input' => $request->has('api_key'),
                ],
                'response' => Arr::only($response, ['status', 'verified', 'uid', 'region', 'nickname', 'message']),
            ]);
        } catch (\Throwable) {
            // Logging must never block partner lookup requests.
        }
    }
}
