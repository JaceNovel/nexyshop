<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PartnershipRequest;
use App\Models\ResellerApiKey;
use App\Models\ResellerOrder;
use App\Models\ResellerPartner;
use App\Models\ResellerWalletTransaction;
use App\Services\Discord\DiscordNotificationService;
use App\Services\Reseller\ResellerWalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class AdminResellerController extends Controller
{
    public function index()
    {
        return [
            'partners' => ResellerPartner::with('wallet')->latest()->paginate(50)
                ->through(fn (ResellerPartner $partner) => $this->serializePartner($partner)),
            'pending_requests' => PartnershipRequest::where('status', 'pending')->latest()->limit(20)->get(),
            'recent_orders' => ResellerOrder::with('partner')->latest()->limit(20)->get(),
            'recent_transactions' => ResellerWalletTransaction::with('partner')->latest()->limit(20)->get(),
            'available_games' => $this->availableGames(),
            'nexy_settlement' => $this->nexySettlement(),
        ];
    }

    public function requests()
    {
        return PartnershipRequest::latest()->paginate(50);
    }

    public function approve(Request $request, PartnershipRequest $partnershipRequest, ResellerWalletService $wallets, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'email' => ['nullable', 'email', 'max:160'],
            'password' => ['nullable', 'string', 'min:10', 'max:120'],
            'margin_percent' => ['nullable', 'numeric', 'min:0', 'max:60'],
            'allowed_scope' => ['nullable', 'string', 'max:80'],
            'allowed_games' => ['nullable', 'array'],
            'allowed_games.*' => ['string', 'max:80'],
        ]);

        $email = $data['email'] ?? $this->partnerEmail($partnershipRequest);
        $password = $data['password'] ?? Str::password(14, true, true, false, false);
        $apiKey = 'ag_live_'.Str::random(64);
        $allowedGames = $this->normalizeAllowedGames($data['allowed_games'] ?? Arr::wrap($data['allowed_scope'] ?? 'free_fire'));

        $partner = ResellerPartner::updateOrCreate(
            ['email' => $email],
            [
                'name' => $partnershipRequest->name,
                'company_name' => $partnershipRequest->company_name ?: $partnershipRequest->name,
                'password' => $password,
                'discord' => $partnershipRequest->discord,
                'status' => 'active',
                'allowed_scope' => $this->scopeFromGames($allowedGames),
                'margin_percent' => $data['margin_percent'] ?? (float) config('services.reseller.default_margin_percent', 10),
                'minimum_topup' => (float) config('services.reseller.minimum_topup', 10),
                'low_balance_threshold' => (float) config('services.reseller.low_balance_threshold', 10),
                'metadata' => [
                    'partnership_request_id' => $partnershipRequest->id,
                    'source_email' => $partnershipRequest->email,
                    'country' => $partnershipRequest->country,
                    'network_url' => $partnershipRequest->network_url,
                    'allowed_games' => $allowedGames,
                ],
            ]
        );

        $wallets->ensureWallet($partner);

        ResellerApiKey::create([
            'reseller_partner_id' => $partner->id,
            'name' => 'Live API key',
            'prefix' => substr($apiKey, 0, 12),
            'key_hash' => hash('sha256', $apiKey),
            'type' => 'api',
            'active' => true,
        ]);

        $metadata = $partnershipRequest->metadata ?? [];
        $metadata['credentials'] = [
            'email' => $email,
            'password' => $password,
            'api_key' => $apiKey,
            'panel_url' => config('services.reseller.panel_url'),
        ];
        $metadata['approved_at'] = now()->toIso8601String();
        $metadata['approved_partner_id'] = $partner->id;

        $partnershipRequest->update([
            'status' => 'approved',
            'metadata' => $metadata,
        ]);
        $discord->resellerApproved($partner, $email);

        return response()->json([
            'partner' => $this->serializePartner($partner->load('wallet')),
            'credentials' => [
                'email' => $email,
                'password' => $password,
                'api_key' => $apiKey,
                'panel_url' => config('services.reseller.panel_url'),
            ],
        ], 201);
    }

    public function update(Request $request, ResellerPartner $partner)
    {
        $data = $request->validate([
            'margin_percent' => ['nullable', 'numeric', 'min:0', 'max:60'],
            'allowed_games' => ['nullable', 'array'],
            'allowed_games.*' => ['string', 'max:80'],
        ]);

        $metadata = is_array($partner->metadata) ? $partner->metadata : [];

        if ($this->isNexyPartner($partner)) {
            $allowedGames = $this->nexyAllowedGames($metadata['allowed_games'] ?? null);
            $metadata['allowed_games'] = $allowedGames;
            $metadata['partner_code'] = $metadata['partner_code'] ?? 'nexy';
            $metadata['api_subscription_exempt'] = true;
        } else {
            $allowedGames = $this->normalizeAllowedGames($data['allowed_games'] ?? ($metadata['allowed_games'] ?? Arr::wrap($partner->allowed_scope)));
            $metadata['allowed_games'] = $allowedGames;
        }

        $partner->update([
            'margin_percent' => $data['margin_percent'] ?? $partner->margin_percent,
            'allowed_scope' => $this->scopeFromGames($allowedGames),
            'metadata' => $metadata,
        ]);

        return ['partner' => $this->serializePartner($partner->fresh('wallet'))];
    }

    public function suspend(ResellerPartner $partner)
    {
        $partner->update(['status' => 'suspended']);

        return ['partner' => $this->serializePartner($partner->fresh('wallet'))];
    }

    public function activate(ResellerPartner $partner)
    {
        $partner->update(['status' => 'active']);

        return ['partner' => $this->serializePartner($partner->fresh('wallet'))];
    }

    private function partnerEmail(PartnershipRequest $request): string
    {
        $local = Str::slug($request->company_name ?: $request->name, '.');
        $local = trim($local ?: Str::before($request->email, '@'), '.');

        return $local.'@partners.astral4gamer.com';
    }

    private function serializePartner(ResellerPartner $partner): array
    {
        $partner->loadMissing('wallet');
        $isNexy = $this->isNexyPartner($partner);
        $allowedGames = $isNexy
            ? $this->nexyAllowedGames($partner->metadata['allowed_games'] ?? null)
            : $this->normalizeAllowedGames($partner->metadata['allowed_games'] ?? Arr::wrap($partner->allowed_scope));

        return [
            'id' => $partner->id,
            'name' => $partner->name,
            'company_name' => $partner->company_name,
            'email' => $partner->email,
            'status' => $partner->status,
            'allowed_scope' => $partner->allowed_scope,
            'allowed_games' => $allowedGames,
            'margin_percent' => (float) $partner->margin_percent,
            'minimum_topup' => (float) $partner->minimum_topup,
            'low_balance_threshold' => (float) $partner->low_balance_threshold,
            'wallet' => $partner->wallet ? [
                'balance' => (float) $partner->wallet->balance,
                'currency' => $partner->wallet->currency,
            ] : null,
            'api_subscription_exempt' => (bool) ($partner->metadata['api_subscription_exempt'] ?? strtolower((string) ($partner->metadata['partner_code'] ?? '')) === 'nexy'),
            'protected_partner' => $isNexy,
            'protection_note' => $isNexy ? 'Nexy est protege: ses jeux ne sont pas modifies par les reglages globaux.' : null,
        ];
    }

    private function nexySettlement(): array
    {
        $partner = ResellerPartner::query()
            ->where('metadata->partner_code', 'nexy')
            ->orWhere('company_name', 'like', '%NEXY%')
            ->orWhere('email', 'nexy.shop@partners.astral4gamer.com')
            ->orderBy('id')
            ->first();

        if (! $partner) {
            return [
                'partner_found' => false,
                'benefit_due' => 0,
                'currency' => 'USD',
                'orders_count' => 0,
                'refunded_count' => 0,
                'period_start' => now()->startOfMonth()->toDateString(),
                'period_end' => now()->endOfMonth()->toDateString(),
            ];
        }

        $orders = ResellerOrder::query()
            ->with('order')
            ->where('reseller_partner_id', $partner->id)
            ->where('created_at', '>=', now()->startOfMonth())
            ->latest()
            ->limit(500)
            ->get()
            ->filter(fn (ResellerOrder $order) => data_get($order->request_payload, 'source') === 'site_nexy_contract'
                || data_get($order->order?->metadata, 'nexy_contract.enabled'));

        $refunded = $orders->filter(fn (ResellerOrder $order) => in_array($order->status, ['failed', 'refunded'], true)
            || data_get($order->order?->metadata, 'reseller_refunded_at'));
        $active = $orders->diff($refunded);

        return [
            'partner_found' => true,
            'partner_id' => $partner->id,
            'partner_name' => $partner->company_name ?: $partner->name,
            'benefit_due' => round((float) $active->sum(fn (ResellerOrder $order) => (float) data_get($order->response_payload, 'nexy_contract.benefit_amount', $order->margin_amount)), 2),
            'wallet_debited' => round((float) $active->sum('amount'), 2),
            'orders_count' => $orders->count(),
            'active_count' => $active->count(),
            'refunded_count' => $refunded->count(),
            'currency' => data_get($active->first()?->response_payload, 'nexy_contract.benefit_currency')
                ?? data_get($orders->first()?->response_payload, 'nexy_contract.benefit_currency')
                ?? $orders->first()?->currency
                ?? $partner->wallet?->currency
                ?? 'USD',
            'wallet_currency' => $partner->wallet?->currency ?? 'USD',
            'period_start' => now()->startOfMonth()->toDateString(),
            'period_end' => now()->endOfMonth()->toDateString(),
        ];
    }

    private function availableGames(): array
    {
        return [
            ['slug' => 'free_fire_mena', 'label' => 'Free Fire MENA'],
            ['slug' => 'pubg_mobile_global', 'label' => 'PUBG Mobile Auto Global'],
            ['slug' => 'blood_strike_mena', 'label' => 'Blood Strike MENA'],
            ['slug' => 'clash_of_clans_gems', 'label' => 'Clash of Clans Gems'],
            ['slug' => 'brawl_stars', 'label' => 'Brawl Stars'],
            ['slug' => 'clash_royale_gems', 'label' => 'Clash Royale Gems'],
            ['slug' => 'roblox_global', 'label' => 'Roblox Global'],
            ['slug' => 'garena_free_fire_global', 'label' => 'Garena Free Fire Global'],
            ['slug' => 'mobile_legends', 'label' => 'Mobile Legends'],
            ['slug' => 'farlight_84', 'label' => 'Farlight 84'],
            ['slug' => 'playstation', 'label' => 'PlayStation'],
            ['slug' => 'gift_cards', 'label' => 'Gift Cards'],
        ];
    }

    private function normalizeAllowedGames(array $games): array
    {
        $allowed = collect($this->availableGames())->pluck('slug')->all();
        $aliases = [
            'free_fire' => 'free_fire_mena',
            'pubg' => 'pubg_mobile_global',
            'blood_strike' => 'blood_strike_mena',
            'gift_cards' => 'gift_cards',
            'mobile_legend' => 'mobile_legends',
            'mobile_legend_bang_bang' => 'mobile_legends',
            'farlight' => 'farlight_84',
            'psn' => 'playstation',
            'playstation_network' => 'playstation',
        ];

        $normalized = collect($games)
            ->filter(fn ($game) => is_string($game) && trim($game) !== '')
            ->map(fn ($game) => trim((string) $game))
            ->map(fn ($game) => $aliases[$game] ?? $game)
            ->filter(fn ($game) => in_array($game, $allowed, true))
            ->unique()
            ->values()
            ->all();

        return $normalized !== [] ? $normalized : ['free_fire_mena'];
    }

    private function scopeFromGames(array $games): string
    {
        return count($games) === 1 ? $games[0] : 'multi_game';
    }

    private function isNexyPartner(ResellerPartner $partner): bool
    {
        return strtolower((string) ($partner->metadata['partner_code'] ?? '')) === 'nexy'
            || str_contains(strtolower((string) $partner->company_name), 'nexy')
            || $partner->email === 'nexy.shop@partners.astral4gamer.com';
    }

    private function nexyAllowedGames(mixed $current): array
    {
        $legacy = ['free_fire', 'call_of_duty_mobile', 'gift_cards', 'pubg', 'blood_strike', 'mobile_legends', 'farlight_84', 'playstation'];
        $games = is_array($current) ? array_values(array_filter($current, fn ($game) => is_string($game) && trim($game) !== '')) : [];

        return collect([...$games, ...$legacy])->map(fn ($game) => trim((string) $game))->unique()->values()->all();
    }
}
