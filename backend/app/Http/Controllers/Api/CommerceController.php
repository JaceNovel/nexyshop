<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CommerceController extends Controller
{
    public function productReviews(Request $request, Product $product)
    {
        $reviews = DB::table('product_reviews')
            ->leftJoin('users', 'product_reviews.user_id', '=', 'users.id')
            ->where('product_reviews.product_id', $product->id)
            ->where('product_reviews.status', 'approved')
            ->when($request->integer('rating'), fn ($query, $rating) => $query->where('product_reviews.rating', $rating))
            ->select([
                'product_reviews.id', 'product_reviews.rating', 'product_reviews.comment', 'product_reviews.proof_url',
                'product_reviews.verified_purchase', 'product_reviews.admin_reply', 'product_reviews.created_at',
                'users.id as user_id', 'users.name as user_name', 'users.avatar_url', 'users.google_avatar_url',
            ])
            ->latest('product_reviews.created_at')
            ->limit(50)
            ->get();

        $stats = DB::table('product_reviews')
            ->where('product_id', $product->id)
            ->where('status', 'approved')
            ->selectRaw('COUNT(*) as total, COALESCE(AVG(rating), 0) as average')
            ->first();

        $distribution = DB::table('product_reviews')
            ->where('product_id', $product->id)
            ->where('status', 'approved')
            ->selectRaw('rating, COUNT(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');

        $user = $request->user();
        $canReview = $user ? $this->hasPurchasedProduct($user, $product) : false;

        return response()->json([
            'summary' => [
                'average' => round((float) ($stats->average ?? 0), 2),
                'total' => (int) ($stats->total ?? 0),
                'distribution' => collect([5, 4, 3, 2, 1])->mapWithKeys(fn ($rating) => [(string) $rating => (int) ($distribution[$rating] ?? 0)]),
                'can_review' => $canReview,
            ],
            'data' => $reviews->map(fn ($review) => $this->serializeReview($review)),
        ]);
    }

    public function storeReview(Request $request, Product $product)
    {
        $user = $request->user();
        abort_unless($user && $this->hasPurchasedProduct($user, $product), 403, 'Tu dois avoir achete ce produit pour laisser un avis.');

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['required', 'string', 'min:8', 'max:1200'],
            'proof_url' => ['nullable', 'url', 'max:2048'],
        ]);

        $existing = DB::table('product_reviews')
            ->where('product_id', $product->id)
            ->where('user_id', $user->id)
            ->where('status', '!=', 'deleted')
            ->first();

        $payload = [
            'rating' => $data['rating'],
            'comment' => $data['comment'],
            'proof_url' => $data['proof_url'] ?? null,
            'verified_purchase' => true,
            'status' => 'pending',
            'approved_at' => null,
            'updated_at' => now(),
        ];

        if ($existing) {
            DB::table('product_reviews')->where('id', $existing->id)->update($payload);
            $reviewId = $existing->id;
        } else {
            $reviewId = DB::table('product_reviews')->insertGetId($payload + [
                'product_id' => $product->id,
                'user_id' => $user->id,
                'created_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Avis envoye pour validation.', 'id' => $reviewId], 201);
    }

    public function wallet(Request $request)
    {
        $user = $request->user();
        $wallet = $this->ensureWallet($user);

        $transactions = DB::table('wallet_transactions')
            ->where('user_id', $user->id)
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn ($transaction) => [
                'id' => (string) $transaction->id,
                'type' => $transaction->type,
                'amount' => (float) $transaction->amount,
                'currency' => $transaction->currency,
                'reason' => $transaction->reason,
                'createdAt' => $transaction->created_at,
            ]);

        return response()->json([
            'userId' => (string) $user->id,
            'balance' => (float) $wallet->balance,
            'currency' => $wallet->currency,
            'transactions' => $transactions,
        ]);
    }

    public function vip(Request $request)
    {
        return response()->json($this->vipPayload($request->user()));
    }

    public function orderTracking(Request $request, Order $order)
    {
        abort_unless((int) $order->user_id === (int) $request->user()->id || $request->user()->is_admin, 403, 'Commande inaccessible.');

        $product = Product::find($order->product_id);
        $payment = Payment::query()->where('order_id', $order->id)->latest()->first();
        $events = $this->ensureOrderEvents($order, $payment);

        return response()->json([
            'id' => (string) $order->id,
            'reference' => 'A4G-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT),
            'productId' => (string) $order->product_id,
            'productName' => $product?->name ?? 'Produit Astral4Gamer',
            'amount' => (float) $order->amount,
            'currency' => $order->currency,
            'paymentMethod' => $payment?->provider ?? 'Moneroo',
            'status' => $this->normalizeOrderStatus($order),
            'estimatedDelivery' => $this->estimatedDelivery($order),
            'events' => $events,
        ]);
    }

    public function livePurchases()
    {
        $orders = Order::query()
            ->whereIn('status', $this->vipEligibleOrderStatuses())
            ->latest()
            ->limit(8)
            ->get();
        $products = Product::query()->whereIn('id', $orders->pluck('product_id'))->get()->keyBy('id');
        $users = User::query()->whereIn('id', $orders->pluck('user_id')->filter())->get(['id', 'name', 'username', 'email'])->keyBy('id');

        return response()->json([
            'data' => $orders->map(function (Order $order) use ($products, $users) {
                return [
                    'name' => $this->maskedBuyerDisplayName($this->buyerDisplayName($order, $users->get($order->user_id))),
                    'verb' => in_array($order->status, ['delivered', 'completed'], true) ? 'a recu' : 'vient d’acheter',
                    'product' => $products[$order->product_id]->name ?? 'un produit Astral4Gamer',
                ];
            })->values(),
        ]);
    }

    private function hasPurchasedProduct(User $user, Product $product): bool
    {
        return Order::query()
            ->where('user_id', $user->id)
            ->where('product_id', $product->id)
            ->whereIn('status', $this->vipEligibleOrderStatuses())
            ->exists();
    }

    private function serializeReview(object $review): array
    {
        return [
            'id' => (string) $review->id,
            'productId' => '',
            'userId' => (string) ($review->user_id ?? ''),
            'userName' => $review->user_name ?: 'Client Astral4Gamer',
            'avatarUrl' => $review->avatar_url ?: $review->google_avatar_url ?: '/icon.svg',
            'rating' => (int) $review->rating,
            'comment' => $review->comment,
            'proofUrl' => $review->proof_url,
            'verifiedPurchase' => (bool) $review->verified_purchase,
            'status' => 'approved',
            'createdAt' => $review->created_at,
            'adminReply' => $review->admin_reply,
        ];
    }

    private function ensureWallet(User $user): object
    {
        $wallet = DB::table('wallets')->where('user_id', $user->id)->first();
        if ($wallet) return $wallet;

        $id = DB::table('wallets')->insertGetId([
            'user_id' => $user->id,
            'balance' => 0,
            'reward_balance' => 0,
            'cashback_balance' => 0,
            'currency' => 'XOF',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('wallets')->where('id', $id)->first();
    }

    private function vipPayload(User $user): array
    {
        $orders = Order::query()->where('user_id', $user->id)->whereIn('status', $this->vipEligibleOrderStatuses())->get();
        $count = $orders->count();
        $spend = (float) $orders->sum('amount');
        $levels = DB::table('vip_levels')->orderBy('min_orders')->get()->map(fn ($level) => [
            'name' => $level->name,
            'minOrders' => (int) $level->min_orders,
            'minSpend' => (float) $level->min_spend,
            'cashbackPercent' => (float) $level->cashback_percent,
            'discountPercent' => (float) $level->discount_percent,
            'perks' => json_decode($level->perks ?: '[]', true) ?: [],
        ])->values();
        $current = $levels->first() ?: ['name' => 'Bronze'];
        foreach ($levels as $level) {
            if ($count >= $level['minOrders'] || $spend >= $level['minSpend']) $current = $level;
        }

        return [
            'currentLevel' => $current['name'],
            'orders' => $count,
            'spend' => $spend,
            'levels' => $levels,
            'cashbackBalance' => (float) ($this->ensureWallet($user)->cashback_balance ?? 0),
            'badges' => $user->badges ?? [],
        ];
    }

    private function vipEligibleOrderStatuses(): array
    {
        return ['paid', 'delivered', 'completed'];
    }

    private function ensureOrderEvents(Order $order, ?Payment $payment): array
    {
        if (! DB::table('order_events')->where('order_id', $order->id)->exists()) {
            DB::table('order_events')->insert([
                'order_id' => $order->id,
                'status' => 'payment_pending',
                'title' => 'Commande creee',
                'message' => 'Ta commande est enregistree. Nous attendons la confirmation du paiement.',
                'visible_to_customer' => true,
                'created_at' => $order->created_at ?? now(),
                'updated_at' => $order->created_at ?? now(),
            ]);
        }
        if ($payment && in_array($payment->status, ['success', 'paid', 'completed'], true)) {
            DB::table('order_events')->updateOrInsert(['order_id' => $order->id, 'status' => 'payment_received'], [
                'title' => 'Paiement recu',
                'message' => 'Paiement confirme. La livraison est en cours de preparation.',
                'visible_to_customer' => true,
                'updated_at' => now(),
                'created_at' => $payment->updated_at ?? now(),
            ]);
        }

        return DB::table('order_events')
            ->where('order_id', $order->id)
            ->orderBy('created_at')
            ->get()
            ->map(fn ($event) => [
                'id' => (string) $event->id,
                'status' => $event->status,
                'title' => $event->title,
                'message' => $event->message,
                'createdAt' => $event->created_at,
                'visibleToCustomer' => (bool) $event->visible_to_customer,
            ])->all();
    }

    private function normalizeOrderStatus(Order $order): string
    {
        return match ($order->status) {
            'pending_payment' => 'payment_pending',
            'paid' => ! empty($order->metadata['manual_fulfillment']) ? 'manual_processing' : 'supplier_submitted',
            'delivered' => 'delivered',
            'failed' => 'failed',
            'refunded' => 'refunded',
            default => 'verification',
        };
    }

    private function estimatedDelivery(Order $order): string
    {
        $minutes = (int) data_get($order->metadata, 'avg_delivery_minutes', 15);
        return $minutes <= 15 ? '1-15 min' : $minutes.' min';
    }

    private function buyerDisplayName(Order $order, ?User $user): string
    {
        $customerName = trim(implode(' ', array_filter([
            data_get($order->metadata, 'customer.first_name'),
            data_get($order->metadata, 'customer.last_name'),
        ])));

        $name = trim((string) (
            $user?->username
            ?: $user?->name
            ?: $customerName
            ?: data_get($order->metadata, 'customer.email')
            ?: $user?->email
            ?: 'Un client Astral'
        ));

        if (filter_var($name, FILTER_VALIDATE_EMAIL)) {
            $name = explode('@', $name, 2)[0] ?: 'Un client Astral';
        }

        return mb_substr($name, 0, 48) ?: 'Un client Astral';
    }

    private function maskedBuyerDisplayName(string $name): string
    {
        $name = trim(preg_replace('/\s+/', ' ', $name) ?? '');

        if ($name === '' || $name === 'Un client Astral') {
            return 'Un client Astral';
        }

        $visibleLength = min(5, max(2, mb_strlen($name)));

        return mb_substr($name, 0, $visibleLength).'****';
    }

}