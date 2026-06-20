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
        return $partner->wallet()->firstOrCreate([], [
            'balance' => 0,
            'currency' => 'USD',
        ]);
    }

    public function credit(ResellerPartner $partner, float $amount, string $reference, ?Payment $payment = null, array $metadata = []): ResellerWalletTransaction
    {
        return DB::transaction(function () use ($partner, $amount, $reference, $payment, $metadata) {
            $wallet = ResellerWallet::where('reseller_partner_id', $partner->id)->lockForUpdate()->first()
                ?: $this->ensureWallet($partner);

            $wallet->balance = round((float) $wallet->balance + $amount, 2);
            $wallet->save();

            $transaction = ResellerWalletTransaction::create([
                'reseller_partner_id' => $partner->id,
                'reseller_wallet_id' => $wallet->id,
                'payment_id' => $payment?->id,
                'type' => 'credit',
                'amount' => $amount,
                'balance_after' => $wallet->balance,
                'currency' => $wallet->currency,
                'reference' => $reference,
                'metadata' => $metadata,
            ]);

            app(DiscordNotificationService::class)->resellerWalletEvent($partner, 'credit', $amount, $wallet->balance, $reference);

            return $transaction;
        });
    }

    public function debit(ResellerPartner $partner, float $amount, string $reference, array $metadata = []): ResellerWalletTransaction
    {
        return DB::transaction(function () use ($partner, $amount, $reference, $metadata) {
            $wallet = ResellerWallet::where('reseller_partner_id', $partner->id)->lockForUpdate()->first()
                ?: $this->ensureWallet($partner);

            abort_if((float) $wallet->balance < $amount, 402, 'Solde reseller insuffisant.');

            $wallet->balance = round((float) $wallet->balance - $amount, 2);
            $wallet->save();

            $transaction = ResellerWalletTransaction::create([
                'reseller_partner_id' => $partner->id,
                'reseller_wallet_id' => $wallet->id,
                'type' => 'debit',
                'amount' => $amount * -1,
                'balance_after' => $wallet->balance,
                'currency' => $wallet->currency,
                'reference' => $reference,
                'metadata' => $metadata,
            ]);

            if ((float) $wallet->balance < (float) $partner->low_balance_threshold) {
                app(DiscordNotificationService::class)->resellerLowBalance($partner, (float) $wallet->balance);
            }

            return $transaction;
        });
    }

    public function reference(string $prefix = 'A4G-WALLET'): string
    {
        return $prefix.'-'.now()->format('YmdHis').'-'.Str::upper(Str::random(6));
    }
}
