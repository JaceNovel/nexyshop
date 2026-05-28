<?php

namespace App\Services\Suppliers;

interface SupplierGateway
{
    public function categories(): array;

    public function products(array $query = []): array;

    public function variations(string|int $productId): array;

    public function balance(): array;

    public function getOrder(string|int $orderId): array;

    public function verifyPlayer(string $game, string $uid): array;

    public function createOrder(array $payload): array;
}
