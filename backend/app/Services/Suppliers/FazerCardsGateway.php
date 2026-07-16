<?php

namespace App\Services\Suppliers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class FazerCardsGateway extends AbstractSupplierGateway
{
    protected function headers(): array
    {
        return array_filter([
            'X-API-Key' => $this->apiKey,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ]);
    }

    protected function get(string $endpoint, array $query = []): array
    {
        return $this->requestWithRateLimitRetry('get', $endpoint, $query);
    }

    protected function post(string $endpoint, array $payload): array
    {
        return $this->requestWithRateLimitRetry('post', $endpoint, $payload);
    }

    public function categories(): array
    {
        return [
            'topups' => $this->topups(),
            'giftcards' => $this->giftcards(),
            'gamekeys' => $this->gameKeys(),
            'manual_services' => $this->manualServices(),
        ];
    }

    public function products(array $query = []): array
    {
        return $this->get('/topups', $query + ['include_ui' => 1]);
    }

    public function variations(string|int $productId): array
    {
        return $this->topupOffers((string) $productId);
    }

    public function balance(): array
    {
        return $this->get('/balance');
    }

    public function getOrder(string|int $orderId): array
    {
        return $this->get('/orders/'.urlencode((string) $orderId));
    }

    public function verifyPlayer(string $game, string $uid): array
    {
        return [
            'uid' => $uid,
            'nickname' => $uid,
            'verified' => true,
            'source' => 'fazercards',
        ];
    }

    public function validateTopupId(string $categoryId, array $fields): array
    {
        return $this->post('/topups/validate-id', [
            'category_id' => $categoryId,
            'fields' => $fields,
        ]);
    }

    public function validateTopupSku(string $sku, array $fields): array
    {
        $decoded = $this->decodeSku($sku);

        if (($decoded['kind'] ?? null) !== 'topup' || empty($decoded['category_id'])) {
            throw new \InvalidArgumentException('Unsupported FazerCards top-up validation payload.');
        }

        return $this->validateTopupId($decoded['category_id'], $this->topupFields($decoded['category_id'], $fields));
    }

    public static function decodedTopupCategory(string $sku): ?string
    {
        $decoded = self::decodeSku($sku);

        if (($decoded['kind'] ?? null) !== 'topup') {
            return null;
        }

        return $decoded['category_id'] ?? null;
    }

    public function topups(array $query = []): array
    {
        return $this->get('/topups', $query + ['include_ui' => 1]);
    }

    public function topupOffers(string $categoryId): array
    {
        return $this->get('/topups/offers', ['category_id' => $categoryId, 'include_ui' => 1]);
    }

    public function giftcards(array $query = []): array
    {
        return $this->get('/giftcards', $query + ['include_ui' => 1]);
    }

    public function giftcardOffers(string $categoryId): array
    {
        return $this->get('/giftcards/cards', ['category_id' => $categoryId, 'include_ui' => 1]);
    }

    public function gameKeys(array $query = []): array
    {
        return $this->get('/gamekeys', $query + ['include_ui' => 1]);
    }

    public function gameKeyOffers(string $gameId): array
    {
        return $this->get('/gamekeys/keys', ['game_id' => $gameId, 'include_ui' => 1]);
    }

    public function manualServices(): array
    {
        return $this->get('/manual-services', ['include_ui' => 1]);
    }

    public function manualServiceOffers(string $manualServiceId): array
    {
        return $this->get('/manual-services/'.$manualServiceId.'/offers', ['include_ui' => 1]);
    }

    public function createOrder(array $payload): array
    {
        $sku = $this->decodeSku((string) ($payload['variation_id'] ?? $payload['external_sku'] ?? ''));
        $fields = $payload['fields'] ?? $payload['supplier_fields'] ?? [];
        $quantity = max(1, (int) ($payload['quantity'] ?? 1));
        $idempotencyKey = 'astral-'.$payload['order_id'];

        return match ($sku['kind'] ?? null) {
            'topup' => $this->postWithIdempotency('/topups/order', [
                'category_id' => $sku['category_id'],
                'offer_id' => $sku['offer_id'],
                'fields' => $this->topupFields($sku['category_id'], $fields),
            ], $idempotencyKey),
            'gift_card' => $this->postWithIdempotency('/giftcards/order', [
                'category_id' => $sku['category_id'],
                'card_id' => $sku['card_id'],
                'quantity' => $quantity,
            ], $idempotencyKey),
            'game_key' => $this->postWithIdempotency('/gamekeys/order', [
                'game_id' => $sku['game_id'],
                'key_id' => $sku['key_id'],
                'quantity' => $quantity,
            ], $idempotencyKey),
            'manual_service' => $this->postWithIdempotency('/manual-services/order', [
                'manual_service_id' => $sku['manual_service_id'],
                'product_id' => $sku['product_id'],
                'fields' => $fields,
            ], $idempotencyKey),
            default => throw new \InvalidArgumentException('Unsupported FazerCards variation payload.'),
        };
    }

    private function topupFields(string $categoryId, array $fields): array
    {
        $fields = array_filter($fields, fn ($value) => $value !== null && $value !== '');

        return match ($categoryId) {
            'free_fire_mena' => array_filter([
                'player_id' => $fields['player_id'] ?? $fields['user_id'] ?? $fields['uid'] ?? null,
            ], fn ($value) => $value !== null && $value !== ''),
            default => $fields,
        };
    }

    public static function encodeSku(array $payload): string
    {
        return 'fzr:'.rtrim(strtr(base64_encode(json_encode($payload, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    }

    public static function decodeSku(string $sku): array
    {
        if (! Str::startsWith($sku, 'fzr:')) {
            return [];
        }

        $encoded = substr($sku, 4);
        $encoded .= str_repeat('=', (4 - strlen($encoded) % 4) % 4);

        return json_decode(base64_decode(strtr($encoded, '-_', '+/')) ?: '[]', true) ?: [];
    }

    private function postWithIdempotency(string $endpoint, array $payload, string $idempotencyKey): array
    {
        return $this->requestWithRateLimitRetry('post', $endpoint, $payload, ['Idempotency-Key' => $idempotencyKey]);
    }

    private function requestWithRateLimitRetry(string $method, string $endpoint, array $payload = [], array $headers = []): array
    {
        $attempts = 0;

        do {
            $attempts++;
            $started = microtime(true);
            $request = Http::withHeaders([...$this->headers(), ...$headers])
                ->withOptions($this->requestOptions())
                ->timeout(25);
            $response = $method === 'get'
                ? $request->get($this->baseUrl.$endpoint, $payload)
                : $request->post($this->baseUrl.$endpoint, $payload);

            $this->log($endpoint, $payload, $response->json(), $response->status(), $started);

            if ($response->status() !== 429) {
                $response->throw();

                return $response->json();
            }

            sleep($this->retryAfterSeconds($response->json(), $response->header('Retry-After')));
        } while ($attempts < 5);

        $response->throw();

        return $response->json();
    }

    private function retryAfterSeconds(?array $payload, ?string $header): int
    {
        if (is_numeric($header)) {
            return max(1, min((int) $header, 120));
        }

        $message = (string) ($payload['error'] ?? '');

        if (preg_match('/(\d+)/', $message, $match)) {
            return max(1, min((int) $match[1] + 1, 120));
        }

        return 30;
    }
}
