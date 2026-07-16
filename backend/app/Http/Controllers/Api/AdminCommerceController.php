<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCommerceController extends Controller
{
    public function reviews(Request $request)
    {
        $status = $request->query('status');
        $reviews = DB::table('product_reviews')
            ->leftJoin('users', 'product_reviews.user_id', '=', 'users.id')
            ->leftJoin('products', 'product_reviews.product_id', '=', 'products.id')
            ->when($status && $status !== 'all', fn ($query) => $query->where('product_reviews.status', $status))
            ->select([
                'product_reviews.id', 'product_reviews.rating', 'product_reviews.status', 'product_reviews.comment', 'product_reviews.created_at',
                'users.name as user_name', 'users.email as user_email', 'products.name as product_name',
            ])
            ->latest('product_reviews.created_at')
            ->limit(150)
            ->get();

        return ['data' => $reviews];
    }

    public function updateReview(Request $request, int $reviewId)
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:pending,approved,hidden,deleted'],
            'admin_reply' => ['nullable', 'string', 'max:1200'],
        ]);

        $updates = ['updated_at' => now()];
        if (isset($data['status'])) {
            $updates['status'] = $data['status'];
            if ($data['status'] === 'approved') $updates['approved_at'] = now();
            if ($data['status'] === 'hidden') $updates['hidden_at'] = now();
            if ($data['status'] === 'deleted') $updates['deleted_at'] = now();
        }
        if (array_key_exists('admin_reply', $data)) $updates['admin_reply'] = $data['admin_reply'];

        DB::table('product_reviews')->where('id', $reviewId)->update($updates);

        return ['message' => 'Avis mis a jour.'];
    }

    public function vip()
    {
        $levels = DB::table('vip_levels')->orderBy('min_orders')->get();
        $topCustomers = User::query()
            ->withCount(['orders as paid_orders_count' => fn ($query) => $query->whereIn('status', ['paid', 'delivered'])])
            ->withSum(['orders as paid_orders_sum_amount' => fn ($query) => $query->whereIn('status', ['paid', 'delivered'])], 'amount')
            ->orderByDesc('paid_orders_sum_amount')
            ->limit(30)
            ->get(['id', 'name', 'email', 'badges']);

        return ['levels' => $levels, 'top_customers' => $topCustomers];
    }

    public function updateVipLevel(Request $request, int $levelId)
    {
        $data = $request->validate([
            'min_orders' => ['required', 'integer', 'min:0'],
            'min_spend' => ['required', 'numeric', 'min:0'],
            'cashback_percent' => ['required', 'numeric', 'min:0', 'max:50'],
            'discount_percent' => ['required', 'numeric', 'min:0', 'max:50'],
        ]);

        DB::table('vip_levels')->where('id', $levelId)->update($data + ['updated_at' => now()]);
        return ['message' => 'Niveau VIP mis a jour.'];
    }

    public function wallets()
    {
        $wallets = DB::table('wallets')
            ->leftJoin('users', 'wallets.user_id', '=', 'users.id')
            ->select(['wallets.*', 'users.name as user_name', 'users.email as user_email'])
            ->latest('wallets.updated_at')
            ->limit(150)
            ->get();

        return ['data' => $wallets];
    }

    public function adjustWallet(Request $request, int $userId)
    {
        $data = $request->validate([
            'type' => ['required', 'in:bonus,admin_debit,admin_correction'],
            'amount' => ['required', 'numeric', 'not_in:0'],
            'reason' => ['required', 'string', 'min:4', 'max:255'],
        ]);

        $wallet = DB::table('wallets')->where('user_id', $userId)->first();
        if (! $wallet) {
            $walletId = DB::table('wallets')->insertGetId([
                'user_id' => $userId,
                'balance' => 0,
                'reward_balance' => 0,
                'cashback_balance' => 0,
                'currency' => 'XOF',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $wallet = DB::table('wallets')->where('id', $walletId)->first();
        }

        $amount = round((float) $data['amount'], 2);
        if ($data['type'] === 'admin_debit') $amount = -abs($amount);
        $balance = round((float) $wallet->balance + $amount, 2);

        DB::table('wallets')->where('id', $wallet->id)->update(['balance' => $balance, 'updated_at' => now()]);
        DB::table('wallet_transactions')->insert([
            'user_id' => $userId,
            'wallet_id' => $wallet->id,
            'type' => $data['type'],
            'amount' => $amount,
            'balance_after' => $balance,
            'currency' => $wallet->currency ?? 'USD',
            'reason' => $data['reason'],
            'admin_user_id' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ['message' => 'Wallet ajuste.'];
    }

    public function updateOrder(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => ['required', 'in:payment_pending,payment_received,verification,supplier_submitted,manual_processing,delivery_in_progress,delivered,failed,refunded'],
            'customer_note' => ['nullable', 'string', 'max:1200'],
            'internal_note' => ['nullable', 'string', 'max:1200'],
        ]);

        $order->update(['status' => match ($data['status']) {
            'payment_pending' => 'pending_payment',
            'supplier_submitted', 'manual_processing', 'delivery_in_progress', 'payment_received', 'verification' => 'paid',
            default => $data['status'],
        }]);

        DB::table('order_events')->insert([
            'order_id' => $order->id,
            'status' => $data['status'],
            'title' => $this->statusTitle($data['status']),
            'message' => $data['customer_note'] ?: $this->statusTitle($data['status']),
            'visible_to_customer' => true,
            'admin_user_id' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (! empty($data['internal_note'])) {
            DB::table('order_events')->insert([
                'order_id' => $order->id,
                'status' => $data['status'],
                'title' => 'Note interne',
                'message' => $data['internal_note'],
                'visible_to_customer' => false,
                'admin_user_id' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return ['message' => 'Commande mise a jour.'];
    }

    private function statusTitle(string $status): string
    {
        return [
            'payment_pending' => 'Paiement en attente',
            'payment_received' => 'Paiement recu',
            'verification' => 'Verification',
            'supplier_submitted' => 'Envoi au fournisseur',
            'manual_processing' => 'Traitement manuel',
            'delivery_in_progress' => 'Livraison en cours',
            'delivered' => 'Produit livre',
            'failed' => 'Echec',
            'refunded' => 'Rembourse',
        ][$status] ?? $status;
    }
}