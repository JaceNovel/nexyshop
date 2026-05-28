<?php

namespace App\Services\Suppliers;

class UnipinGateway extends AbstractSupplierGateway
{
    public function categories(): array
    {
        return [];
    }

    public function products(array $query = []): array
    {
        return [];
    }

    public function variations(string|int $productId): array
    {
        return [];
    }

    public function balance(): array
    {
        return [];
    }

    public function getOrder(string|int $orderId): array
    {
        return [];
    }

    public function verifyPlayer(string $game, string $uid): array
    {
        return $this->post('/users/check', compact('game', 'uid'));
    }

    public function createOrder(array $payload): array
    {
        return $this->post('/transactions', $payload);
    }
}
