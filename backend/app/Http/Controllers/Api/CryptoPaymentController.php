<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CryptoPaymentIntent;
use App\Services\Payments\CryptoPaymentService;
use Illuminate\Http\Request;

class CryptoPaymentController extends Controller
{
    public function quote(Request $request, CryptoPaymentService $crypto)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['required', 'string', 'max:8'],
            'crypto_currency' => ['nullable', 'string', 'max:16'],
        ]);

        return response()->json(['data' => $crypto->quote((float) $data['amount'], $data['currency'], $data['crypto_currency'] ?? 'USDT')]);
    }

    public function customerIntent(Request $request, CryptoPaymentService $crypto)
    {
        $data = $request->validate([
            'purpose' => ['required', 'in:checkout,wallet_topup'],
            'order_id' => ['required_if:purpose,checkout', 'nullable', 'integer', 'exists:orders,id'],
            'amount' => ['required_if:purpose,wallet_topup', 'nullable', 'numeric', 'min:1'],
            'currency' => ['nullable', 'string', 'in:XOF,USD,EUR'],
            'crypto_currency' => ['nullable', 'string', 'in:USDT,BTC,ETH'],
            'network' => ['nullable', 'string', 'max:40'],
            'customer' => ['nullable', 'array'],
        ]);

        $intent = $crypto->createCustomerIntent($data, (int) $request->user()->id);

        return response()->json(['data' => $this->intentPayload($intent)], 201);
    }

    public function resellerIntent(Request $request, CryptoPaymentService $crypto)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'recharge_type' => ['nullable', 'in:standard,express'],
            'accept_express_fee' => ['nullable', 'boolean'],
            'crypto_currency' => ['nullable', 'string', 'in:USDT,BTC,ETH'],
            'network' => ['nullable', 'string', 'max:40'],
        ]);

        $intent = $crypto->createResellerTopupIntent($request->attributes->get('reseller_partner'), $data);

        return response()->json(['data' => $this->intentPayload($intent)], 201);
    }

    public function show(Request $request, CryptoPaymentIntent $intent)
    {
        abort_unless((int) $intent->user_id === (int) $request->user()->id, 403);

        return response()->json(['data' => $this->intentPayload($intent)]);
    }

    public function adminSync(CryptoPaymentService $crypto)
    {
        return response()->json(['credited' => $crypto->syncDeposits()]);
    }

    private function intentPayload(CryptoPaymentIntent $intent): array
    {
        return [
            'id' => $intent->id,
            'reference' => $intent->reference,
            'purpose' => $intent->purpose,
            'status' => $intent->status,
            'fiat_amount' => (float) $intent->fiat_amount,
            'fiat_currency' => $intent->fiat_currency,
            'crypto_currency' => $intent->crypto_currency,
            'network' => $intent->network,
            'expected_crypto_amount' => (float) $intent->expected_crypto_amount,
            'received_crypto_amount' => (float) $intent->received_crypto_amount,
            'deposit_address' => $intent->deposit_address,
            'deposit_memo' => $intent->deposit_memo,
            'expires_at' => optional($intent->expires_at)?->toIso8601String(),
            'paid_at' => optional($intent->paid_at)?->toIso8601String(),
            'payment' => $intent->payment ? [
                'id' => $intent->payment->id,
                'reference' => $intent->payment->reference,
                'status' => $intent->payment->status,
            ] : null,
        ];
    }
}