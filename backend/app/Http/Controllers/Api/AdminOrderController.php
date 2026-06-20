<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\AstralNotificationService;
use App\Services\Discord\DiscordNotificationService;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    public function manualOrders()
    {
        $orders = Order::query()
            ->where('metadata->manual_fulfillment', true)
            ->latest()
            ->limit(100)
            ->get();

        $products = Product::query()
            ->whereIn('id', $orders->pluck('product_id')->filter()->all())
            ->get()
            ->keyBy('id');

        return [
            'data' => $orders->map(function (Order $order) use ($products) {
                $customer = $order->metadata['customer'] ?? [];
                $requiredFields = collect($order->metadata['required_fields'] ?? [])->keyBy('key');
                $supplierFields = collect($order->metadata['supplier_fields'] ?? []);

                return [
                    'id' => $order->id,
                    'status' => $order->status,
                    'fulfillment_status' => $order->metadata['fulfillment_status'] ?? null,
                    'amount' => (float) $order->amount,
                    'currency' => $order->currency,
                    'created_at' => $order->created_at?->toIso8601String(),
                    'product_name' => $products[$order->product_id]?->name ?? 'Produit inconnu',
                    'customer_name' => trim((string) ($customer['first_name'] ?? '').' '.($customer['last_name'] ?? '')) ?: 'Client Astral4Gamer',
                    'customer_email' => $customer['email'] ?? null,
                    'customer_phone' => $customer['phone'] ?? null,
                    'game_uid' => $order->game_uid,
                    'nickname' => $order->nickname,
                    'field_entries' => $supplierFields->map(function ($value, $key) use ($requiredFields) {
                        return [
                            'key' => (string) $key,
                            'label' => $requiredFields[$key]['label'] ?? ucfirst(str_replace('_', ' ', (string) $key)),
                            'value' => (string) $value,
                        ];
                    })->values()->all(),
                ];
            })->all(),
        ];
    }

    public function updateManualStatus(Request $request, Order $order)
    {
        abort_unless(! empty($order->metadata['manual_fulfillment']), 422, 'Cette commande n\'est pas en traitement manuel.');

        $data = $request->validate([
            'status' => ['required', 'in:delivered,failed'],
        ]);

        $metadata = $order->metadata ?? [];
        $metadata['fulfillment_status'] = $data['status'];
        $metadata['fulfilled_at'] = now()->toIso8601String();
        $metadata['fulfilled_by'] = $request->user()?->id;

        $order->update([
            'status' => $data['status'],
            'metadata' => $metadata,
        ]);

        $user = $this->resolveOrderUser($order->fresh());
        $product = Product::find($order->product_id);
        $productName = $product?->name ?? 'Call of Duty Mobile';

        if ($user) {
            app(AstralNotificationService::class)->notifyUser($user, [
                'type' => $data['status'] === 'delivered' ? 'manual_order_delivered' : 'manual_order_failed',
                'title' => $data['status'] === 'delivered' ? 'Recharge livree' : 'Recharge en echec',
                'subject' => $data['status'] === 'delivered' ? 'Recharge CODM livree' : 'Recharge CODM en echec',
                'preview' => $data['status'] === 'delivered'
                    ? "La recharge de {$productName} a été un grand succès."
                    : "La recharge de {$productName} a été un echec.",
                'action_label' => $data['status'] === 'delivered' ? 'Voir ma commande' : 'Appeler le service',
                'action_url' => $data['status'] === 'delivered'
                    ? rtrim((string) config('services.google.frontend_url'), '/').'/profil'
                    : 'tel:+33688639294',
                'data' => ['order_id' => $order->id, 'status' => $data['status']],
            ]);
        }

        app(DiscordNotificationService::class)->manualFulfillmentUpdated($order->fresh(), $data['status']);

        return [
            'message' => $data['status'] === 'delivered' ? 'Commande marquee comme livree.' : 'Commande marquee comme echec.',
            'order' => $order->fresh(),
        ];
    }

    private function resolveOrderUser(Order $order): ?User
    {
        if ($order->user_id) {
            return User::find($order->user_id);
        }

        $email = trim((string) ($order->metadata['customer']['email'] ?? ''));

        if ($email === '') {
            return null;
        }

        $user = User::query()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($email)])
            ->first();

        if ($user && ! $order->user_id) {
            $order->update(['user_id' => $user->id]);
        }

        return $user;
    }
}