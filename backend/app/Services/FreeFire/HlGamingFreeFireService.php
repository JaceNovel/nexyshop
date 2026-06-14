<?php

namespace App\Services\FreeFire;

use App\Models\ApiLog;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class HlGamingFreeFireService
{
    private const SUPPORTED_REGIONS = ['bd', 'ind', 'br', 'us', 'sac', 'na', 'id', 'sg', 'pk'];
    private const VALIDATION_TTL_MINUTES = 4320;
    private const ACCOUNT_TTL_MINUTES = 4320;
    private const VISUALS_TTL_MINUTES = 1440;
    private const IMAGE_CODE_TTL_MINUTES = 10080;
    private const PROFILE_TTL_MINUTES = 4320;

    private string $accountEndpoint;
    private string $validationEndpoint;
    private string $metaEndpoint;
    private ?string $likesEndpoint;
    private ?string $userUid;
    private ?string $apiKey;
    private string $provider;

    public function __construct()
    {
        $this->provider = (string) config('services.freefire.provider', 'gameskinbo');
        $this->accountEndpoint = config('services.gameskinbo.freefire.endpoint', config('services.hlgaming.freefire.account_endpoint'));
        $this->validationEndpoint = config('services.hlgaming.freefire.validation_endpoint');
        $this->metaEndpoint = config('services.hlgaming.freefire.meta_endpoint');
        $this->likesEndpoint = config('services.hlgaming.freefire.likes_endpoint');
        $this->userUid = config('services.hlgaming.useruid');
        $this->apiKey = config('services.gameskinbo.api_key', config('services.hlgaming.api_key'));
    }

    public function validateUid(string $uid, string $region): array
    {
        $region = $this->normalizeRegion($region);

        if (! $this->configured()) {
            return $this->demoValidation($uid, $region);
        }

        $cacheKey = "gameskinbo:freefire:validation:{$region}:{$uid}";

        return Cache::remember($cacheKey, now()->addMinutes(self::VALIDATION_TTL_MINUTES), function () use ($uid, $region) {
            $payload = $this->get($this->accountEndpoint, $this->freeFireQuery($uid, $region));

            $accountInfo = $payload['AccountInfo'] ?? $payload['result']['AccountInfo'] ?? [];

            if (! filled($accountInfo['AccountName'] ?? null)) {
                throw new RuntimeException('ID Free Fire incorrect.');
            }

            return [
                'uid' => $uid,
                'region' => strtolower((string) ($accountInfo['AccountRegion'] ?? $region)),
                'nickname' => (string) ($accountInfo['AccountName'] ?? 'FreeFire_'.$uid),
                'level' => $accountInfo['AccountLevel'] ?? null,
                'verified' => true,
                'source' => 'gameskinbo',
                'usage' => null,
            ];
        });
    }

    public function accountInfo(string $uid, string $region): array
    {
        $region = $this->normalizeRegion($region);

        if (! $this->configured()) {
            return $this->demoAccount($uid, $region);
        }

        $cacheKey = "gameskinbo:freefire:account:{$region}:{$uid}";

        return Cache::remember($cacheKey, now()->addMinutes(self::ACCOUNT_TTL_MINUTES), fn () => [
            'source' => 'gameskinbo',
            'result' => $this->get($this->accountEndpoint, $this->freeFireQuery($uid, $region)),
            'usage' => null,
        ]);
    }

    public function visuals(string $uid, string $region): array
    {
        $region = $this->normalizeRegion($region);

        return [
            'source' => 'gameskinbo',
            'endpoint' => 'visuals',
            'result' => [
                'uid' => $uid,
                'region' => strtolower($region),
                'outfitUrl' => null,
                'bannerUrl' => null,
            ],
            'usage' => null,
        ];
    }

    public function imageByCode(string $code): array
    {
        return [
            'source' => 'gameskinbo',
            'endpoint' => 'image',
            'result' => ['url' => null],
            'usage' => null,
        ];
    }

    public function profile(string $uid, string $region): array
    {
        $region = $this->normalizeRegion($region);
        $cacheKey = "gameskinbo:freefire:profile:{$region}:{$uid}";

        return Cache::remember($cacheKey, now()->addMinutes(self::PROFILE_TTL_MINUTES), function () use ($uid, $region) {
            $validation = $this->validateUid($uid, $region);
            $region = $this->normalizeRegion($validation['region'] ?? $region);
            $account = $this->accountInfo($uid, $region);
            $visuals = $this->visuals($uid, $region);

            $accountInfo = $account['result']['AccountInfo'] ?? [];
            $profileInfo = $account['result']['AccountProfileInfo'] ?? [];
            $guildInfo = $account['result']['GuildInfo'] ?? null;
            $stats = $account['result']['playerStats'] ?? $account['result']['PlayerStats'] ?? $account['playerStats'] ?? null;
            $visualResult = $visuals['result'] ?? [];
            $outfitUrl = $visualResult['outfitUrl'] ?? $visualResult['url'] ?? null;
            $bannerUrl = $visualResult['bannerUrl'] ?? null;

            if ($this->isMissingImageUrl($outfitUrl) && ! empty($accountInfo['AccountAvatarId'])) {
                $avatarImage = $this->imageByCode((string) $accountInfo['AccountAvatarId']);
                $outfitUrl = $avatarImage['result']['url'] ?? null;
            }

            if ($this->isMissingImageUrl($bannerUrl) && ! empty($accountInfo['AccountBannerId'])) {
                $bannerImage = $this->imageByCode((string) $accountInfo['AccountBannerId']);
                $bannerUrl = $bannerImage['result']['url'] ?? null;
            }

            return [
                'uid' => $validation['uid'],
                'region' => $validation['region'],
                'nickname' => (string) ($accountInfo['AccountName'] ?? $validation['nickname']),
                'level' => $accountInfo['AccountLevel'] ?? $validation['level'] ?? null,
                'likes' => $accountInfo['AccountLikes'] ?? null,
                'exp' => $accountInfo['AccountEXP'] ?? null,
                'last_login_at' => $accountInfo['AccountLastLogin'] ?? null,
                'created_at' => $accountInfo['AccountCreateTime'] ?? null,
                'br_rank_points' => $profileInfo['BrRankPoint'] ?? $accountInfo['BrRankPoint'] ?? null,
                'cs_rank_points' => $profileInfo['CsRankPoint'] ?? $accountInfo['CsRankPoint'] ?? null,
                'rank' => [
                    'br' => $profileInfo['BrMaxRank'] ?? $accountInfo['BrMaxRank'] ?? null,
                    'cs' => $profileInfo['CsMaxRank'] ?? $accountInfo['CsMaxRank'] ?? null,
                    'season' => $accountInfo['AccountSeasonId'] ?? null,
                ],
                'guild' => $guildInfo,
                'stats' => $stats,
                'outfit_url' => $outfitUrl,
                'banner_url' => $bannerUrl,
                'account' => $account['result'] ?? null,
                'usage' => [
                    'validation' => $validation['usage'] ?? null,
                    'account' => $account['usage'] ?? null,
                    'visuals' => $visuals['usage'] ?? null,
                ],
            ];
        });
    }

    public function likesQuote(int $likes = 100): array
    {
        $maxLikes = (int) config('services.hlgaming.freefire.likes_daily_limit', 100);
        $price = (int) config('services.hlgaming.freefire.likes_price_xof', 300);

        return [
            'likes' => min($likes, $maxLikes),
            'max_per_day' => $maxLikes,
            'amount' => $price,
            'currency' => 'XOF',
            'message' => "{$maxLikes} likes Free Fire coûtent {$price} FCFA.",
        ];
    }

    public function requestLikes(string $uid, string $region, int $likes = 100): array
    {
        $region = $this->normalizeRegion($region);
        $quote = $this->likesQuote($likes);

        if ($likes > $quote['max_per_day']) {
            throw new RuntimeException('Tu ne peux pas envoyer plus de 100 likes par jour.');
        }

        if (! $this->likesEndpoint || ! $this->configured()) {
            return [
                'status' => 'payment_required',
                'quote' => $quote,
                'uid' => $uid,
                'region' => strtolower($region),
                'message' => 'Paiement requis avant envoi des likes.',
            ];
        }

        return $this->get($this->likesEndpoint, [
            'sectionName' => 'likes',
            'uid' => $uid,
            'region' => strtolower($region),
            'likes' => $quote['likes'],
        ]);
    }

    private function get(string $endpoint, array $query): array
    {
        $startedAt = microtime(true);

        $response = $this->client()->get($endpoint, $query);
        $payload = $response->json() ?? [];

        try {
            ApiLog::create([
                'service' => 'gameskinbo_freefire',
                'direction' => 'outbound',
                'endpoint' => $endpoint,
                'status_code' => $response->status(),
                'payload' => $query,
                'response' => $payload,
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            ]);
        } catch (Throwable) {
            // Logging must never block player lookup.
        }

        if ($response->status() === 429) {
            throw new RuntimeException('Quota API Free Fire dépassé. Réessaie plus tard.');
        }

        if ($response->status() === 401) {
            throw new RuntimeException('Clé API Free Fire invalide ou manquante.');
        }

        if ($response->status() === 402) {
            throw new RuntimeException('ID Free Fire incorrect.');
        }

        if (! $response->successful()) {
            throw new RuntimeException($payload['error'] ?? $payload['message'] ?? 'Service Free Fire indisponible.');
        }

        return $payload;
    }

    private function client(): PendingRequest
    {
        return Http::timeout((int) config('services.gameskinbo.timeout', 12))
            ->retry(2, 300)
            ->withHeaders(['x-api-key' => (string) $this->apiKey])
            ->acceptJson();
    }

    private function configured(): bool
    {
        return filled($this->apiKey);
    }

    private function normalizeRegion(string $region): string
    {
        $normalized = strtolower(trim($region));
        $normalized = $normalized === 'ind' ? 'in' : $normalized;

        return $normalized;
    }

    private function gameskinboRegion(?string $region): ?string
    {
        $normalized = strtolower(trim((string) $region));
        $map = [
            'in' => 'IND',
            'ind' => 'IND',
            'bd' => 'BD',
            'br' => 'BR',
            'us' => 'US',
            'sac' => 'SAC',
            'na' => 'NA',
            'id' => 'ID',
            'sg' => 'SG',
            'pk' => 'PK',
        ];

        return $map[$normalized] ?? null;
    }

    private function freeFireQuery(string $uid, string $region): array
    {
        $query = ['uid' => $uid];
        $apiRegion = $this->gameskinboRegion($region);

        if ($apiRegion) {
            $query['region'] = $apiRegion;
        }

        return $query;
    }

    private function isMissingImageUrl(?string $url): bool
    {
        if (! $url) {
            return true;
        }

        return str_contains(strtolower(urldecode($url)), 'not found');
    }

    private function demoValidation(string $uid, string $region): array
    {
        if (! preg_match('/^[0-9]{6,15}$/', $uid)) {
            throw new RuntimeException('ID Free Fire incorrect.');
        }

        return [
            'uid' => $uid,
            'region' => strtolower($region),
            'nickname' => 'FF_'.$uid,
            'level' => 67,
            'verified' => true,
            'source' => 'demo',
            'usage' => null,
        ];
    }

    private function demoAccount(string $uid, string $region): array
    {
        return [
            'source' => 'Astral4Gamer',
            'result' => [
                'AccountInfo' => [
                    'AccountName' => 'FF_'.$uid,
                    'AccountLevel' => 67,
                    'AccountLikes' => 2303,
                    'AccountRegion' => strtolower($region),
                    'BrRankPoint' => 3520,
                    'CsRankPoint' => 101,
                    'BrMaxRank' => 324,
                    'CsMaxRank' => 321,
                    'AccountSeasonId' => 44,
                ],
                'GuildInfo' => [
                    'GuildName' => 'ASTRAL ELITE',
                    'GuildLevel' => 4,
                    'GuildMember' => 39,
                    'GuildCapacity' => 40,
                ],
            ],
            'usage' => null,
        ];
    }

    private function demoVisuals(string $uid, string $region): array
    {
        return [
            'source' => 'Astral4Gamer demo',
            'endpoint' => 'image',
            'isBeta' => true,
            'result' => [
                'uid' => $uid,
                'region' => strtolower($region),
                'outfitUrl' => 'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=520&q=80',
                'bannerUrl' => 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&q=80',
            ],
            'usage' => null,
        ];
    }
}
