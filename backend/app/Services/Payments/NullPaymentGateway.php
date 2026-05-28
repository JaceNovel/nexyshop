<?php

namespace App\Services\Payments;

use Illuminate\Support\Str;

class NullPaymentGateway implements PaymentGateway
{
    public function __construct(private readonly string $provider)
    {
    }

    public function initiate(array $payload): array
    {
        return [
            'provider' => $this->provider,
            'reference' => 'NEXY-'.Str::upper(Str::random(12)),
            'checkout_url' => null,
            'payload' => $payload,
            'message' => 'Provider payment not integrated yet.',
        ];
    }

    public function verifyWebhook(array $payload): array
    {
        return [
            'status' => $payload['status'] ?? 'pending',
            'reference' => $payload['reference'] ?? null,
            'raw' => $payload,
        ];
    }

    public function verify(string $paymentId): array
    {
        return [
            'id' => $paymentId,
            'status' => 'pending',
            'message' => 'Provider payment not integrated yet.',
        ];
    }
}
