<?php

namespace App\Services\Payments;

use App\Models\ApiLog;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class MonerooGateway implements PaymentGateway
{
    public function initiate(array $payload): array
    {
        $this->ensureConfigured();

        $response = Http::withToken((string) config('services.payments.moneroo.secret_key'))
            ->acceptJson()
            ->asJson()
            ->post($this->url('/v1/payments/initialize'), $payload);

        $this->log('/v1/payments/initialize', $response, $this->safePayload($payload));
        $response->throw();

        $data = $response->json('data', []);

        return [
            'provider' => 'moneroo',
            'reference' => $data['id'] ?? null,
            'checkout_url' => $data['checkout_url'] ?? null,
            'payload' => $response->json(),
        ];
    }

    public function verifyWebhook(array $payload): array
    {
        $paymentId = data_get($payload, 'data.id');

        if (! $paymentId) {
            return [
                'reference' => null,
                'status' => 'failed',
                'raw' => $payload,
            ];
        }

        return $this->verify((string) $paymentId);
    }

    public function verify(string $paymentId): array
    {
        $this->ensureConfigured();

        $response = Http::withToken((string) config('services.payments.moneroo.secret_key'))
            ->acceptJson()
            ->get($this->url("/v1/payments/{$paymentId}/verify"));

        $this->log("/v1/payments/{$paymentId}/verify", $response);
        $response->throw();

        $data = $response->json('data', []);

        return [
            'reference' => $data['id'] ?? $paymentId,
            'status' => $data['status'] ?? 'pending',
            'amount' => $data['amount'] ?? null,
            'currency' => data_get($data, 'currency.code'),
            'raw' => $response->json(),
        ];
    }

    private function url(string $path): string
    {
        return rtrim((string) config('services.payments.moneroo.base_url'), '/').$path;
    }

    private function log(string $endpoint, Response $response, array $payload = []): void
    {
        ApiLog::create([
            'service' => 'moneroo',
            'direction' => 'outbound',
            'endpoint' => $endpoint,
            'status_code' => $response->status(),
            'payload' => $payload,
            'response' => $response->json() ?: ['body' => Str::limit($response->body(), 1000)],
            'duration_ms' => null,
        ]);
    }

    private function safePayload(array $payload): array
    {
        return array_replace_recursive($payload, [
            'customer' => [
                'email' => isset($payload['customer']['email']) ? '***' : null,
                'first_name' => isset($payload['customer']['first_name']) ? '***' : null,
                'last_name' => isset($payload['customer']['last_name']) ? '***' : null,
                'phone' => isset($payload['customer']['phone']) ? '***' : null,
            ],
        ]);
    }

    private function ensureConfigured(): void
    {
        abort_if(blank(config('services.payments.moneroo.secret_key')), 422, 'MONEROO_SECRET_KEY is not configured.');
    }
}
