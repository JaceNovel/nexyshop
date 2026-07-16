<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\AstralNotificationService;
use App\Services\Discord\DiscordNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BotManualFulfillmentController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeBot($request);

        $orders = Order::query()
            ->with('product')
            ->where('metadata->manual_fulfillment', true)
            ->whereIn('status', ['paid', 'manual_processing'])
            ->where(function ($query) {
                $query->whereNull('metadata->bot_dm_notified_at')
                    ->orWhere('metadata->bot_dm_notified_at', '');
            })
            ->latest()
            ->limit(20)
            ->get();

        return [
            'data' => $orders->map(fn (Order $order) => $this->serializeOrder($order))->all(),
        ];
    }

    public function markNotified(Request $request, Order $order)
    {
        $this->authorizeBot($request);
        abort_unless(! empty($order->metadata['manual_fulfillment']), 422, 'Commande non manuelle.');

        $metadata = $order->metadata ?? [];
        $metadata['bot_dm_notified_at'] = now()->toIso8601String();

        $order->forceFill(['metadata' => $metadata])->save();

        return ['notified' => true];
    }

    public function complete(Request $request, Order $order)
    {
        $this->authorizeBot($request);
        abort_unless(! empty($order->metadata['manual_fulfillment']), 422, 'Commande non manuelle.');

        $data = $request->validate([
            'status' => ['required', 'in:delivered,failed'],
            'discord_user_id' => ['nullable', 'string', 'max:80'],
        ]);

        $this->authorizeManualApprover((string) ($data['discord_user_id'] ?? ''));

        $metadata = $order->metadata ?? [];
        $metadata['fulfillment_status'] = $data['status'];
        $metadata['fulfilled_at'] = now()->toIso8601String();
        $metadata['fulfilled_by_discord_id'] = $data['discord_user_id'] ?? null;
        $metadata['bot_validated_at'] = now()->toIso8601String();

        $order->update([
            'status' => $data['status'],
            'metadata' => $metadata,
        ]);

        $freshOrder = $order->fresh();
        $this->notifyCustomer($freshOrder, $data['status']);
        app(DiscordNotificationService::class)->manualFulfillmentUpdated($freshOrder, $data['status']);

        return [
            'message' => $data['status'] === 'delivered' ? 'Commande marquee comme livree.' : 'Commande marquee comme echec.',
            'order' => $this->serializeOrder($freshOrder),
        ];
    }

    private function authorizeBot(Request $request): void
    {
        $expected = (string) config('services.discord.backend_token');
        abort_if($expected === '', 403, 'Bot token non configure.');
        abort_unless(hash_equals($expected, (string) $request->header('X-Astral-Bot-Token')), 403, 'Bot token invalide.');
    }

    private function authorizeManualApprover(string $discordUserId): void
    {
        $allowed = collect(explode(',', (string) config('services.discord.manual_fulfillment_admin_ids', '')))
            ->map(fn ($id) => trim($id))
            ->filter()
            ->values();

        if ($allowed->isEmpty()) {
            return;
        }

        abort_unless($discordUserId !== '' && $allowed->contains($discordUserId), 403, 'Validateur Discord non autorise.');
    }

    private function notifyCustomer(Order $order, string $status): void
    {
        $user = $this->resolveOrderUser($order);

        if (! $user) {
            return;
        }

        $product = Product::find($order->product_id);
        $productName = $product?->name ?? 'Recharge';
        $delivered = $status === 'delivered';

        app(AstralNotificationService::class)->notifyUser($user, [
            'type' => $delivered ? 'manual_order_delivered' : 'manual_order_failed',
            'title' => $delivered ? 'Recharge livree' : 'Recharge en echec',
            'subject' => $delivered ? 'Recharge livree' : 'Recharge en echec',
            'preview' => $delivered
                ? "La recharge de {$productName} a ete livree avec succes."
                : "La recharge de {$productName} n'a pas pu etre finalisee.",
            'action_label' => $delivered ? 'Voir ma commande' : 'Contacter le support',
            'action_url' => rtrim((string) config('services.google.frontend_url'), '/').($delivered ? '/profil' : '/contact'),
            'data' => ['order_id' => $order->id, 'status' => $status],
        ]);
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

        return User::query()->where('email', $email)->first();
    }

    private function serializeOrder(Order $order): array
    {
        $product = $order->product ?: Product::find($order->product_id);
        $metadata = $order->metadata ?? [];
        $customer = $metadata['customer'] ?? [];
        $supplierFields = $metadata['supplier_fields'] ?? [];
        $verification = $metadata['player_verification'] ?? [];

        return [
            'id' => $order->id,
            'status' => $order->status,
            'fulfillment_status' => $metadata['fulfillment_status'] ?? null,
            'product_name' => $product?->name ?? 'Produit inconnu',
            'product_sku' => $product?->sku,
            'variation_id' => $metadata['variation_id'] ?? null,
            'variation_name' => $metadata['variation_name'] ?? null,
            'amount' => (float) $order->amount,
            'currency' => $order->currency,
            'game_uid' => $order->game_uid,
            'nickname' => $order->nickname,
            'region' => $supplierFields['region'] ?? $verification['region'] ?? null,
            'source' => $metadata['source'] ?? 'site_checkout',
            'partner_reference' => $metadata['partner_reference'] ?? null,
            'reseller_reference' => $metadata['reseller_reference'] ?? null,
            'customer_name' => trim((string) ($customer['first_name'] ?? '').' '.($customer['last_name'] ?? '')) ?: 'Client Astral4Gamer',
            'customer_email' => $customer['email'] ?? null,
            'customer_phone' => $customer['phone'] ?? null,
            'fields' => collect($supplierFields)->map(fn ($value, $key) => [
                'key' => (string) $key,
                'label' => Str::headline((string) $key),
                'value' => (string) $value,
            ])->values()->all(),
            'created_at' => $order->created_at?->toIso8601String(),
        ];
    }
}
