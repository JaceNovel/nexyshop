<?php

namespace App\Services\Payments;

use App\Models\ApiLog;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class MonerooGateway implements PaymentGateway
{
    public function initiate(array $payload): array
    {
        $this->ensureConfigured();
        $payload = $this->normalizePayload($payload);

        try {
            $response = Http::withToken((string) config('services.payments.moneroo.secret_key'))
                ->acceptJson()
                ->asJson()
                ->connectTimeout(8)
                ->timeout(20)
                ->post($this->url('/v1/payments/initialize'), $payload);
        } catch (ConnectionException) {
            throw new HttpResponseException(response()->json([
                'message' => 'Le prestataire de paiement ne répond pas. Réessaie dans un instant.',
            ], 504));
        }

        $this->log('/v1/payments/initialize', $response, $this->safePayload($payload));
        $this->throwIfFailed($response);

        $body = $response->json() ?: [];
        $data = data_get($body, 'data', []);
        $checkoutUrl = data_get($data, 'checkout_url') ?: data_get($body, 'checkout_url');
        $reference = data_get($data, 'id') ?: data_get($body, 'id') ?: data_get($body, 'payment_id');

        return [
            'provider' => 'moneroo',
            'reference' => $reference,
            'checkout_url' => $checkoutUrl,
            'payload' => $body,
        ];
    }

    public function verifyWebhook(array $payload): array
    {
        $paymentId = data_get($payload, 'data.id')
            ?: data_get($payload, 'id')
            ?: data_get($payload, 'payment_id')
            ?: data_get($payload, 'paymentId')
            ?: data_get($payload, 'reference');

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
        $this->throwIfFailed($response);

        $data = $response->json('data', []);

        return [
            'reference' => $data['id'] ?? $paymentId,
            'status' => $this->normalizeStatus($data['status'] ?? 'pending'),
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
        try {
            ApiLog::create([
                'service' => 'moneroo',
                'direction' => 'outbound',
                'endpoint' => $endpoint,
                'status_code' => $response->status(),
                'payload' => $payload,
                'response' => $response->json() ?: ['body' => Str::limit($response->body(), 1000)],
                'duration_ms' => null,
            ]);
        } catch (\Throwable) {
            report('Moneroo payment log failed.');
        }
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

    private function normalizePayload(array $payload): array
    {
        $payload['currency'] = $this->resolveCurrency($payload['currency'] ?? null);

        if (isset($payload['amount']) && is_numeric($payload['amount'])) {
            $payload['amount'] = $this->normalizeAmount($payload['amount'], $payload['currency']);
        }

        $hadExplicitMethods = isset($payload['methods']) && is_array($payload['methods']) && array_filter($payload['methods'], static fn ($method) => is_string($method) && trim($method) !== '') !== [];
        $hadOnlyGenericMethods = $hadExplicitMethods && $this->hasOnlyGenericMethods($payload['methods']);

        if (isset($payload['methods']) && is_array($payload['methods'])) {
            $payload['methods'] = $this->expandMethodAliases($payload['methods'], $payload['currency']);
            $payload['methods'] = array_values(array_unique(array_filter(array_map(
                static function ($method) {
                    if (! is_string($method)) {
                        return null;
                    }

                    $normalized = strtolower(trim($method));

                    if ($normalized === '' || in_array($normalized, ['mobile_money', 'mobile-money', 'card'], true)) {
                        return null;
                    }

                    return $normalized;
                },
                $payload['methods']
            ))));

            if ($payload['methods'] === []) {
                abort_if($hadExplicitMethods && ! $hadOnlyGenericMethods, 422, 'Cette methode de paiement n\'est pas disponible pour cette devise. Choisissez une autre methode.');
                unset($payload['methods']);
            }
        } else {
            unset($payload['methods']);
        }

        if (isset($payload['metadata']) && is_array($payload['metadata'])) {
            $payload['metadata'] = collect($payload['metadata'])
                ->mapWithKeys(function ($value, $key) {
                    if (is_bool($value)) {
                        $value = $value ? 'true' : 'false';
                    } elseif (is_array($value) || is_object($value)) {
                        $value = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    } elseif ($value === null) {
                        $value = '';
                    }

                    return [(string) $key => (string) $value];
                })
                ->all();
        }

        if (isset($payload['customer']['phone']) && blank($payload['customer']['phone'])) {
            unset($payload['customer']['phone']);
        }

        return $payload;
    }

    private function expandMethodAliases(array $methods, string $currency): array
    {
        $needsLookup = collect($methods)->contains(function ($method) {
            if (! is_string($method)) {
                return false;
            }

            return in_array(strtolower(trim($method)), ['card', 'mobile_money', 'mobile-money'], true);
        });

        if (! $needsLookup) {
            return $methods;
        }

        $configuredCodes = $this->configuredMethodCodesForCurrency($currency);

        return collect($methods)
            ->flatMap(function ($method) use ($configuredCodes) {
                if (! is_string($method)) {
                    return [];
                }

                $normalized = strtolower(trim($method));

                if ($normalized === 'card') {
                    if ($configuredCodes !== null) {
                        return array_values(array_filter($configuredCodes, static fn (string $code) => str_starts_with($code, 'card_')));
                    }

                    return [];
                }

                if (in_array($normalized, ['mobile_money', 'mobile-money'], true)) {
                    if ($configuredCodes === null) {
                        return [];
                    }

                    $mobileMoneyCodes = array_values(array_filter($configuredCodes, static fn (string $code) => ! str_starts_with($code, 'card_') && ! str_starts_with($code, 'crypto_')));

                    return $mobileMoneyCodes;
                }

                return [$method];
            })
            ->values()
            ->all();
    }

    private function hasOnlyGenericMethods(array $methods): bool
    {
        $normalizedMethods = array_values(array_filter(array_map(
            static fn ($method) => is_string($method) ? strtolower(trim($method)) : '',
            $methods
        )));

        if ($normalizedMethods === []) {
            return false;
        }

        return collect($normalizedMethods)->every(static fn (string $method) => in_array($method, ['card', 'mobile_money', 'mobile-money'], true));
    }

    private function configuredMethodCodesForCurrency(string $currency): ?array
    {
        $methodsByCurrency = config('services.payments.moneroo.methods_by_currency', []);
        $currencyMethods = is_array($methodsByCurrency) ? ($methodsByCurrency[strtoupper($currency)] ?? $methodsByCurrency[strtolower($currency)] ?? []) : [];
        $defaultMethods = config('services.payments.moneroo.default_methods', []);
        $methods = $currencyMethods !== [] ? $currencyMethods : $defaultMethods;

        $codes = collect(Arr::wrap($methods))
            ->filter(fn ($method) => is_string($method))
            ->map(fn (string $method) => strtolower(trim($method)))
            ->filter(fn (string $method) => $method !== '' && ! in_array($method, ['card', 'mobile_money', 'mobile-money'], true))
            ->unique()
            ->values()
            ->all();

        return $codes !== [] ? $codes : null;
    }

    private function resolveCurrency(mixed $currency): string
    {
        $currency = is_string($currency) ? trim($currency) : '';

        if ($currency !== '') {
            return strtoupper($currency);
        }

        return strtoupper((string) config('services.payments.moneroo.default_currency', 'USD'));
    }

    private function normalizeAmount(mixed $amount, string $currency): int|float
    {
        $amount = max(0, (float) $amount);
        $zeroDecimalCurrencies = ['XOF', 'XAF', 'GNF', 'RWF', 'BIF', 'UGX', 'JPY'];

        if (in_array(strtoupper($currency), $zeroDecimalCurrencies, true)) {
            return max(1, (int) round($amount));
        }

        return (float) number_format(max(0.01, $amount), 2, '.', '');
    }

    private function normalizeStatus(mixed $status): string
    {
        $status = strtolower(trim((string) $status));

        return match ($status) {
            'success', 'successful', 'succeeded', 'paid', 'completed', 'complete' => 'success',
            'cancelled', 'canceled' => 'cancelled',
            'failed', 'failure', 'error', 'declined' => 'failed',
            'initiated', 'processing', 'pending' => 'pending',
            default => $status !== '' ? $status : 'pending',
        };
    }

    private function ensureConfigured(): void
    {
        abort_if(blank(config('services.payments.moneroo.secret_key')), 422, 'MONEROO_SECRET_KEY is not configured.');
    }

    private function throwIfFailed(Response $response): void
    {
        if ($response->successful()) {
            return;
        }

        $body = $response->json() ?: [];
        $errors = data_get($body, 'errors');
        $message = data_get($body, 'message') ?: data_get($body, 'error') ?: $response->body();

        if (is_array($errors)) {
            $firstError = collect($errors)->flatten()->first();
            if (is_string($firstError) && $firstError !== '') {
                $message = $firstError;
            }
        }

        if (is_string($message) && str_contains(strtolower($message), 'no payment methods enabled for this currency')) {
            $message .= ' Activez au moins une methode de paiement pour cette application Moneroo dans le dashboard (Developers / Connections), ou utilisez une cle app deja reliee a des moyens de paiement actifs.';
        }

        throw new HttpResponseException(response()->json([
            'message' => 'Moneroo: '.Str::limit((string) $message, 600),
            'errors' => $errors,
        ], $response->status()));
    }
}
