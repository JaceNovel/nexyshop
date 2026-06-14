<?php

namespace App\Services\FreeFire;

use App\Models\ApiLog;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class RedeemCodeService
{
    private const TTL_SECONDS = 21600;

    private string $endpoint;
    private ?string $userUid;
    private ?string $apiKey;

    public function __construct()
    {
        $this->endpoint = (string) config('services.hlgaming.freefire.reward_endpoint');
        $this->userUid = config('services.hlgaming.useruid');
        $this->apiKey = config('services.hlgaming.api_key');
    }

    public function publicCodes(?string $userId = null, ?string $date = null): array
    {
        $payload = $this->codes($date);

        return [
            ...$payload,
            'codes' => array_map(fn (array $code) => collect($code)->except('code')->all(), $payload['codes']),
            'claimedToday' => $userId ? Cache::has($this->claimKey($userId)) : false,
        ];
    }

    public function claim(string $codeId, string $userId, ?string $date = null): array
    {
        if (! filled($codeId)) {
            throw new RuntimeException('Code introuvable.');
        }

        $claimKey = $this->claimKey($userId);
        $existing = Cache::get($claimKey);

        if (is_array($existing) && filled($existing['code'] ?? null)) {
            return [
                'alreadyClaimed' => true,
                'code' => $existing['code'],
                'message' => 'Tu as déjà copié ton code gratuit aujourd’hui.',
            ];
        }

        $payload = $this->codes($date);
        $selected = collect($payload['codes'])->firstWhere('id', $codeId);

        if (! $selected || ! filled($selected['code'] ?? null)) {
            throw new RuntimeException('Ce code n’est plus disponible.');
        }

        Cache::put($claimKey, [
            'codeId' => $codeId,
            'code' => $selected['code'],
            'claimedAt' => now()->toISOString(),
        ], now()->endOfDay());

        return [
            'alreadyClaimed' => false,
            'code' => $selected['code'],
            'message' => 'Code copié. Tente-le vite sur le serveur compatible.',
        ];
    }

    private function codes(?string $date = null): array
    {
        $date = $this->normalizeDate($date);
        $cacheKey = 'freefire:redeem-codes:'.md5((string) $date);

        return Cache::remember($cacheKey, now()->addSeconds(self::TTL_SECONDS), function () use ($date) {
            if (! $this->configured()) {
                return $this->emptyResponse('Service codes gratuits indisponible.');
            }

            $query = [
                'sectionName' => 'redeemCode',
                'type' => 'fetch',
                'subSec' => $date,
            ];

            $payload = $this->get($query);
            $codes = $this->normalizeRedeemCodes(data_get($payload, 'result.redeem_data', []));

            return [
                'enabled' => true,
                'message' => 'Les codes disponibles peuvent provenir de différents serveurs Free Fire. Sélectionne un code et tente de trouver celui compatible avec ta région.',
                'codes' => $codes,
                'usage' => $payload['usage'] ?? null,
                'date' => $date,
                'publishedAt' => now()->toISOString(),
                'enabledUntil' => now()->addSeconds(self::TTL_SECONDS)->toISOString(),
            ];
        });
    }

    private function get(array $query): array
    {
        $startedAt = microtime(true);
        $query = array_merge($query, [
            'useruid' => $this->userUid,
            'api' => $this->apiKey,
        ]);

        $response = $this->client()->get($this->endpoint, $query);
        $payload = $response->json() ?? [];

        try {
            ApiLog::create([
                'service' => 'freefire_redeem_codes',
                'direction' => 'outbound',
                'endpoint' => $this->endpoint,
                'status_code' => $response->status(),
                'payload' => collect($query)->except('api')->all(),
                'response' => $payload,
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            ]);
        } catch (Throwable) {
            // Redeem code browsing must not depend on logging.
        }

        if ($response->status() === 429) {
            throw new RuntimeException('Quota codes gratuits dépassé. Réessaie plus tard.');
        }

        if (! $response->successful()) {
            $externalMessage = (string) ($payload['message'] ?? $payload['error'] ?? '');
            $message = str_contains(mb_strtolower($externalMessage), 'upgrade')
                ? 'Codes gratuits temporairement indisponibles.'
                : ($externalMessage ?: 'Redeem codes indisponibles.');

            throw new RuntimeException($message);
        }

        if (isset($payload['error'])) {
            throw new RuntimeException((string) $payload['error']);
        }

        return $payload;
    }

    private function client(): PendingRequest
    {
        return Http::timeout((int) config('services.hlgaming.timeout', 12))
            ->retry(2, 300, throw: false)
            ->acceptJson();
    }

    private function configured(): bool
    {
        return filled($this->endpoint) && filled($this->userUid) && filled($this->apiKey);
    }

    private function normalizeRedeemCodes(mixed $redeemData): array
    {
        if (! is_array($redeemData)) {
            return [];
        }

        $seen = [];
        $codes = [];

        foreach ($redeemData as $article) {
            if (! is_array($article) || ! is_array($article['redeem_codes'] ?? null)) {
                continue;
            }

            foreach ($article['redeem_codes'] as $rawCode) {
                $code = strtoupper(trim((string) $rawCode));

                if (! $code || isset($seen[$code])) {
                    continue;
                }

                $seen[$code] = true;
                $codes[] = [
                    'id' => $this->codeId($code),
                    'preview' => $this->maskCode($code),
                    'length' => strlen($code),
                    'code' => $code,
                    'source' => $article['source'] ?? null,
                    'date' => $article['date'] ?? null,
                    'articleTitle' => $article['article_title'] ?? null,
                    'articleLink' => $article['article_link'] ?? null,
                ];
            }
        }

        return $codes;
    }

    private function codeId(string $code): string
    {
        return substr(hash('sha256', $code), 0, 24);
    }

    private function maskCode(string $code): string
    {
        return substr($code, 0, 4).str_repeat('•', max(6, strlen($code) - 4));
    }

    private function claimKey(string $userId): string
    {
        return 'freefire:redeem-claim:'.now()->toDateString().':'.hash('sha256', $userId);
    }

    private function normalizeDate(?string $date): string
    {
        $date = $date ? mb_substr(trim($date), 0, 40) : '';

        return $date !== '' ? $date : now()->format('F j');
    }

    private function emptyResponse(string $message): array
    {
        return [
            'enabled' => false,
            'message' => $message,
            'codes' => [],
            'usage' => null,
            'date' => now()->format('F j'),
        ];
    }
}
