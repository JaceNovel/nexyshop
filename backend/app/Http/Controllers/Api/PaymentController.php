<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\DispatchSupplierOrder;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ResellerPartner;
use App\Models\ResellerWalletTransaction;
use App\Models\SupplierOrder;
use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Services\Payments\PaymentManager;
use App\Services\AstralNotificationService;
use App\Services\Discord\DiscordNotificationService;
use App\Services\Reseller\AdvancedResellerWalletService;
use App\Services\Reseller\NexyContractOrderService;
use App\Services\Reseller\ResellerWalletService;
use Illuminate\Contracts\Bus\Dispatcher as BusDispatcher;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class PaymentController extends Controller
{
    public function initiate(Request $request)
    {
        $data = $request->validate([
            'order_id' => ['required', 'exists:orders,id'],
            'provider' => ['required', 'in:moneroo,cinetpay,fedapay,paydunya,card,mobile_money'],
            'customer.email' => ['required_if:provider,moneroo', 'email'],
            'customer.first_name' => ['required_if:provider,moneroo', 'string', 'max:120'],
            'customer.last_name' => ['required_if:provider,moneroo', 'string', 'max:120'],
            'customer.phone' => ['nullable', 'string', 'max:40'],
            'methods' => ['nullable', 'array'],
            'methods.*' => ['string', 'max:80'],
        ]);
        $this->requireExplicitPaymentMethod($data);

        $order = Order::findOrFail($data['order_id']);
        abort_unless((int) $order->user_id === (int) $request->user()->id, 403, 'Cette commande appartient a un autre compte.');
        abort_unless($order->status === 'pending_payment', 422, 'Commande deja traitee.');

        $this->storeOrderCustomer($order, $data['customer']);
        $gateway = new PaymentManager($data['provider']);
        $paymentPayload = $this->buildPaymentPayload($order, $data);
        $checkout = $gateway->initiate($paymentPayload);
        abort_unless(! empty($checkout['checkout_url']) && ! empty($checkout['reference']), 422, 'Le prestataire n’a pas renvoyé de lien de paiement.');

        $payment = Payment::create([
            'user_id' => $request->user()->id,
            'order_id' => $order->id,
            'provider' => $data['provider'],
            'reference' => $checkout['reference'],
            'amount' => $order->amount,
            'currency' => $order->currency,
            'status' => 'initiated',
            'payload' => array_merge($checkout, [
                'metadata' => $paymentPayload['metadata'] ?? [],
                'charged_amount' => $paymentPayload['amount'] ?? null,
                'charged_currency' => $paymentPayload['currency'] ?? null,
            ]),
        ]);

        return ['payment' => $payment, 'checkout_url' => $checkout['checkout_url']];
    }

    public function initiateGuest(Request $request)
    {
        abort(401, 'Connecte-toi avant de payer.');

        $data = $request->validate([
            'order_id' => ['required', 'exists:orders,id'],
            'customer.email' => ['required', 'email'],
            'customer.first_name' => ['required', 'string', 'max:120'],
            'customer.last_name' => ['required', 'string', 'max:120'],
            'customer.phone' => ['nullable', 'string', 'max:40'],
            'methods' => ['nullable', 'array'],
            'methods.*' => ['string', 'max:80'],
        ]);
        $this->requireExplicitPaymentMethod($data);

        $order = Order::findOrFail($data['order_id']);
        abort_unless($order->status === 'pending_payment', 422, 'Commande deja traitee.');

        $this->storeOrderCustomer($order, $data['customer']);
        $user = $this->resolveUserFromCustomer($data['customer']);

        if ($user && ! $order->user_id) {
            $order->update(['user_id' => $user->id]);
            $order->refresh();
        }

        $paymentPayload = $this->buildPaymentPayload($order, ['provider' => 'moneroo', ...$data]);
        $checkout = (new PaymentManager('moneroo'))->initiate($paymentPayload);
        abort_unless(! empty($checkout['checkout_url']) && ! empty($checkout['reference']), 422, 'Moneroo n’a pas renvoyé de lien de paiement.');

        $payment = Payment::create([
            'user_id' => $user?->id,
            'order_id' => $order->id,
            'provider' => 'moneroo',
            'reference' => $checkout['reference'],
            'amount' => $order->amount,
            'currency' => $order->currency,
            'status' => 'initiated',
            'payload' => array_merge($checkout, [
                'metadata' => $paymentPayload['metadata'] ?? [],
                'charged_amount' => $paymentPayload['amount'] ?? null,
                'charged_currency' => $paymentPayload['currency'] ?? null,
            ]),
        ]);

        return response()->json(['payment' => $payment, 'checkout_url' => $checkout['checkout_url']], 201);
    }

    public function payWithWallet(Request $request)
    {
        $data = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
        ]);

        $payment = DB::transaction(function () use ($request, $data) {
            $order = Order::query()->lockForUpdate()->findOrFail($data['order_id']);
            abort_unless((int) $order->user_id === (int) $request->user()->id, 403, 'Cette commande appartient a un autre compte.');
            abort_unless($order->status === 'pending_payment', 422, 'Commande deja traitee.');

            $wallet = DB::table('wallets')
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->first();

            abort_unless($wallet, 422, 'Wallet introuvable.');

            $orderAmount = round((float) $order->amount, 2);
            $orderCurrency = strtoupper((string) $order->currency);
            $walletCurrency = strtoupper((string) ($wallet->currency ?: $orderCurrency));
            $amount = $this->convertTopupCreditAmount($orderAmount, $orderCurrency, $walletCurrency);
            $balance = round((float) $wallet->balance, 2);
            abort_unless($balance >= $amount, 422, 'Solde wallet insuffisant.');

            $balanceAfter = round($balance - $amount, 2);
            $cashbackBefore = round((float) ($wallet->cashback_balance ?? 0), 2);
            $rewardBefore = round((float) ($wallet->reward_balance ?? 0), 2);
            $cashbackDebit = min($cashbackBefore, $amount);
            $rewardDebit = min($rewardBefore, round($amount - $cashbackDebit, 2));

            DB::table('wallets')->where('id', $wallet->id)->update([
                'balance' => $balanceAfter,
                'cashback_balance' => round($cashbackBefore - $cashbackDebit, 2),
                'reward_balance' => round($rewardBefore - $rewardDebit, 2),
                'updated_at' => now(),
            ]);

            $payment = Payment::create([
                'user_id' => $request->user()->id,
                'order_id' => $order->id,
                'provider' => 'wallet',
                'reference' => 'wallet-'.$order->id.'-'.Str::lower(Str::random(10)),
                'amount' => $order->amount,
                'currency' => $order->currency,
                'status' => 'initiated',
                'payload' => [
                    'wallet_id' => $wallet->id,
                    'balance_before' => $balance,
                    'balance_after' => $balanceAfter,
                    'wallet_debit_amount' => $amount,
                    'wallet_currency' => $walletCurrency,
                    'order_amount' => $orderAmount,
                    'order_currency' => $orderCurrency,
                    'cashback_debited' => $cashbackDebit,
                    'reward_debited' => $rewardDebit,
                ],
            ]);

            DB::table('wallet_transactions')->insert([
                'user_id' => $request->user()->id,
                'wallet_id' => $wallet->id,
                'type' => 'purchase',
                'amount' => -$amount,
                'balance_after' => $balanceAfter,
                'currency' => $walletCurrency,
                'reason' => 'Paiement wallet commande #'.$order->id,
                'order_id' => $order->id,
                'payment_id' => $payment->id,
                'metadata' => json_encode([
                    'provider' => 'wallet',
                    'order_amount' => $orderAmount,
                    'order_currency' => $orderCurrency,
                    'wallet_debit_amount' => $amount,
                    'wallet_currency' => $walletCurrency,
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $payment;
        });

        $this->applyVerifiedPayment($payment, [
            'status' => 'success',
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'provider' => 'wallet',
        ]);

        return response()->json([
            'payment' => $payment->fresh(),
            'order' => Order::find($payment->order_id),
        ], 201);
    }

    public function initiateWalletTopup(Request $request)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'currency' => ['nullable', 'string', 'in:XOF,USD,EUR'],
            'customer.email' => ['required', 'email'],
            'customer.first_name' => ['required', 'string', 'max:120'],
            'customer.last_name' => ['required', 'string', 'max:120'],
            'customer.phone' => ['nullable', 'string', 'max:40'],
            'methods' => ['nullable', 'array'],
            'methods.*' => ['string', 'max:80'],
        ]);
        $this->requireExplicitPaymentMethod($data);

        $wallet = $this->ensureCustomerWallet($request->user());
        $chargedCurrency = strtoupper((string) ($data['currency'] ?? 'XOF'));
        $hasWalletHistory = DB::table('wallet_transactions')->where('wallet_id', $wallet->id)->exists();
        $hasWalletBalance = round((float) $wallet->balance, 2) !== 0.0;
        $walletCurrency = ($hasWalletHistory || $hasWalletBalance)
            ? strtoupper((string) ($wallet->currency ?: $chargedCurrency))
            : $chargedCurrency;

        if (! $hasWalletHistory && ! $hasWalletBalance && strtoupper((string) $wallet->currency) !== $walletCurrency) {
            DB::table('wallets')->where('id', $wallet->id)->update(['currency' => $walletCurrency, 'updated_at' => now()]);
            $wallet = DB::table('wallets')->where('id', $wallet->id)->first();
        }

        $chargedAmount = round((float) $data['amount'], 2);
        $creditedAmount = $this->convertTopupCreditAmount($chargedAmount, $chargedCurrency, $walletCurrency);
        $minimum = $this->minimumMonerooTopupForCurrency($chargedCurrency);
        abort_if($chargedAmount < $minimum, 422, 'Le montant minimum de recharge est de '.$minimum.' '.$chargedCurrency.'.');
        abort_if($creditedAmount <= 0, 422, 'Montant de recharge invalide.');

        $checkout = (new PaymentManager('moneroo'))->initiate([
            'amount' => $this->monerooAmountValue($chargedAmount, $chargedCurrency),
            'currency' => $chargedCurrency,
            'description' => 'Recharge wallet Astral4Gamer',
            'return_url' => config('services.payments.moneroo.return_url').'?wallet_topup=1',
            'callback_url' => $this->monerooCallbackUrl(),
            'customer' => $data['customer'],
            'methods' => $data['methods'] ?? null,
            'metadata' => [
                'type' => 'customer_wallet_topup',
                'user_id' => (string) $request->user()->id,
                'wallet_id' => (string) $wallet->id,
                'credited_amount' => $creditedAmount,
                'credited_currency' => $walletCurrency,
                'charged_amount' => $chargedAmount,
                'charged_currency' => $chargedCurrency,
            ],
        ]);

        abort_unless(! empty($checkout['checkout_url']) && ! empty($checkout['reference']), 422, 'Moneroo n’a pas renvoye de lien de paiement.');

        $payment = Payment::create([
            'user_id' => $request->user()->id,
            'provider' => 'moneroo',
            'reference' => $checkout['reference'],
            'amount' => $creditedAmount,
            'currency' => $walletCurrency,
            'status' => 'initiated',
            'payload' => array_merge($checkout, [
                'metadata' => [
                    'type' => 'customer_wallet_topup',
                    'user_id' => $request->user()->id,
                    'wallet_id' => $wallet->id,
                    'credited_amount' => $creditedAmount,
                    'credited_currency' => $walletCurrency,
                    'charged_amount' => $chargedAmount,
                    'charged_currency' => $chargedCurrency,
                ],
                'customer' => $data['customer'],
            ]),
        ]);

        return response()->json(['payment' => $payment, 'checkout_url' => $checkout['checkout_url']], 201);
    }

    public function webhook(Request $request, string $provider)
    {
        $event = (new PaymentManager($provider))->verifyWebhook($request->all());

        if ($event['reference'] ?? null) {
            $payment = Payment::where('reference', $event['reference'])->first();
            if ($payment) {
                $this->applyVerifiedPayment($payment, $event);
            }
        }

        return ['received' => true];
    }

    public function monerooReturn(Request $request)
    {
        $paymentId = (string) $request->query('paymentId');
        $orderId = (string) $request->query('order_id');
        $payment = $paymentId ? Payment::where('reference', $paymentId)->first() : null;

        if ($payment) {
            $event = (new PaymentManager('moneroo'))->verify($payment->reference);
            $this->applyVerifiedPayment($payment, $event);
        }

        $status = $payment?->fresh()->status ?? (string) $request->query('paymentStatus', 'pending');
        $frontendUrl = (string) config('services.payments.moneroo.frontend_return_url');

        return redirect()->away($frontendUrl.'?'.http_build_query([
            'paymentId' => $paymentId,
            'paymentStatus' => $status,
            'order_id' => $orderId,
            'wallet_topup' => $request->boolean('wallet_topup') ? '1' : null,
        ]));
    }

    public function monerooStatus(Request $request)
    {
        $data = $request->validate([
            'paymentId' => ['required', 'string', 'max:160'],
            'order_id' => ['required', 'integer', 'exists:orders,id'],
        ]);

        $payment = Payment::query()
            ->where('reference', $data['paymentId'])
            ->where('order_id', $data['order_id'])
            ->firstOrFail();

        if ($payment->provider === 'moneroo') {
            $event = (new PaymentManager('moneroo'))->verify($payment->reference);
            $this->applyVerifiedPayment($payment, $event);
        }

        $payment->refresh();
        $order = $payment->order_id ? Order::find($payment->order_id) : null;

        return response()->json([
            'payment' => [
                'id' => $payment->id,
                'reference' => $payment->reference,
                'status' => $payment->status,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
            ],
            'order' => $order ? [
                'id' => $order->id,
                'status' => $order->status,
                'fulfillment_status' => $order->metadata['fulfillment_status'] ?? null,
            ] : null,
        ]);
    }

    public function verify(Request $request, Payment $payment)
    {
        abort_unless($payment->provider === 'moneroo', 422, 'Verification disponible pour Moneroo.');

        $event = (new PaymentManager('moneroo'))->verify($payment->reference);
        $this->applyVerifiedPayment($payment, $event);

        return ['payment' => $payment->fresh()];
    }

    private function buildPaymentPayload(Order $order, array $data): array
    {
        $charge = $this->monerooChargeForOrder($order, $data['methods'] ?? []);

        $payload = [
            'amount' => $charge['amount'],
            'currency' => $charge['currency'],
            'description' => 'Paiement commande Astral4Gamer #'.$order->id,
            'return_url' => config('services.payments.moneroo.return_url').'?order_id='.$order->id,
            'callback_url' => $this->monerooCallbackUrl(),
            'customer' => $data['customer'],
            'metadata' => [
                'order_id' => (string) $order->id,
                'product_id' => (string) $order->product_id,
                'game_uid' => (string) $order->game_uid,
                'order_amount' => (string) $order->amount,
                'order_currency' => (string) $order->currency,
                'charged_amount' => (string) $charge['amount'],
                'charged_currency' => (string) $charge['currency'],
            ] + collect($order->metadata ?? [])
                ->only(['type', 'tournament_id', 'tournament_title', 'team_id', 'team_name', 'entry_fee_amount', 'entry_fee_currency'])
                ->map(fn ($value) => (string) $value)
                ->all(),
        ];

        if (! empty($data['methods'])) {
            $payload['methods'] = $data['methods'];
        }

        return $payload;
    }

    private function monerooChargeForOrder(Order $order, array $methods): array
    {
        $currency = strtoupper((string) $order->currency);
        $amount = $this->monerooAmount($order);

        if ($this->shouldChargeMonerooInXof($currency, $methods)) {
            return [
                'amount' => $this->convertOrderAmountToXof((float) $order->amount, $currency),
                'currency' => 'XOF',
            ];
        }

        return ['amount' => $amount, 'currency' => $currency];
    }

    private function shouldChargeMonerooInXof(string $currency, array $methods): bool
    {
        if (! in_array($currency, ['USD', 'EUR'], true)) {
            return false;
        }

        return collect($methods)->contains(function ($method) {
            if (! is_string($method)) {
                return false;
            }

            return in_array(strtolower(trim($method)), ['card', 'mobile_money', 'mobile-money'], true);
        });
    }

    private function convertOrderAmountToXof(float $amount, string $currency): int
    {
        $rate = match (strtoupper($currency)) {
            'EUR' => (float) config('services.payments.moneroo.eur_xof_rate', 660),
            default => (float) config('services.kucoin.usd_xof_rate', 610),
        };

        return max(1, (int) ceil($amount * $rate));
    }

    private function requireExplicitPaymentMethod(array $data): void
    {
        $methods = array_values(array_filter($data['methods'] ?? [], static fn ($method) => is_string($method) && trim($method) !== ''));

        abort_if($methods === [], 422, 'Choisissez votre mode de paiement avant de continuer.');
    }

    private function monerooAmount(Order $order): int|float
    {
        $amount = (float) $order->amount;
        $zeroDecimalCurrencies = ['XOF', 'XAF', 'GNF', 'RWF', 'BIF', 'UGX', 'JPY'];

        if (in_array(strtoupper((string) $order->currency), $zeroDecimalCurrencies, true)) {
            return (int) round($amount);
        }

        return round($amount, 2);
    }

    private function monerooAmountValue(float $amount, string $currency): int|float
    {
        $zeroDecimalCurrencies = ['XOF', 'XAF', 'GNF', 'RWF', 'BIF', 'UGX', 'JPY'];

        if (in_array(strtoupper($currency), $zeroDecimalCurrencies, true)) {
            return (int) round($amount);
        }

        return round($amount, 2);
    }

    private function convertTopupCreditAmount(float $amount, string $fromCurrency, string $toCurrency): float
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

    private function minimumMonerooTopupForCurrency(string $currency): float
    {
        return match (strtoupper($currency)) {
            'XOF', 'XAF' => 100,
            'USD', 'EUR' => 1,
            default => 1,
        };
    }

    private function monerooCallbackUrl(): string
    {
        $url = (string) config('services.payments.moneroo.webhook_url');
        $token = trim((string) config('services.payments.moneroo.webhook_token'));

        if ($token === '') {
            return $url;
        }

        return $url.(str_contains($url, '?') ? '&' : '?').http_build_query(['token' => $token]);
    }

    private function storeOrderCustomer(Order $order, array $customer): void
    {
        $metadata = $order->metadata ?? [];
        $metadata['customer'] = [
            'first_name' => $customer['first_name'] ?? null,
            'last_name' => $customer['last_name'] ?? null,
            'email' => $customer['email'] ?? null,
            'phone' => $customer['phone'] ?? null,
        ];

        $order->update(['metadata' => $metadata]);
    }

    public function applyVerifiedPayment(Payment $payment, array $event): void
    {
        $notificationPayload = DB::transaction(function () use ($payment, $event) {
            $status = $event['status'] ?? 'pending';
            $order = $payment->order_id ? Order::find($payment->order_id) : null;

            $payment->update([
                'status' => $status,
                'payload' => array_merge($payment->payload ?? [], ['verification' => $event]),
            ]);

            $resellerPartnerId = data_get($payment->payload, 'metadata.reseller_partner_id');
            $resellerReference = data_get($payment->payload, 'metadata.reference') ?: $payment->reference;

            if (! $order && $resellerPartnerId && $status === 'success') {
                $partner = ResellerPartner::find($resellerPartnerId);

                if ($partner) {
                    $recharge = app(AdvancedResellerWalletService::class)->confirmRechargePayment($payment);

                    if (! $recharge && ! ResellerWalletTransaction::where('payment_id', $payment->id)->exists()) {
                        app(ResellerWalletService::class)->credit(
                            $partner,
                            (float) data_get($payment->payload, 'metadata.credited_amount', $payment->amount),
                            (string) $resellerReference,
                            $payment,
                            ['provider' => $payment->provider, 'payment_reference' => $payment->reference, 'type' => 'wallet_credit']
                        );
                    }
                }

                return ['order_id' => null, 'user_id' => null, 'amount' => $payment->amount, 'currency' => $payment->currency];
            }

            $tournamentId = data_get($payment->payload, 'metadata.tournament_id');

            if (! $order && $tournamentId && $status === 'success') {
                $tournament = Tournament::find($tournamentId);

                if ($tournament) {
                    $rules = $tournament->rules ?? [];
                    $rules['payment_status'] = 'paid';
                    $rules['payment_reference'] = $payment->reference;
                    $tournament->update(['rules' => $rules]);
                }

                return ['order_id' => null, 'user_id' => $payment->user_id, 'amount' => $payment->amount, 'currency' => $payment->currency];
            }

            if (! $order && data_get($payment->payload, 'metadata.type') === 'customer_wallet_topup' && $status === 'success') {
                $this->creditCustomerWalletTopup($payment);

                return [
                    'order_id' => null,
                    'user_id' => $payment->user_id,
                    'amount' => $payment->amount,
                    'currency' => $payment->currency,
                    'kind' => 'wallet_topup',
                ];
            }

            if (! $order || $status !== 'success') {
                return null;
            }

            if ($order->status === 'paid') {
                $metadata = $order->metadata ?? [];
                $shouldFulfillSupplier = $this->shouldFulfillSupplier($order);
                $nexyContract = app(NexyContractOrderService::class)->attachPaidSiteOrder($order);

                if (! empty($nexyContract['applies']) && empty($nexyContract['ready'])) {
                    $shouldFulfillSupplier = false;
                }

                $this->recordCommercePayment($order, $payment);

                return [
                    'order_id' => $order->id,
                    'user_id' => $payment->user_id ?: $order->user_id,
                    'amount' => $payment->amount,
                    'currency' => $payment->currency,
                    'manual_fulfillment' => ! empty($metadata['manual_fulfillment']),
                    'should_fulfill_supplier' => $shouldFulfillSupplier,
                ];
            }

            if ($this->isUnderpaid($event, $order, $payment)) {
                $payment->update(['status' => 'amount_mismatch']);
                return null;
            }

            if (! $this->eventCurrencyMatchesPayment($event, $order, $payment)) {
                $payment->update(['status' => 'currency_mismatch']);
                return null;
            }

            $metadata = $order->metadata ?? [];
            $shouldFulfillSupplier = $this->shouldFulfillSupplier($order);

            if (! empty($metadata['manual_fulfillment'])) {
                $metadata['fulfillment_status'] = 'awaiting_delivery';
                $metadata['paid_at'] = now()->toIso8601String();
            }

            if (($metadata['type'] ?? null) === 'astral_esport_challenge') {
                $metadata['challenge_status'] = 'accepted';
                $metadata['challenge_status_label'] = 'Défi accepté';
                $metadata['challenge_schedule'] = [
                    'starts_at' => '2026-07-07 20:00:00',
                    'label' => 'Programmé le 07 Jul 2026, 20h00',
                ];
                $metadata['room_notice'] = 'Les coordonnées seront affichées ici.';
                $metadata['selection_notice'] = 'Si votre équipe parvient à gagner, le meilleur joueur sera sélectionné pour rejoindre la team Astral Esport avec une rémunération mensuelle de 50$ à 100$ par mois.';
            }

            if (($metadata['type'] ?? null) === 'tournament_registration') {
                $metadata['fulfillment_status'] = 'awaiting_tournament_validation';
                $metadata['challenge_status'] = 'processing_challenge';
            }

            if ($shouldFulfillSupplier) {
                $metadata['fulfillment_status'] = 'pending_supplier';
                $metadata['paid_at'] = now()->toIso8601String();
            }

            $order->update(['status' => 'paid', 'metadata' => $metadata]);
            $nexyContract = app(NexyContractOrderService::class)->attachPaidSiteOrder($order->fresh());

            if (! empty($nexyContract['applies']) && empty($nexyContract['ready'])) {
                $shouldFulfillSupplier = false;
            }

            $this->recordCommercePayment($order->fresh(), $payment);

            return [
                'order_id' => $order->id,
                'user_id' => $payment->user_id ?: $order->user_id,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'manual_fulfillment' => ! empty($metadata['manual_fulfillment']),
                'tournament_registration' => ($metadata['type'] ?? null) === 'tournament_registration',
                'tournament_id' => $metadata['tournament_id'] ?? null,
                'team_id' => $metadata['team_id'] ?? null,
                'should_fulfill_supplier' => $shouldFulfillSupplier,
            ];
        });

        if ($notificationPayload && ! empty($notificationPayload['should_fulfill_supplier']) && $notificationPayload['order_id']) {
            $this->fulfillSupplierOrderNow((int) $notificationPayload['order_id']);
        }

        if ($notificationPayload && $notificationPayload['user_id']) {
            $user = \App\Models\User::find($notificationPayload['user_id']);

            if ($user) {
                $isWalletTopup = ($notificationPayload['kind'] ?? null) === 'wallet_topup';
                $isTournamentPayment = empty($notificationPayload['order_id']) && ! $isWalletTopup;
                app(AstralNotificationService::class)->notifyUser($user, [
                    'type' => 'payment_success',
                    'title' => $isWalletTopup ? 'Wallet recharge' : 'Paiement confirme',
                    'subject' => $isWalletTopup ? 'Recharge wallet Astral4Gamer confirmee' : 'Paiement Astral4Gamer confirme',
                    'preview' => $isTournamentPayment
                        ? "Ton paiement de {$notificationPayload['amount']} {$notificationPayload['currency']} pour le tournoi est confirme."
                        : ($isWalletTopup
                            ? "Ton wallet a ete recharge de {$notificationPayload['amount']} {$notificationPayload['currency']}."
                            : "Ton paiement de {$notificationPayload['amount']} {$notificationPayload['currency']} pour la commande #{$notificationPayload['order_id']} est confirme."),
                    'action_label' => $isWalletTopup ? 'Voir mon wallet' : ($isTournamentPayment ? 'Voir mes tournois' : 'Voir ma commande'),
                    'action_url' => rtrim((string) config('services.google.frontend_url'), '/').($isWalletTopup ? '/wallet' : ($isTournamentPayment ? '/tournois?tab=mine' : '/profil')),
                    'data' => ['order_id' => $notificationPayload['order_id'], 'payment_id' => $payment->id],
                ]);
            }
        }

        if ($notificationPayload && ! empty($notificationPayload['manual_fulfillment']) && $notificationPayload['order_id']) {
            $order = Order::find($notificationPayload['order_id']);

            if ($order) {
                if (! empty($notificationPayload['tournament_registration'])) {
                    $this->confirmTournamentRegistrationPayment($order, $notificationPayload);
                } else {
                    app(DiscordNotificationService::class)->manualFulfillmentPaid($order);
                }
            }
        }
    }

    private function confirmTournamentRegistrationPayment(Order $order, array $notificationPayload): void
    {
        $metadata = $order->metadata ?? [];
        $team = TournamentTeam::find($notificationPayload['team_id'] ?? ($metadata['team_id'] ?? null));
        $tournament = Tournament::find($notificationPayload['tournament_id'] ?? ($metadata['tournament_id'] ?? null));

        if (! $team || ! $tournament) {
            app(DiscordNotificationService::class)->manualFulfillmentPaid($order);
            return;
        }

        $teamMetadata = $team->metadata ?? [];
        $teamMetadata['payment_status'] = 'paid';
        $teamMetadata['payment_order_id'] = $order->id;
        $teamMetadata['payment_confirmed_at'] = now()->toIso8601String();
        $teamMetadata['challenge_status'] = 'processing_challenge';
        $teamMetadata['room_notice'] = 'Les coordonnees de la room et les horaires seront affiches apres validation Astral.';

        $team->update([
            'status' => 'pending_validation',
            'metadata' => $teamMetadata,
        ]);

        app(DiscordNotificationService::class)->tournamentRegistration($tournament, $team->fresh(), User::find($order->user_id));
    }

    private function ensureCustomerWallet(User $user): object
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

    private function creditCustomerWalletTopup(Payment $payment): void
    {
        if (DB::table('wallet_transactions')->where('payment_id', $payment->id)->where('type', 'deposit')->exists()) {
            return;
        }

        $user = User::find($payment->user_id);
        if (! $user) return;

        $wallet = $this->ensureCustomerWallet($user);
        $amount = round((float) data_get($payment->payload, 'metadata.credited_amount', $payment->amount), 2);
        $balance = round((float) $wallet->balance + $amount, 2);

        DB::table('wallets')->where('id', $wallet->id)->update([
            'balance' => $balance,
            'updated_at' => now(),
        ]);

        DB::table('wallet_transactions')->insert([
            'user_id' => $user->id,
            'wallet_id' => $wallet->id,
            'type' => 'deposit',
            'amount' => $amount,
            'balance_after' => $balance,
            'currency' => $payment->currency,
            'reason' => 'Recharge wallet Moneroo',
            'payment_id' => $payment->id,
            'metadata' => json_encode(['provider' => 'moneroo', 'payment_reference' => $payment->reference]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function recordCommercePayment(Order $order, Payment $payment): void
    {
        DB::table('order_events')->updateOrInsert(['order_id' => $order->id, 'status' => 'payment_received'], [
            'title' => 'Paiement recu',
            'message' => 'Paiement confirme. Ta commande est en cours de traitement.',
            'visible_to_customer' => true,
            'updated_at' => now(),
            'created_at' => $payment->updated_at ?? now(),
        ]);

        if (! $order->user_id || DB::table('wallet_transactions')->where('payment_id', $payment->id)->where('type', 'cashback')->exists()) {
            return;
        }

        $paidOrders = Order::query()->where('user_id', $order->user_id)->whereIn('status', ['paid', 'delivered', 'completed'])->get();
        $ordersCount = $paidOrders->count();
        $spend = (float) $paidOrders->sum('amount');
        $cashbackPercent = (float) DB::table('vip_levels')
            ->where(function ($query) use ($ordersCount, $spend) {
                $query->where('min_orders', '<=', $ordersCount)->orWhere('min_spend', '<=', $spend);
            })
            ->orderByDesc('cashback_percent')
            ->value('cashback_percent');

        if ($cashbackPercent <= 0) {
            return;
        }

        $cashback = round(((float) $order->amount * $cashbackPercent) / 100, 2);
        if ($cashback <= 0) {
            return;
        }

        $wallet = DB::table('wallets')->where('user_id', $order->user_id)->first();
        if (! $wallet) {
            $walletId = DB::table('wallets')->insertGetId([
                'user_id' => $order->user_id,
                'balance' => 0,
                'reward_balance' => 0,
                'cashback_balance' => 0,
                'currency' => $order->currency,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $wallet = DB::table('wallets')->where('id', $walletId)->first();
        }

        $walletCurrency = strtoupper((string) ($wallet->currency ?: $order->currency));
        $orderCurrency = strtoupper((string) $order->currency);
        $creditedCashback = $this->convertTopupCreditAmount($cashback, $orderCurrency, $walletCurrency);
        if ($creditedCashback <= 0) {
            return;
        }

        $balance = round((float) $wallet->balance + $creditedCashback, 2);
        DB::table('wallets')->where('id', $wallet->id)->update([
            'balance' => $balance,
            'cashback_balance' => round((float) $wallet->cashback_balance + $creditedCashback, 2),
            'updated_at' => now(),
        ]);
        DB::table('wallet_transactions')->insert([
            'user_id' => $order->user_id,
            'wallet_id' => $wallet->id,
            'type' => 'cashback',
            'amount' => $creditedCashback,
            'balance_after' => $balance,
            'currency' => $walletCurrency,
            'reason' => 'Cashback VIP commande #'.$order->id,
            'order_id' => $order->id,
            'payment_id' => $payment->id,
            'metadata' => json_encode([
                'original_amount' => $cashback,
                'original_currency' => $orderCurrency,
                'credited_amount' => $creditedCashback,
                'credited_currency' => $walletCurrency,
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function fulfillSupplierOrderNow(int $orderId): void
    {
        $order = Order::find($orderId);

        if (! $order || ! empty($order->metadata['manual_fulfillment'])) {
            return;
        }

        if (SupplierOrder::where('order_id', $order->id)->exists()) {
            return;
        }

        try {
            app(BusDispatcher::class)->dispatchSync(new DispatchSupplierOrder($order));
        } catch (Throwable $exception) {
            report($exception);

            $metadata = $order->metadata ?? [];
            $metadata['fulfillment_status'] = 'supplier_dispatch_failed';
            $metadata['fulfillment_error'] = Str::limit($exception->getMessage(), 500);
            $metadata['fulfillment_failed_at'] = now()->toIso8601String();
            $metadata['fulfillment_retry_after'] = now()->addMinutes(15)->toIso8601String();
            $order->update(['metadata' => $metadata]);

            if (config('queue.default') !== 'sync') {
                DispatchSupplierOrder::dispatch($order)->delay(now()->addMinutes(15));
            }
        }
    }

    private function shouldFulfillSupplier(Order $order): bool
    {
        $metadata = $order->metadata ?? [];

        if (! empty($metadata['manual_fulfillment']) || SupplierOrder::where('order_id', $order->id)->exists()) {
            return false;
        }

        if (($metadata['fulfillment_status'] ?? null) !== 'supplier_dispatch_failed') {
            return true;
        }

        $retryAfter = $metadata['fulfillment_retry_after'] ?? null;

        if (! $retryAfter) {
            return false;
        }

        try {
            return Carbon::parse($retryAfter)->isPast();
        } catch (Throwable) {
            return false;
        }
    }

    private function isUnderpaid(array $event, Order $order, Payment $payment): bool
    {
        if (! isset($event['amount']) || ! is_numeric($event['amount'])) {
            return false;
        }

        $paid = (float) $event['amount'];
        $expected = (float) data_get($payment?->payload, 'charged_amount', $order->amount);
        $currency = strtoupper((string) data_get($payment?->payload, 'charged_currency', $order->currency));
        $tolerance = in_array($currency, ['XOF', 'XAF', 'GNF', 'RWF', 'BIF', 'UGX', 'JPY'], true)
            ? 1.0
            : 0.05;

        return $paid + $tolerance < $expected;
    }

    private function eventCurrencyMatchesPayment(array $event, Order $order, Payment $payment): bool
    {
        $expectedCurrency = strtoupper((string) data_get($payment->payload, 'charged_currency', $order->currency));
        $eventCurrency = strtoupper((string) ($event['currency'] ?? $expectedCurrency));

        return $eventCurrency === $expectedCurrency;
    }

    private function resolveUserFromCustomer(array $customer): ?User
    {
        $email = trim((string) ($customer['email'] ?? ''));

        if ($email === '') {
            return null;
        }

        return User::query()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($email)])
            ->first();
    }
}
