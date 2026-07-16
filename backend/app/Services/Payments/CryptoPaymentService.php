<?php

namespace App\Services\Payments;

use App\Http\Controllers\Api\PaymentController;
use App\Models\CryptoDeposit;
use App\Models\CryptoPaymentIntent;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ResellerPartner;
use App\Services\KuCoin\KuCoinService;
use App\Services\Reseller\AdvancedResellerWalletService;
use App\Services\Reseller\ResellerWalletService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CryptoPaymentService
{
    public function __construct(private readonly KuCoinService $kuCoin)
    {
    }

    public function quote(float $amount, string $fiatCurrency, string $cryptoCurrency = 'USDT'): array
    {
        $rate = $this->kuCoin->price(strtoupper($cryptoCurrency), strtoupper($fiatCurrency));
        abort_if(! $rate || $rate <= 0, 422, 'Taux crypto indisponible pour cette devise.');

        return [
            'fiat_amount' => round($amount, 2),
            'fiat_currency' => strtoupper($fiatCurrency),
            'crypto_currency' => strtoupper($cryptoCurrency),
            'rate' => $rate,
            'crypto_amount' => round($amount / $rate, 8),
            'expires_in_minutes' => (int) config('services.kucoin.intent_expiry_minutes', 45),
        ];
    }

    public function createCustomerIntent(array $data, int $userId): CryptoPaymentIntent
    {
        $purpose = $data['purpose'];
        $order = null;
        $amount = 0.0;
        $currency = strtoupper((string) ($data['currency'] ?? 'XOF'));

        if ($purpose === 'checkout') {
            $order = Order::query()->where('user_id', $userId)->findOrFail((int) $data['order_id']);
            abort_unless($order->status === 'pending_payment', 422, 'Commande deja traitee.');
            $amount = round((float) $order->amount, 2);
            $currency = strtoupper((string) $order->currency);
        } else {
            $amount = round((float) $data['amount'], 2);
        }

        $payment = Payment::create([
            'user_id' => $userId,
            'order_id' => $order?->id,
            'provider' => 'kucoin_crypto',
            'reference' => $this->reference('A4G-CRYPTO'),
            'amount' => $amount,
            'currency' => $currency,
            'status' => 'initiated',
            'payload' => [
                'metadata' => $purpose === 'wallet_topup' ? [
                    'type' => 'customer_wallet_topup',
                    'user_id' => $userId,
                    'credited_amount' => $amount,
                ] : ['type' => 'checkout'],
            ],
        ]);

        return $this->createIntent($payment, [
            'user_id' => $userId,
            'order_id' => $order?->id,
            'purpose' => $purpose,
            'fiat_amount' => $amount,
            'fiat_currency' => $currency,
            'crypto_currency' => $data['crypto_currency'] ?? 'USDT',
            'network' => $data['network'] ?? null,
            'metadata' => ['customer' => Arr::except($data['customer'] ?? [], ['phone'])],
        ]);
    }

    public function createResellerTopupIntent(ResellerPartner $partner, array $data): CryptoPaymentIntent
    {
        $wallet = app(ResellerWalletService::class)->ensureWallet($partner);
        $advancedWallets = app(AdvancedResellerWalletService::class);
        $amount = round((float) $data['amount'], 2);
        $type = $data['recharge_type'] ?? 'standard';
        $minimum = $advancedWallets->minimumTopup($partner);
        abort_if($amount < $minimum, 422, 'Le montant minimum de recharge est de '.$minimum.' '.$wallet->currency.'.');
        abort_if($wallet->wallet_status === 'suspended', 403, 'Wallet partenaire suspendu.');

        $fee = $type === 'express' ? $advancedWallets->expressFee($amount, $partner) : 0;
        abort_if($type === 'express' && ! (bool) ($data['accept_express_fee'] ?? false), 422, 'Vous devez accepter les frais express.');
        $total = round($amount + $fee, 2);
        $reference = app(ResellerWalletService::class)->reference('A4G-RESELLER-CRYPTO');

        $payment = Payment::create([
            'provider' => 'kucoin_crypto',
            'reference' => $this->reference('A4G-CRYPTO'),
            'amount' => $total,
            'currency' => $wallet->currency,
            'status' => 'initiated',
            'payload' => [
                'metadata' => [
                    'type' => 'reseller_topup',
                    'reseller_partner_id' => $partner->id,
                    'reference' => $reference,
                    'recharge_type' => $type,
                    'credited_amount' => $amount,
                    'fee' => $fee,
                ],
            ],
        ]);

        $recharge = $advancedWallets->createRecharge($partner, $payment, $type, $amount, $fee, $reference, ['provider' => 'kucoin_crypto']);

        return $this->createIntent($payment, [
            'reseller_partner_id' => $partner->id,
            'purpose' => 'reseller_topup',
            'fiat_amount' => $total,
            'fiat_currency' => $wallet->currency,
            'crypto_currency' => $data['crypto_currency'] ?? 'USDT',
            'network' => $data['network'] ?? null,
            'metadata' => ['recharge_id' => $recharge->id, 'reference' => $reference],
        ]);
    }

    public function syncDeposits(array $query = []): int
    {
        $count = 0;
        foreach ($this->kuCoin->deposits($query) as $item) {
            $deposit = $this->storeDeposit(Arr::wrap($item));
            if ($deposit->status === 'success' && ! $deposit->credited_at) {
                $intent = $this->matchIntent($deposit);
                if ($intent) {
                    $this->creditIntent($intent, $deposit);
                    $count++;
                }
            }
        }

        return $count;
    }

    private function createIntent(Payment $payment, array $payload): CryptoPaymentIntent
    {
        $quote = $this->quote((float) $payload['fiat_amount'], (string) $payload['fiat_currency'], (string) $payload['crypto_currency']);
        $address = $this->kuCoin->depositAddress($quote['crypto_currency'], $payload['network'] ?? null);

        $intent = CryptoPaymentIntent::create([
            'user_id' => $payload['user_id'] ?? null,
            'reseller_partner_id' => $payload['reseller_partner_id'] ?? null,
            'order_id' => $payload['order_id'] ?? null,
            'payment_id' => $payment->id,
            'purpose' => $payload['purpose'],
            'reference' => $this->reference('A4G-KC'),
            'fiat_amount' => $quote['fiat_amount'],
            'fiat_currency' => $quote['fiat_currency'],
            'crypto_currency' => $quote['crypto_currency'],
            'network' => $payload['network'] ?? ($address['chain'] ?? $address['network'] ?? null),
            'expected_crypto_amount' => $quote['crypto_amount'],
            'deposit_address' => $address['address'] ?? null,
            'deposit_memo' => $address['memo'] ?? $address['tag'] ?? null,
            'status' => 'pending',
            'expires_at' => now()->addMinutes($quote['expires_in_minutes']),
            'metadata' => array_merge($payload['metadata'] ?? [], ['quote' => $quote, 'deposit_address_payload' => $address]),
        ]);

        $payment->update(['payload' => array_merge($payment->payload ?? [], ['crypto_intent_id' => $intent->id, 'metadata' => array_merge(data_get($payment->payload, 'metadata', []), ['crypto_intent_reference' => $intent->reference])])]);

        return $intent->fresh('payment');
    }

    private function storeDeposit(array $item): CryptoDeposit
    {
        $providerId = (string) ($item['id'] ?? $item['walletTxId'] ?? $item['txId'] ?? $item['hash'] ?? Str::uuid());
        $status = $this->normalizeDepositStatus((string) ($item['status'] ?? $item['state'] ?? 'pending'));

        return CryptoDeposit::updateOrCreate([
            'provider' => 'kucoin',
            'provider_deposit_id' => $providerId,
        ], [
            'tx_hash' => $item['walletTxId'] ?? $item['txId'] ?? $item['hash'] ?? null,
            'currency' => strtoupper((string) ($item['currency'] ?? '')),
            'network' => $item['chain'] ?? $item['network'] ?? null,
            'amount' => (float) ($item['amount'] ?? 0),
            'address' => $item['address'] ?? null,
            'memo' => $item['memo'] ?? $item['tag'] ?? null,
            'status' => $status,
            'observed_at' => isset($item['createdAt']) && is_numeric($item['createdAt']) ? Carbon::createFromTimestampMs((int) $item['createdAt']) : now(),
            'raw_payload' => $item,
        ]);
    }

    private function matchIntent(CryptoDeposit $deposit): ?CryptoPaymentIntent
    {
        return CryptoPaymentIntent::query()
            ->where('status', 'pending')
            ->where('crypto_currency', strtoupper($deposit->currency))
            ->where('deposit_address', $deposit->address)
            ->where('expected_crypto_amount', '<=', round((float) $deposit->amount + 0.00000001, 10))
            ->where(function ($query) use ($deposit) {
                $query->whereNull('network')->orWhere('network', $deposit->network);
            })
            ->where(function ($query) use ($deposit) {
                $query->whereNull('deposit_memo')->orWhere('deposit_memo', $deposit->memo);
            })
            ->orderBy('created_at')
            ->first();
    }

    private function creditIntent(CryptoPaymentIntent $intent, CryptoDeposit $deposit): void
    {
        DB::transaction(function () use ($intent, $deposit) {
            $intent = CryptoPaymentIntent::query()->lockForUpdate()->findOrFail($intent->id);
            if ($intent->status === 'confirmed') {
                return;
            }

            $payment = Payment::query()->lockForUpdate()->findOrFail($intent->payment_id);
            $payment->update(['status' => 'success']);
            $intent->update([
                'status' => 'confirmed',
                'received_crypto_amount' => (float) $deposit->amount,
                'paid_at' => now(),
                'metadata' => array_merge($intent->metadata ?? [], ['deposit_id' => $deposit->id, 'tx_hash' => $deposit->tx_hash]),
            ]);
            $deposit->update(['crypto_payment_intent_id' => $intent->id, 'credited_at' => now()]);
        });

        app(PaymentController::class)->applyVerifiedPayment($intent->payment->fresh(), [
            'reference' => $intent->payment->reference,
            'status' => 'success',
            'amount' => (float) $intent->fiat_amount,
            'currency' => $intent->fiat_currency,
            'provider' => 'kucoin_crypto',
            'raw' => ['deposit_id' => $deposit->id, 'tx_hash' => $deposit->tx_hash],
        ]);
    }

    private function normalizeDepositStatus(string $status): string
    {
        $status = strtolower($status);
        return in_array($status, ['success', 'successful', 'done', 'confirmed'], true) ? 'success' : $status;
    }

    private function reference(string $prefix): string
    {
        return $prefix.'-'.now()->format('YmdHis').'-'.Str::upper(Str::random(6));
    }
}