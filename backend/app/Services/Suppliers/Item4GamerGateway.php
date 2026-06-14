<?php

namespace App\Services\Suppliers;

class Item4GamerGateway extends AbstractSupplierGateway
{
    protected function headers(): array
    {
        return array_filter([
            config('services.suppliers.item4gamer.key_header', 'api-key') => $this->apiKey,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ]);
    }

    protected function requestOptions(): array
    {
        if (! config('services.suppliers.item4gamer.force_ipv4', true)) {
            return [];
        }

        return [
            'curl' => [
                CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
            ],
        ];
    }

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
        $configuredEndpoint = config('services.suppliers.item4gamer.endpoints.variations');
        $endpoint = str_replace('{product_id}', (string) $productId, $configuredEndpoint);

        if (str_contains($configuredEndpoint, '{product_id}')) {
            return $this->get($endpoint);
        }

        try {
            $productIdResponse = $this->get($endpoint, ['product_id' => $productId]);

            if ($this->hasCollectionData($productIdResponse)) {
                return $productIdResponse;
            }
        } catch (\Throwable) {
            //
        }

        return $this->get($endpoint, ['id' => $productId]);
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
        $data = $payload['data'] ?? [
            'user_id' => $payload['uid'] ?? null,
            'player_id' => $payload['uid'] ?? null,
            'player_name' => $payload['nickname'] ?? null,
            'nickname' => $payload['nickname'] ?? null,
            'email' => $payload['customer']['email'] ?? null,
        ];

        return $this->post(config('services.suppliers.item4gamer.endpoints.add_order'), $this->withoutEmptyValues([
            'variation_id' => (string) ($payload['variation_id'] ?? $payload['external_sku'] ?? $payload['product_id']),
            'quantity' => (int) ($payload['quantity'] ?? 1),
            'customer' => $this->withoutEmptyValues($payload['customer'] ?? []),
            'data' => $this->withoutEmptyValues($data),
        ]));
    }

    private function withoutEmptyValues(array $values): array
    {
        return array_filter($values, fn ($value) => $value !== null && $value !== '' && $value !== []);
    }

    private function hasCollectionData(array $payload): bool
    {
        $data = $payload['data'] ?? $payload;

        foreach (['variations', 'items', 'results'] as $key) {
            if (! empty($data[$key]) && is_array($data[$key])) {
                return true;
            }
        }

        return array_is_list($data) && $data !== [];
    }
}
