<?php

namespace App\Services\Suppliers;

use App\Models\ApiLog;
use Illuminate\Support\Facades\Http;

abstract class AbstractSupplierGateway implements SupplierGateway
{
    public function __construct(protected string $baseUrl, protected ?string $apiKey)
    {
    }

    protected function get(string $endpoint, array $query = []): array
    {
        $started = microtime(true);
        $response = Http::withHeaders($this->headers())
            ->timeout(20)
            ->retry(2, 250)
            ->get($this->baseUrl.$endpoint, $query);

        $this->log($endpoint, $query, $response->json(), $response->status(), $started);
        $response->throw();

        return $response->json();
    }

    protected function post(string $endpoint, array $payload): array
    {
        $started = microtime(true);
        $response = Http::withHeaders($this->headers())
            ->timeout(20)
            ->retry(2, 250)
            ->post($this->baseUrl.$endpoint, $payload);

        $this->log($endpoint, $payload, $response->json(), $response->status(), $started);
        $response->throw();

        return $response->json();
    }

    protected function headers(): array
    {
        return array_filter([
            'api-key' => $this->apiKey,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ]);
    }

    protected function log(string $endpoint, array $payload, ?array $response, int $status, float $started): void
    {
        ApiLog::create([
            'service' => static::class,
            'direction' => 'outbound',
            'endpoint' => $endpoint,
            'status_code' => $status,
            'payload' => $payload,
            'response' => $response,
            'duration_ms' => (int) ((microtime(true) - $started) * 1000),
        ]);
    }
}
