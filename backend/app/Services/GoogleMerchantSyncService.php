<?php

namespace App\Services;

use App\Models\Product;
use App\Services\Shop\PricingService;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;
use RuntimeException;

class GoogleMerchantSyncService
{
    public function __construct(private readonly PricingService $pricing)
    {
    }

    public function sync(bool $dryRun = false, ?int $limit = null, int $offset = 0, ?callable $onProgress = null, array $productIds = []): array
    {
        $query = Product::query()
            ->with(['supplierProducts' => fn ($query) => $query->where('active', true)])
            ->where('active', true)
            ->where('price', '>', 0)
            ->orderBy('id');

        if ($productIds !== []) {
            $query->whereIn('id', array_values(array_unique(array_map('intval', $productIds))));
        } else {
            $query->skip(max(0, $offset))
                ->limit($limit ?: (int) config('services.google.merchant.max_products', 500));
        }

        $products = $query->get();

        $result = [
            'dry_run' => $dryRun,
            'offset' => max(0, $offset),
            'total' => $products->count(),
            'synced' => 0,
            'failed' => 0,
            'errors' => [],
            'samples' => [],
        ];

        $token = $dryRun ? null : $this->accessToken();
        $processed = 0;

        foreach ($products as $product) {
            $processed++;
            $payload = $this->productInputPayload($product);

            if ($dryRun) {
                if (count($result['samples']) < 5) {
                    $result['samples'][] = $payload;
                }
                $result['synced']++;
                $this->reportProgress($onProgress, $result, $processed, $product, true);
                continue;
            }

            try {
                $response = Http::timeout((int) config('services.google.merchant.timeout', 60))
                    ->retry((int) config('services.google.merchant.retry_times', 3), (int) config('services.google.merchant.retry_sleep', 1000))
                    ->withToken($token)
                    ->acceptJson()
                    ->asJson()
                    ->post($this->insertUrl(), $payload);
            } catch (Throwable $exception) {
                $result['failed']++;
                $result['errors'][] = [
                    'product_id' => $product->id,
                    'status' => 'exception',
                    'message' => Str::limit($exception->getMessage(), 500),
                ];
                $this->reportProgress($onProgress, $result, $processed, $product, false);
                continue;
            }

            if ($response->successful()) {
                $result['synced']++;
                $this->reportProgress($onProgress, $result, $processed, $product, true);
                continue;
            }

            $result['failed']++;
            $result['errors'][] = [
                'product_id' => $product->id,
                'status' => $response->status(),
                'message' => $response->json('error.message') ?: Str::limit($response->body(), 500),
            ];
            $this->reportProgress($onProgress, $result, $processed, $product, false);
        }

        return $result;
    }

    private function reportProgress(?callable $onProgress, array $result, int $processed, Product $product, bool $success): void
    {
        if (! $onProgress) {
            return;
        }

        $onProgress([
            'processed' => $processed,
            'total' => $result['total'],
            'synced' => $result['synced'],
            'failed' => $result['failed'],
            'product_id' => $product->id,
            'name' => Str::limit((string) $product->name, 80),
            'success' => $success,
        ]);
    }

