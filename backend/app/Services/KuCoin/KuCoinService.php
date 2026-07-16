<?php

namespace App\Services\KuCoin;

use App\Models\ApiLog;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class KuCoinService
{
    public function publicGet(string $path, array $query = []): array
    {
        $response = Http::acceptJson()->get($this->url($path), $query);
        $this->log('GET '.$path, $response, $query);
        $this->throwIfFailed($response);

        return $response->json() ?: [];
    }

    public function privateGet(string $path, array $query = []): array
    {
        $endpoint = $path.($query ? '?'.http_build_query($query) : '');
        $response = Http::withHeaders($this->headers('GET', $endpoint))->acceptJson()->get($this->url($path), $query);
        $this->log('GET '.$path, $response, $query);
        $this->throwIfFailed($response);

        return $response->json() ?: [];
    }

    public function privatePost(string $path, array $body = []): array
    {
        $json = $body ? json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : '';
        $response = Http::withHeaders($this->headers('POST', $path, $json))->acceptJson()->asJson()->post($this->url($path), $body);
        $this->log('POST '.$path, $response, $this->safePayload($body));
        $this->throwIfFailed($response);

        return $response->json() ?: [];
    }

    public function price(string $base, string $quote): ?float
    {
        $base = strtoupper($base);
        $quote = strtoupper($quote);

        if ($base === $quote) {
            return 1.0;
        }

        if ($quote === 'XOF') {
            $usdRate = $this->price($base, 'USD');
            return $usdRate ? round($usdRate * (float) config('services.kucoin.usd_xof_rate', 610), 8) : null;
        }

        if ($base === 'USDT' && in_array($quote, ['USD', 'EUR'], true)) {
            return $quote === 'USD' ? 1.0 : (float) config('services.kucoin.usdt_eur_rate', 0.92);
        }

        $symbol = $base.'-'.$quote;
        $data = $this->publicGet('/api/v1/market/orderbook/level1', ['symbol' => $symbol]);
        $price = data_get($data, 'data.price');

        return is_numeric($price) ? (float) $price : null;
    }

    public function depositAddress(string $currency, ?string $network = null): array
    {
        $payload = ['currency' => strtoupper($currency)];
        if ($network) {
            $payload['chain'] = $network;
        }

        $existing = $this->privateGet('/api/v2/deposit-addresses', $payload);
        $address = data_get($existing, 'data.address') ? data_get($existing, 'data') : data_get($existing, 'data.0');

        if (! is_array($address) || empty($address['address'])) {
            $created = $this->privatePost('/api/v1/deposit-addresses', $payload);
            $address = data_get($created, 'data', []);
        }

        return Arr::wrap($address);
    }

    public function deposits(array $query = []): array
    {
        $body = $this->privateGet('/api/v1/deposits', $query);
        $items = data_get($body, 'data.items', data_get($body, 'data', []));

        return Arr::wrap($items);
    }

    public function withdrawalQuotas(string $currency, ?string $network = null): array
    {
        $query = ['currency' => strtoupper($currency)];
        if ($network) {
            $query['chain'] = $network;
        }

        return $this->privateGet('/api/v1/withdrawals/quotas', $query);
    }

    public function accounts(): array
    {
        return Arr::wrap(data_get($this->privateGet('/api/v1/accounts'), 'data', []));
    }

    private function headers(string $method, string $endpoint, string $body = ''): array
    {
        $key = (string) config('services.kucoin.key');
        $secret = (string) config('services.kucoin.secret');
        $passphrase = (string) config('services.kucoin.passphrase');
        abort_if($key === '' || $secret === '' || $passphrase === '', 422, 'KuCoin n’est pas configuré. Ajoute les clés API dans .env.');

        $timestamp = (string) round(microtime(true) * 1000);
        $signature = base64_encode(hash_hmac('sha256', $timestamp.strtoupper($method).$endpoint.$body, $secret, true));
        $version = (string) config('services.kucoin.key_version', '3');
        $encodedPassphrase = $version === '3' ? base64_encode(hash_hmac('sha256', $passphrase, $secret, true)) : $passphrase;

        return [
            'KC-API-KEY' => $key,
            'KC-API-SIGN' => $signature,
            'KC-API-TIMESTAMP' => $timestamp,
            'KC-API-PASSPHRASE' => $encodedPassphrase,
            'KC-API-KEY-VERSION' => $version,
        ];
    }

    private function url(string $path): string
    {
        return rtrim((string) config('services.kucoin.base_url', 'https://api.kucoin.tr'), '/').$path;
    }

    private function throwIfFailed(Response $response): void
    {
        if ($response->successful()) {
            return;
        }

        throw new RuntimeException('KuCoin API error '.$response->status().': '.Str::limit($response->body(), 500));
    }

    private function log(string $endpoint, Response $response, array $payload = []): void
    {
        try {
            ApiLog::create([
                'service' => 'kucoin',
                'direction' => 'outbound',
                'endpoint' => $endpoint,
                'status_code' => $response->status(),
                'payload' => $payload,
                'response' => $response->json() ?: ['body' => Str::limit($response->body(), 1000)],
                'duration_ms' => null,
            ]);
        } catch (\Throwable) {
            report('KuCoin API log failed.');
        }
    }

    private function safePayload(array $payload): array
    {
        return array_replace_recursive($payload, ['address' => isset($payload['address']) ? '***' : null]);
    }
}