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
use App\Models\User;
use App\Services\Payments\PaymentManager;
use App\Services\AstralNotificationService;
use App\Services\Discord\DiscordNotificationService;
use App\Services\Reseller\ResellerWalletService;
use Illuminate\Contracts\Bus\Dispatcher as BusDispatcher;
use Illuminate\Http\Request;
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

        $order = Order::findOrFail($data['order_id']);
        $this->storeOrderCustomer($order, $data['customer']);
        $gateway = new PaymentManager($data['provider']);
        $checkout = $gateway->initiate($this->buildPaymentPayload($order, $data));
        abort_unless(! empty($checkout['checkout_url']) && ! empty($checkout['reference']), 422, 'Le prestataire n’a pas renvoyé de lien de paiement.');

        $payment = Payment::create([
            'user_id' => $request->user()->id,
            'order_id' => $order->id,
            'provider' => $data['provider'],
            'reference' => $checkout['reference'],
            'amount' => $order->amount,
            'currency' => $order->currency,
            'status' => 'initiated',
            'payload' => $checkout,
        ]);

        return ['payment' => $payment, 'checkout_url' => $checkout['checkout_url']];
    }

    public function initiateGuest(Request $request)
    {
        $data = $request->validate([
            'order_id' => ['required', 'exists:orders,id'],
            'customer.email' => ['required', 'email'],
            'customer.first_name' => ['required', 'string', 'max:120'],
            'customer.last_name' => ['required', 'string', 'max:120'],
            'customer.phone' => ['nullable', 'string', 'max:40'],
            'methods' => ['nullable', 'array'],
            'methods.*' => ['string', 'max:80'],
        ]);

        $order = Order::findOrFail($data['order_id']);
        abort_unless($order->status === 'pending_payment', 422, 'Commande deja traitee.');

        $this->storeOrderCustomer($order, $data['customer']);
        $user = $this->resolveUserFromCustomer($data['customer']);

        if ($user && ! $order->user_id) {
            $order->update(['user_id' => $user->id]);
            $order->refresh();
        }

        $checkout = (new PaymentManager('moneroo'))->initiate($this->buildPaymentPayload($order, ['provider' => 'moneroo', ...$data]));
        abort_unless(! empty($checkout['checkout_url']) && ! empty($checkout['reference']), 422, 'Moneroo n’a pas renvoyé de lien de paiement.');

        $payment = Payment::create([
            'user_id' => $user?->id,
            'order_id' => $order->id,
            'provider' => 'moneroo',
            'reference' => $checkout['reference'],
            'amount' => $order->amount,
            'currency' => $order->currency,
            'status' => 'initiated',
            'payload' => $checkout,
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
        ]));
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
        $payload = [
            'amount' => $this->monerooAmount($order),
            'currency' => $order->currency,
            'description' => 'Paiement commande Astral4Gamer #'.$order->id,
            'return_url' => config('services.payments.moneroo.return_url').'?order_id='.$order->id,
            'customer' => $data['customer'],
            'metadata' => [
                'order_id' => (string) $order->id,
                'product_id' => (string) $order->product_id,
                'game_uid' => (string) $order->game_uid,
            ],
        ];

        if (! empty($data['methods'])) {
            $payload['methods'] = $data['methods'];
        }

        return $payload;
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

    private function applyVerifiedPayment(Payment $payment, array $event): void
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

                if ($partner && ! ResellerWalletTransaction::where('payment_id', $payment->id)->exists()) {
                    app(ResellerWalletService::class)->credit(
                        $partner,
                        (float) $payment->amount,
                        (string) $resellerReference,
                        $payment,
                        ['provider' => $payment->provider, 'payment_reference' => $payment->reference]
                    );
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

            if (! $order || $status !== 'success') {
                return null;
            }

            if ($order->status === 'paid') {
                $metadata = $order->metadata ?? [];
                $shouldFulfillSupplier = empty($metadata['manual_fulfillment'])
                    && ! SupplierOrder::where('order_id', $order->id)->exists();

                return [
                    'order_id' => $order->id,
                    'user_id' => $payment->user_id ?: $order->user_id,
                    'amount' => $payment->amount,
                    'currency' => $payment->currency,
                    'manual_fulfillment' => ! empty($metadata['manual_fulfillment']),
                    'should_fulfill_supplier' => $shouldFulfillSupplier,
                ];
            }

            if ((float) ($event['amount'] ?? 0) < (float) $order->amount) {
                $payment->update(['status' => 'amount_mismatch']);
                return null;
            }

            if (($event['currency'] ?? $order->currency) !== $order->currency) {
                $payment->update(['status' => 'currency_mismatch']);
                return null;
            }

            $metadata = $order->metadata ?? [];
            $shouldFulfillSupplier = empty($metadata['manual_fulfillment'])
                && ! SupplierOrder::where('order_id', $order->id)->exists();

            if (! empty($metadata['manual_fulfillment'])) {
                $metadata['fulfillment_status'] = 'awaiting_delivery';
                $metadata['paid_at'] = now()->toIso8601String();
            }

            if ($shouldFulfillSupplier) {
                $metadata['fulfillment_status'] = 'pending_supplier';
                $metadata['paid_at'] = now()->toIso8601String();
            }

            $order->update(['status' => 'paid', 'metadata' => $metadata]);

            return [
                'order_id' => $order->id,
                'user_id' => $payment->user_id ?: $order->user_id,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'manual_fulfillment' => ! empty($metadata['manual_fulfillment']),
                'should_fulfill_supplier' => $shouldFulfillSupplier,
            ];
        });

        if ($notificationPayload && ! empty($notificationPayload['should_fulfill_supplier']) && $notificationPayload['order_id']) {
            $this->fulfillSupplierOrderNow((int) $notificationPayload['order_id']);
        }

        if ($notificationPayload && $notificationPayload['user_id']) {
            $user = \App\Models\User::find($notificationPayload['user_id']);

            if ($user) {
                $isTournamentPayment = empty($notificationPayload['order_id']);
                app(AstralNotificationService::class)->notifyUser($user, [
                    'type' => 'payment_success',
                    'title' => 'Paiement confirme',
                    'subject' => 'Paiement Astral4Gamer confirme',
                    'preview' => $isTournamentPayment
                        ? "Ton paiement de {$notificationPayload['amount']} {$notificationPayload['currency']} pour le tournoi est confirme."
                        : "Ton paiement de {$notificationPayload['amount']} {$notificationPayload['currency']} pour la commande #{$notificationPayload['order_id']} est confirme.",
                    'action_label' => $isTournamentPayment ? 'Voir mes tournois' : 'Voir ma commande',
                    'action_url' => rtrim((string) config('services.google.frontend_url'), '/').($isTournamentPayment ? '/tournois?tab=mine' : '/profil'),
                    'data' => ['order_id' => $notificationPayload['order_id'], 'payment_id' => $payment->id],
                ]);
            }
        }

        if ($notificationPayload && ! empty($notificationPayload['manual_fulfillment']) && $notificationPayload['order_id']) {
            $order = Order::find($notificationPayload['order_id']);

            if ($order) {
                app(DiscordNotificationService::class)->manualFulfillmentPaid($order);
            }
        }
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
            $order->update(['metadata' => $metadata]);

            DispatchSupplierOrder::dispatch($order)->delay(now()->addMinute());
        }
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
