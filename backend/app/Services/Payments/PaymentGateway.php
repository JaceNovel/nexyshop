<?php

namespace App\Services\Payments;

interface PaymentGateway
{
    public function initiate(array $payload): array;

    public function verifyWebhook(array $payload): array;

    public function verify(string $paymentId): array;
}
