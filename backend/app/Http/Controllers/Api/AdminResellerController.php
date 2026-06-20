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

        $allowedGames = $this->normalizeAllowedGames($data['allowed_games'] ?? ($partner->metadata['allowed_games'] ?? Arr::wrap($partner->allowed_scope)));
        $metadata = is_array($partner->metadata) ? $partner->metadata : [];
        $metadata['allowed_games'] = $allowedGames;

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
        $allowedGames = $this->normalizeAllowedGames($partner->metadata['allowed_games'] ?? Arr::wrap($partner->allowed_scope));

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
        ];
    }

    private function availableGames(): array
    {
        return [
            ['slug' => 'free_fire', 'label' => 'Free Fire'],
            ['slug' => 'pubg', 'label' => 'PUBG Mobile'],
            ['slug' => 'call_of_duty_mobile', 'label' => 'Call of Duty Mobile'],
            ['slug' => 'valorant', 'label' => 'Valorant'],
            ['slug' => 'genshin_impact', 'label' => 'Genshin Impact'],
            ['slug' => 'steam', 'label' => 'Steam'],
            ['slug' => 'gift_cards', 'label' => 'Gift Cards'],
        ];
    }

    private function normalizeAllowedGames(array $games): array
    {
        $allowed = collect($this->availableGames())->pluck('slug')->all();

        $normalized = collect($games)
            ->filter(fn ($game) => is_string($game) && trim($game) !== '')
            ->map(fn ($game) => trim((string) $game))
            ->filter(fn ($game) => in_array($game, $allowed, true))
            ->unique()
            ->values()
            ->all();

        return $normalized !== [] ? $normalized : ['free_fire'];
    }

    private function scopeFromGames(array $games): string
    {
        return count($games) === 1 ? $games[0] : 'multi_game';
    }
}
