<?php

namespace App\Services\Payments;

class PaymentManager implements PaymentGateway
{
    private PaymentGateway $gateway;

    public function __construct(private readonly string $provider)
    {
        $this->gateway = match ($provider) {
            'moneroo' => new MonerooGateway(),
            default => new NullPaymentGateway($provider),
        };
    }

    public function initiate(array $payload): array
    {
        return $this->gateway->initiate($payload);
    }

    public function verifyWebhook(array $payload): array
    {
        return $this->gateway->verifyWebhook($payload);
    }

    public function verify(string $paymentId): array
    {
        return $this->gateway->verify($paymentId);
    }
}
