<?php

namespace App\Services\Reseller;

use App\Jobs\DispatchSupplierOrder;
use App\Models\Order;
use App\Models\ResellerOrder;
use App\Models\ResellerPartner;
use App\Models\ResellerWallet;
use App\Models\ResellerWalletTransaction;
use App\Models\Product;
use App\Services\Discord\DiscordNotificationService;
use Illuminate\Support\Facades\DB;

class PendingResellerOrderService
{
    public function queue(ResellerPartner $partner, ResellerWallet $wallet, array $payload): ResellerOrder
    {
        return DB::transaction(function () use ($partner, $wallet, $payload) {
            $order = ResellerOrder::create([
                'reseller_partner_id' => $partner->id,
                'order_id' => null,
                'product_id' => $payload['product_id'],
                'supplier_product_id' => $payload['supplier_product_id'],
                'external_reference' => $payload['reference'],
                'partner_reference' => $payload['partner_reference'] ?? null,
                'supplier_cost' => $payload['supplier_cost_total'],
                'amount' => $payload['amount'],
                'margin_amount' => $payload['margin_amount_total'],
                'currency' => $payload['currency'] ?? 'USD',
                'status' => 'pending_balance',
                'request_payload' => $payload['request_payload'],
                'response_payload' => [
                    'state' => 'pending_balance',
                    'reason' => 'insufficient_balance',
                    'required_amount' => $payload['amount'],
                    'available_balance' => (float) $wallet->available_balance,
                    'missing_amount' => max(0, round($payload['amount'] - (float) $wallet->available_balance, 2)),
                    'product_name' => $payload['product_name'] ?? null,
                    'variation_name' => $payload['variation_name'] ?? null,
                    'queued_at' => now()->toIso8601String(),
                ],
            ]);

            ResellerWalletTransaction::create([
                'reseller_partner_id' => $partner->id,
                'reseller_wallet_id' => $wallet->id,
                'type' => 'order_pending',
                'amount' => $payload['amount'] * -1,
                'direction' => 'debit',
                'status' => 'pending',
                'description' => 'Commande en attente de solde suffisant.',
                'balance_after' => (float) $wallet->available_balance,
                'currency' => $wallet->currency,
                'reference' => $payload['reference'],
                'metadata' => [
                    'reseller_order_id' => $order->id,
                    'product_id' => $payload['product_id'],
                    'variation_id' => $payload['variation_id'] ?? null,
                    'missing_amount' => max(0, round($payload['amount'] - (float) $wallet->available_balance, 2)),
                ],
            ]);

            return $order;
        });
    }

    public function process(ResellerPartner $partner): int
    {
        $processed = 0;

        ResellerOrder::query()
            ->where('reseller_partner_id', $partner->id)
            ->where('status', 'pending_balance')
            ->orderBy('id')
            ->get()
            ->each(function (ResellerOrder $pendingOrder) use ($partner, &$processed) {
                $order = $this->processOne($partner, $pendingOrder);

                if ($order) {
                    $this->creditNexyBenefitIfNeeded($partner, $order);

                    if (! empty($order->metadata['manual_fulfillment'])) {
                        app(DiscordNotificationService::class)->manualFulfillmentPaid($order);
                    } else {
                        DispatchSupplierOrder::dispatch($order);
                    }
                    $processed++;
                }
            });

        return $processed;
    }