    public function registerDeveloper(string $developerEmail): array
    {
        $developerEmail = trim($developerEmail);

        if ($developerEmail === '' || ! filter_var($developerEmail, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Email développeur Google Merchant invalide.');
        }

        $accountId = (string) config('services.google.merchant.account_id');
        $baseUrl = rtrim((string) config('services.google.merchant.accounts_api_base_url'), '/');
        $url = $baseUrl.'/accounts/'.$accountId.'/developerRegistration:registerGcp';

        $response = Http::timeout((int) config('services.google.merchant.timeout', 20))
            ->withToken($this->accessToken())
            ->acceptJson()
            ->asJson()
            ->post($url, ['developerEmail' => $developerEmail]);

        if (! $response->successful()) {
            throw new RuntimeException('Enregistrement développeur Google Merchant refusé: '.($response->json('error.message') ?: $response->body()));
        }

        return $response->json();
    }

    public function unregisterDeveloper(): array
    {
        $accountId = (string) config('services.google.merchant.account_id');
        $baseUrl = rtrim((string) config('services.google.merchant.accounts_api_base_url'), '/');
        $url = $baseUrl.'/accounts/'.$accountId.'/developerRegistration:unregisterGcp';

        $response = Http::timeout((int) config('services.google.merchant.timeout', 20))
            ->withToken($this->accessToken())
            ->acceptJson()
            ->withBody('{}', 'application/json')
            ->post($url);

        if (! $response->successful()) {
            throw new RuntimeException('Désenregistrement développeur Google Merchant refusé: '.($response->json('error.message') ?: $response->body()));
        }

        return $response->json() ?: ['unregistered' => true];
    }

    public function grantDeveloperAccess(string $email): array
    {
        $email = trim($email);

        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Email utilisateur Google Merchant invalide.');
        }

        $accountId = (string) config('services.google.merchant.account_id');
        $baseUrl = rtrim((string) config('services.google.merchant.accounts_api_base_url'), '/');
        $userName = 'accounts/'.$accountId.'/users/'.$email;
        $url = $baseUrl.'/'.$userName.'?'.http_build_query(['update_mask' => 'accessRights']);

        $response = Http::timeout((int) config('services.google.merchant.timeout', 20))
            ->withToken($this->accessToken())
            ->acceptJson()
            ->asJson()
            ->patch($url, [
                'name' => $userName,
                'accessRights' => ['ADMIN', 'API_DEVELOPER'],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Attribution du rôle API_DEVELOPER refusée: '.($response->json('error.message') ?: $response->body()));
        }

        return $response->json();
    }

    public function productInputPayload(Product $product): array
    {
        $metadata = $product->metadata ?? [];
        $reference = $this->publicProductReference($product);
        $currency = strtoupper((string) config('services.google.merchant.currency', 'USD'));
        $price = $this->publicPrice($product);
        $frontendUrl = rtrim((string) config('services.google.frontend_url'), '/');
        $imageUrl = $this->merchantImageUrl((string) ($metadata['image_url'] ?? data_get($metadata, 'raw.image') ?? ''), $frontendUrl);
        $description = $this->merchantDescription($product);

        return [
            'offerId' => $reference,
            'contentLanguage' => (string) config('services.google.merchant.language', 'fr'),
            'feedLabel' => (string) config('services.google.merchant.feed_label', 'FR'),
            'productAttributes' => [
                'title' => Str::limit($product->name, 150, ''),
                'description' => Str::limit($description !== '' ? $description : $product->name, 5000, ''),
                'link' => $frontendUrl.'/product/'.$product->id,
                'imageLink' => $imageUrl,
                'availability' => 'IN_STOCK',
                'condition' => 'NEW',
                'brand' => (string) ($metadata['brand'] ?? config('services.google.merchant.default_brand', 'Astral4Gamer')),
                'identifierExists' => false,
                'price' => [
                    'amountMicros' => (string) (int) round($price * 1000000),
                    'currencyCode' => $currency,
                ],
                'shipping' => $this->shippingOptions($currency),
                'productTypes' => array_values(array_filter([
                    (string) ($metadata['category'] ?? $product->game ?? 'Gaming'),
                    (string) ($metadata['type'] ?? null),
                ])),
            ],
        ];
    }

    private function publicPrice(Product $product): float
    {
        $supplierCost = (float) $product->supplierProducts->where('active', true)->min('cost');

        if ($supplierCost > 0) {
            return round($this->pricing->retailPrice($supplierCost), 2);
        }

        return round((float) $product->price, 2);
    }

    private function merchantDescription(Product $product): string
    {
        $type = match ($product->metadata['type'] ?? 'top-up') {
            'gift-card', 'gift-cards' => 'carte cadeau digitale',
            'game-key', 'game-keys' => 'clé digitale',
            default => 'recharge digitale',
        };

        return Str::limit('Achat sécurisé '.$type.' '.$product->name.' sur Astral4Gamer. Livraison digitale après validation de la commande.', 5000, '');
    }

    private function merchantImageUrl(string $url, string $frontendUrl): string
    {
        $imageUrl = $this->absoluteUrl($url, $frontendUrl);

        if (! $imageUrl || str_contains($imageUrl, 'reseller.fazercards.com/api/')) {
            return (string) config('services.google.merchant.default_image_url');
        }

        return $imageUrl;
    }

    private function shippingOptions(string $currency): array
    {
        $countries = config('services.google.merchant.shipping_countries', ['FR']);

        if (! is_array($countries) || $countries === []) {
            $countries = ['FR'];
        }

        return array_map(fn (string $country): array => [
            'country' => strtoupper($country),
            'service' => 'Livraison digitale',
            'price' => [
                'amountMicros' => '0',
                'currencyCode' => $currency,
            ],
        ], array_values(array_filter($countries)));
    }

    private function accessToken(): string
    {
        $path = (string) config('services.google.merchant.service_account_json');

        if ($path === '') {
            throw new RuntimeException('GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON est manquant.');
        }

        $resolvedPath = str_starts_with($path, '/') ? $path : storage_path($path);

        if (! is_file($resolvedPath)) {
            throw new RuntimeException('Fichier compte de service Google Merchant introuvable: '.$resolvedPath);
        }

        return Cache::remember('google-merchant:service-account-token:'.md5($resolvedPath), now()->addMinutes(50), function () use ($resolvedPath) {
            $credentials = json_decode((string) file_get_contents($resolvedPath), true);
            $clientEmail = Arr::get($credentials, 'client_email');
            $privateKey = Arr::get($credentials, 'private_key');
            $tokenUri = Arr::get($credentials, 'token_uri', 'https://oauth2.googleapis.com/token');

            if (! $clientEmail || ! $privateKey) {
                throw new RuntimeException('Le fichier compte de service Google Merchant est incomplet.');
            }

            $now = time();
            $header = $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
            $claim = $this->base64UrlEncode(json_encode([
                'iss' => $clientEmail,
                'scope' => 'https://www.googleapis.com/auth/content',
                'aud' => $tokenUri,
                'iat' => $now,
                'exp' => $now + 3600,
            ], JSON_THROW_ON_ERROR));
            $unsignedJwt = $header.'.'.$claim;

            if (! openssl_sign($unsignedJwt, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
                throw new RuntimeException('Signature JWT Google Merchant impossible.');
            }

            $response = Http::asForm()->post($tokenUri, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $unsignedJwt.'.'.$this->base64UrlEncode($signature),
            ]);

            if (! $response->successful()) {
                throw new RuntimeException('Token Google Merchant refuse: '.($response->json('error_description') ?: $response->body()));
            }

            return (string) $response->json('access_token');
        });
    }

    private function insertUrl(): string
    {
        $accountId = (string) config('services.google.merchant.account_id');
        $sourceId = (string) config('services.google.merchant.data_source_id');
        $baseUrl = rtrim((string) config('services.google.merchant.api_base_url'), '/');

        if ($accountId === '' || $sourceId === '') {
            throw new RuntimeException('GOOGLE_MERCHANT_ACCOUNT_ID ou GOOGLE_MERCHANT_DATA_SOURCE_ID manquant.');
        }

        return $baseUrl.'/accounts/'.$accountId.'/productInputs:insert?'.http_build_query([
            'dataSource' => 'accounts/'.$accountId.'/dataSources/'.$sourceId,
        ]);
    }

    private function publicProductReference(Product $product): string
    {
        $type = match ($product->metadata['type'] ?? 'top-up') {
            'gift-card', 'gift-cards' => 'giftcard',
            'game-key', 'game-keys' => 'gamekey',
            default => 'topup',
        };

        $base = Str::of($product->name ?: $product->game ?: 'product-'.$product->id)
            ->ascii()
            ->lower()
            ->replaceMatches('/&/', ' and ')
            ->replaceMatches('/[^a-z0-9]+/', '_')
            ->trim('_')
            ->toString();

        $reference = 'Astral4gamer-'.$type.'-'.($base ?: 'product_'.$product->id);

        if (strlen($reference) <= 50) {
            return $reference;
        }

        $suffix = '-'.$product->id;
        $prefix = 'Astral4gamer-'.$type.'-';
        $baseLength = max(1, 50 - strlen($prefix) - strlen($suffix));

        return $prefix.substr($base ?: 'product', 0, $baseLength).$suffix;
    }

    private function absoluteUrl(string $url, string $frontendUrl): ?string
    {
        $url = trim($url);

        if ($url === '') {
            return null;
        }

        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }

        return $frontendUrl.'/'.ltrim($url, '/');
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}