<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CustomerWalletRefundService
{
    public function refundSupplierFailure(Order $order, string $reason): bool
    {
        if (! $order->user_id) {
            return false;
        }

        $metadata = $order->metadata ?? [];
        if (! empty($metadata['customer_refunded_at'])) {
            return false;
        }

        if (DB::table('wallet_transactions')->where('order_id', $order->id)->where('type', 'supplier_refund')->exists()) {
            return false;
        }

        $refunded = DB::transaction(function () use ($order, $reason, $metadata) {
            $currency = strtoupper((string) $order->currency ?: 'USD');
            $amount = round((float) $order->amount, 2);
            if ($amount <= 0) {
                return false;
            }

            $wallet = DB::table('wallets')->where('user_id', $order->user_id)->lockForUpdate()->first();
            if (! $wallet) {
                $walletId = DB::table('wallets')->insertGetId([
                    'user_id' => $order->user_id,
                    'balance' => 0,
                    'reward_balance' => 0,
                    'cashback_balance' => 0,
                    'currency' => $currency,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $wallet = DB::table('wallets')->where('id', $walletId)->lockForUpdate()->first();
            }

            $walletCurrency = strtoupper((string) ($wallet->currency ?? $currency));
            $walletBalance = round((float) ($wallet->balance ?? 0), 2);
            $updates = ['updated_at' => now()];
            $creditedAmount = $amount;

            if ($walletCurrency !== $currency) {
                $creditedAmount = $this->convertAmount($amount, $currency, $walletCurrency);
            }

            if ($creditedAmount <= 0) {
                $metadata['customer_refund_pending_at'] = now()->toIso8601String();
                $metadata['customer_refund_pending_reason'] = 'Montant de remboursement invalide apres conversion '.$currency.' vers '.$walletCurrency;
                $order->forceFill(['metadata' => $metadata])->save();

                return false;
            }

            $balance = round($walletBalance + $creditedAmount, 2);
            $updates['balance'] = $balance;
            DB::table('wallets')->where('id', $wallet->id)->update($updates);

            DB::table('wallet_transactions')->insert([
                'user_id' => $order->user_id,
                'wallet_id' => $wallet->id,
                'type' => 'supplier_refund',
                'amount' => $creditedAmount,
                'balance_after' => $balance,
                'currency' => $walletCurrency,
                'reason' => 'Remboursement fournisseur commande #'.$order->id,
                'order_id' => $order->id,
                'metadata' => json_encode([
                    'reason' => $reason,
                    'original_amount' => $amount,
                    'original_currency' => $currency,
                    'credited_amount' => $creditedAmount,
                    'credited_currency' => $walletCurrency,
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $metadata['customer_refunded_at'] = now()->toIso8601String();
            $metadata['customer_refund_amount'] = $creditedAmount;
            $metadata['customer_refund_currency'] = $walletCurrency;
            $metadata['customer_refund_original_amount'] = $amount;
            $metadata['customer_refund_original_currency'] = $currency;
            $metadata['customer_refund_reason'] = $reason;
            unset($metadata['customer_refund_pending_at'], $metadata['customer_refund_pending_reason']);

            $order->forceFill([
                'status' => 'refunded',
                'metadata' => $metadata,
            ])->save();

            return true;
        });

        if ($refunded) {
            $this->notifyCustomer($order->fresh(), $reason);
        }

        return $refunded;
    }

    private function convertAmount(float $amount, string $fromCurrency, string $toCurrency): float
    {
        $fromCurrency = strtoupper($fromCurrency);
        $toCurrency = strtoupper($toCurrency);

        if ($fromCurrency === $toCurrency) {
            return round($amount, 2);
        }

        $usdXofRate = max(1, (float) config('services.kucoin.usd_xof_rate', 610));
        $eurXofRate = max(1, (float) config('services.payments.moneroo.eur_xof_rate', 660));
        $amountInXof = match ($fromCurrency) {
            'USD' => $amount * $usdXofRate,
            'EUR' => $amount * $eurXofRate,
            default => $amount,
        };

        return match ($toCurrency) {
            'USD' => round($amountInXof / $usdXofRate, 2),
            'EUR' => round($amountInXof / $eurXofRate, 2),
            default => round($amountInXof, 2),
        };
    }

    private function notifyCustomer(Order $order, string $reason): void
    {
        $user = User::find($order->user_id);
        if (! $user) {
            return;
        }

        app(AstralNotificationService::class)->notifyUser($user, [
            'type' => 'supplier_order_refunded',
            'title' => 'Commande remboursee',
            'subject' => 'Commande Astral4Gamer remboursee',
            'preview' => 'La livraison de ta commande #'.$order->id.' a echoue chez le fournisseur. Le montant a ete credite sur ton wallet Astral4Gamer.',
            'action_label' => 'Voir mon wallet',
            'action_url' => rtrim((string) config('services.google.frontend_url'), '/').'/wallet',
            'data' => [
                'order_id' => $order->id,
                'amount' => (float) $order->amount,
                'currency' => $order->currency,
                'reason' => $reason,
            ],
        ]);
    }
}