    private function processOne(ResellerPartner $partner, ResellerOrder $pendingOrder): ?Order
    {
        return DB::transaction(function () use ($partner, $pendingOrder) {
            $pendingOrder = ResellerOrder::query()->lockForUpdate()->find($pendingOrder->id);

            if (! $pendingOrder || $pendingOrder->status !== 'pending_balance') {
                return null;
            }

            $partner = ResellerPartner::query()->lockForUpdate()->findOrFail($partner->id);
            $wallet = ResellerWallet::query()->where('reseller_partner_id', $partner->id)->lockForUpdate()->firstOrFail();
            $amount = (float) $pendingOrder->amount;

            if ($wallet->wallet_status !== 'active' || $partner->status !== 'active' || $partner->api_status === 'suspended' || ! $partner->order_creation_allowed) {
                return null;
            }

            if ((float) $wallet->available_balance < $amount) {
                $response = $pendingOrder->response_payload ?? [];
                $response['available_balance'] = (float) $wallet->available_balance;
                $response['missing_amount'] = max(0, round($amount - (float) $wallet->available_balance, 2));
                $response['last_balance_check_at'] = now()->toIso8601String();
                $pendingOrder->forceFill(['response_payload' => $response])->save();

                return null;
            }

            $request = $pendingOrder->request_payload ?? [];
            $meta = $request['_astral'] ?? [];
            $product = Product::find($pendingOrder->product_id);
            $manualFulfillment = (bool) ($product?->metadata['manual_fulfillment'] ?? false);
            $gameUid = (string) ($request['data']['player_id'] ?? $request['data']['user_id'] ?? $request['data']['uid'] ?? '');
            $nickname = (string) ($request['data']['nickname'] ?? $request['data']['player_name'] ?? $gameUid);

            $wallet->available_balance = round((float) $wallet->available_balance - $amount, 2);
            $wallet->balance = $wallet->available_balance;
            $wallet->total_spent = round((float) $wallet->total_spent + $amount, 2);
            $wallet->save();

            ResellerWalletTransaction::create([
                'reseller_partner_id' => $partner->id,
                'reseller_wallet_id' => $wallet->id,
                'type' => 'wallet_debit',
                'amount' => $amount * -1,
                'direction' => 'debit',
                'status' => 'completed',
                'description' => 'Débit automatique commande en attente.',
                'balance_after' => $wallet->available_balance,
                'currency' => $wallet->currency,
                'reference' => $pendingOrder->external_reference,
                'metadata' => [
                    'reseller_order_id' => $pendingOrder->id,
                    'product_id' => $pendingOrder->product_id,
                    'variation_id' => $meta['variation_id'] ?? null,
                    'released_from_pending' => true,
                ],
            ]);

            ResellerWalletTransaction::query()
                ->where('reseller_partner_id', $partner->id)
                ->where('reference', $pendingOrder->external_reference)
                ->where('type', 'order_pending')
                ->where('status', 'pending')
                ->update(['status' => 'released', 'description' => 'Commande libérée après recharge suffisante.', 'updated_at' => now()]);

            $shopOrder = Order::create([
                'product_id' => $pendingOrder->product_id,
                'game_uid' => $gameUid,
                'nickname' => $nickname,
                'amount' => $amount,
                'currency' => $pendingOrder->currency,
                'status' => 'paid',
                'metadata' => [
                    'source' => 'reseller_api',
                    'reseller_partner_id' => $partner->id,
                    'reseller_reference' => $pendingOrder->external_reference,
                    'partner_reference' => $pendingOrder->partner_reference,
                    'variation_id' => $meta['variation_id'] ?? null,
                    'variation_name' => $meta['variation_name'] ?? null,
                    'supplier' => $meta['supplier'] ?? 'fazercards',
                    'quantity' => $meta['quantity'] ?? 1,
                    'supplier_cost' => (float) $pendingOrder->supplier_cost,
                    'unit_price' => $meta['unit_price'] ?? $amount,
                    'margin_amount' => (float) $pendingOrder->margin_amount,
                    'nexy_benefit_credit_xof' => (int) ($meta['nexy_benefit_credit_xof'] ?? 0),
                    'nexy_benefit_credit_usd' => (float) ($meta['nexy_benefit_credit_usd'] ?? 0),
                    'manual_fulfillment' => $manualFulfillment,
                    'fulfillment_status' => $manualFulfillment ? 'awaiting_delivery' : 'pending_supplier',
                    'required_fields' => $product?->metadata['required_fields'] ?? [],
                    'customer' => $request['customer'] ?? [],
                    'supplier_fields' => $request['data'] ?? [],
                    'player_verification' => $meta['player_verification'] ?? null,
                    'released_from_pending_at' => now()->toIso8601String(),
                ],
            ]);

            $response = $pendingOrder->response_payload ?? [];
            $response['state'] = 'accepted';
            $response['astral_order_id'] = $shopOrder->id;
            $response['released_at'] = now()->toIso8601String();
            $response['available_balance_after'] = (float) $wallet->available_balance;

            $pendingOrder->forceFill([
                'order_id' => $shopOrder->id,
                'status' => 'accepted',
                'response_payload' => $response,
            ])->save();

            return $shopOrder;
        });
    }

    private function creditNexyBenefitIfNeeded(ResellerPartner $partner, Order $order): void
    {
        $benefitXof = (int) ($order->metadata['nexy_benefit_credit_xof'] ?? 0);

        if ($benefitXof <= 0) {
            return;
        }

        $quantity = max(1, (int) ($order->metadata['quantity'] ?? 1));
        $partner->loadMissing('wallet');
        $walletCurrency = strtoupper((string) ($partner->wallet?->currency ?? 'USD'));
        $amount = $walletCurrency === 'XOF'
            ? $benefitXof * $quantity
            : round(($benefitXof * $quantity) / 610, 2);

        if ($amount <= 0) {
            return;
        }

        $reference = 'NEXY-BENEFIT-'.($order->metadata['reseller_reference'] ?? $order->id);

        if (ResellerWalletTransaction::query()
            ->where('reseller_partner_id', $partner->id)
            ->where('reference', $reference)
            ->where('status', 'completed')
            ->exists()) {
            return;
        }

        app(ResellerWalletService::class)->credit($partner, $amount, $reference, null, [
            'type' => 'nexy_subscription_benefit',
            'description' => 'Bénéfice Nexy crédité sur abonnement Free Fire.',
            'order_id' => $order->id,
            'product_id' => $order->product_id,
            'variation_id' => $order->metadata['variation_id'] ?? null,
            'benefit_xof' => $benefitXof * $quantity,
            'quantity' => $quantity,
        ]);
    }
}
