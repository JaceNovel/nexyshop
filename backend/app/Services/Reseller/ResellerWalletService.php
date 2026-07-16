<?php

namespace App\Services\Reseller;

use App\Models\Payment;
use App\Models\ResellerPartner;
use App\Models\ResellerWallet;
use App\Models\ResellerWalletTransaction;
use App\Services\Discord\DiscordNotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ResellerWalletService
{
    public function ensureWallet(ResellerPartner $partner): ResellerWallet
    {
        return app(AdvancedResellerWalletService::class)->ensureWallet($partner);
    }

    public function credit(ResellerPartner $partner, float $amount, string $reference, ?Payment $payment = null, array $metadata = []): ResellerWalletTransaction
    {
        return DB::transaction(function () use ($partner, $amount, $reference, $payment, $metadata) {
            $wallet = ResellerWallet::where('reseller_partner_id', $partner->id)->lockForUpdate()->first()
                ?: $this->ensureWallet($partner);

            $credited = round($amount, 2);
            $wallet->available_balance = round((float) $wallet->available_balance + $credited, 2);
            $wallet->balance = $wallet->available_balance;
            $wallet->total_recharged = round((float) $wallet->total_recharged + $amount, 2);
            $wallet->save();

            $transaction = ResellerWalletTransaction::create([
                'reseller_partner_id' => $partner->id,
                'reseller_wallet_id' => $wallet->id,
                'payment_id' => $payment?->id,
                'type' => $metadata['type'] ?? 'wallet_credit',
                'amount' => $credited,
                'direction' => 'credit',
                'status' => 'completed',
                'description' => $metadata['description'] ?? 'Crédit wallet reseller.',
                'balance_after' => $wallet->available_balance,
                'currency' => $wallet->currency,
                'reference' => $reference,
                'metadata' => $metadata + ['auto_repaid' => 0],
            ]);

            app(DiscordNotificationService::class)->resellerWalletEvent($partner, 'credit', $amount, $wallet->balance, $reference);

            app(ResellerApiSubscriptionService::class)->settleFromWallet($partner->fresh());

            DB::afterCommit(fn () => app(PendingResellerOrderService::class)->process($partner->fresh()));

            return $transaction;
        });
    }

    public function debit(ResellerPartner $partner, float $amount, string $reference, array $metadata = []): ResellerWalletTransaction
    {
        return DB::transaction(function () use ($partner, $amount, $reference, $metadata) {
            $wallet = ResellerWallet::where('reseller_partner_id', $partner->id)->lockForUpdate()->first()
                ?: $this->ensureWallet($partner);

            abort_if($wallet->wallet_status !== 'active', 403, 'Wallet reseller bloqué.');
            abort_if($partner->status !== 'active' || $partner->api_status === 'suspended' || ! $partner->order_creation_allowed, 403, 'API partenaire suspendue.');
            abort_if((float) $wallet->available_balance < $amount, 402, 'Solde reseller insuffisant.');

            $wallet->available_balance = round((float) $wallet->available_balance - $amount, 2);
            $wallet->balance = $wallet->available_balance;
            $wallet->total_spent = round((float) $wallet->total_spent + $amount, 2);
            $wallet->save();

            $transaction = ResellerWalletTransaction::create([
                'reseller_partner_id' => $partner->id,
                'reseller_wallet_id' => $wallet->id,
                'type' => $metadata['type'] ?? 'wallet_debit',
                'amount' => $amount * -1,
                'direction' => 'debit',
                'status' => 'completed',
                'description' => $metadata['description'] ?? 'Débit wallet reseller.',
                'balance_after' => $wallet->available_balance,
                'currency' => $wallet->currency,
                'reference' => $reference,
                'metadata' => $metadata,
            ]);

            if ((float) $wallet->available_balance < (float) $partner->low_balance_threshold) {
                app(DiscordNotificationService::class)->resellerLowBalance($partner, (float) $wallet->available_balance);
            }

            return $transaction;
        });
    }

    public function refundDebit(ResellerPartner $partner, float $amount, string $reference, array $metadata = []): ResellerWalletTransaction
    {
        return DB::transaction(function () use ($partner, $amount, $reference, $metadata) {
            $wallet = ResellerWallet::where('reseller_partner_id', $partner->id)->lockForUpdate()->first()
                ?: $this->ensureWallet($partner);

            $wallet->available_balance = round((float) $wallet->available_balance + $amount, 2);
            $wallet->balance = $wallet->available_balance;
            $wallet->total_spent = max(0, round((float) $wallet->total_spent - $amount, 2));
            $wallet->save();

            $transaction = ResellerWalletTransaction::create([
                'reseller_partner_id' => $partner->id,
                'reseller_wallet_id' => $wallet->id,
                'type' => $metadata['type'] ?? 'reseller_order_refund',
                'amount' => $amount,
                'direction' => 'credit',
                'status' => 'completed',
                'description' => $metadata['description'] ?? 'Remboursement commande reseller.',
                'balance_after' => $wallet->available_balance,
                'currency' => $wallet->currency,
                'reference' => $reference,
                'metadata' => $metadata,
            ]);

            DB::afterCommit(fn () => app(PendingResellerOrderService::class)->process($partner->fresh()));

            return $transaction;
        });
    }

    public function reference(string $prefix = 'A4G-WALLET'): string
    {
        return $prefix.'-'.now()->format('YmdHis').'-'.Str::upper(Str::random(6));
    }
}
