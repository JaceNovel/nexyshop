<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\DispatchSupplierOrder;
use App\Models\Order;
use App\Models\Payment;
use App\Models\SupplierOrder;
use App\Services\Payments\PaymentManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $gateway = new PaymentManager($data['provider']);
        $checkout = $gateway->initiate($this->buildPaymentPayload($order, $data));

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

        $checkout = (new PaymentManager('moneroo'))->initiate($this->buildPaymentPayload($order, ['provider' => 'moneroo', ...$data]));

        $payment = Payment::create([
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
            'amount' => (int) round($order->amount),
            'currency' => $order->currency,
            'description' => 'Payment for NEXY order #'.$order->id,
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

    private function applyVerifiedPayment(Payment $payment, array $event): void
    {
        DB::transaction(function () use ($payment, $event) {
            $status = $event['status'] ?? 'pending';
            $order = $payment->order_id ? Order::find($payment->order_id) : null;

            $payment->update([
                'status' => $status,
                'payload' => array_merge($payment->payload ?? [], ['verification' => $event]),
            ]);

            if (! $order || $status !== 'success') {
                return;
            }

            if ((float) ($event['amount'] ?? 0) < (float) $order->amount) {
                $payment->update(['status' => 'amount_mismatch']);
                return;
            }

            if (($event['currency'] ?? $order->currency) !== $order->currency) {
                $payment->update(['status' => 'currency_mismatch']);
                return;
            }

            $order->update(['status' => 'paid']);

            if (! SupplierOrder::where('order_id', $order->id)->exists()) {
                DispatchSupplierOrder::dispatch($order);
            }
        });
    }
}
