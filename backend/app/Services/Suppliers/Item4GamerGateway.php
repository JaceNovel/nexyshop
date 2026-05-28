<?php

namespace App\Services\Suppliers;

class Item4GamerGateway extends AbstractSupplierGateway
{
    public function categories(): array
    {
        return $this->get(config('services.suppliers.item4gamer.endpoints.categories'));
    }

    public function products(array $query = []): array
    {
        return $this->get(config('services.suppliers.item4gamer.endpoints.products'), $query);
    }

    public function variations(string|int $productId): array
    {
        $endpoint = str_replace('{product_id}', (string) $productId, config('services.suppliers.item4gamer.endpoints.variations'));

        return $this->get($endpoint);
    }

    public function balance(): array
    {
        return $this->get(config('services.suppliers.item4gamer.endpoints.balance'));
    }

    public function getOrder(string|int $orderId): array
    {
        return $this->get(config('services.suppliers.item4gamer.endpoints.get_order'), ['order_id' => $orderId]);
    }

    public function verifyPlayer(string $game, string $uid): array
    {
        return [
            'uid' => $uid,
            'nickname' => $uid,
            'verified' => true,
            'source' => 'item4gamer',
        ];
    }

    public function createOrder(array $payload): array
    {
        return $this->post(config('services.suppliers.item4gamer.endpoints.add_order'), [
            'variation_id' => (string) ($payload['variation_id'] ?? $payload['external_sku'] ?? $payload['product_id']),
            'quantity' => (int) ($payload['quantity'] ?? 1),
            'customer' => $payload['customer'] ?? null,
            'data' => $payload['data'] ?? [
                'player_name' => $payload['nickname'] ?? null,
                'player_id' => $payload['uid'] ?? null,
            ],
        ]);
    }
}
