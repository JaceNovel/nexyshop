<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ResellerApiKey;
use App\Models\ResellerPartner;
use App\Models\ResellerPartnerLog;
use App\Services\Discord\DiscordNotificationService;
use App\Services\Reseller\ResellerApiSubscriptionService;
use App\Services\Reseller\ResellerWalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ResellerAuthController extends Controller
{
    private const FRAUD_BLOCK_MESSAGE = 'Fraude observée. Contactez-nous via Discord.';

    public function login(Request $request, ResellerWalletService $wallets, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $partner = ResellerPartner::where('email', $data['email'])->first();
        abort_unless($partner && Hash::check($data['password'], $partner->password), 422, 'Identifiants reseller incorrects.');

        if ($this->isIndaPartner($partner) || $this->isFraudBlocked($partner)) {
            $this->blockPartnerForFraud($partner, $discord);

            return response()->json([
                'message' => self::FRAUD_BLOCK_MESSAGE,
                'code' => 'reseller_fraud_blocked',
                'support_url' => $this->supportUrl(),
            ], 403);
        }

        abort_unless(in_array($partner->status, ['active', 'suspended'], true), 403, 'Compte reseller non actif.');

        $token = 'ag_panel_'.Str::random(64);
        ResellerApiKey::create([
            'reseller_partner_id' => $partner->id,
            'name' => 'Panel session',
            'prefix' => substr($token, 0, 12),
            'key_hash' => hash('sha256', $token),
            'type' => 'panel',
            'active' => true,
            'expires_at' => now()->addDays(7),
        ]);

        return [
            'token' => $token,
            'partner' => $this->partnerPayload($partner, $wallets),
        ];
    }

    public function me(Request $request, ResellerWalletService $wallets)
    {
        return ['partner' => $this->partnerPayload($request->attributes->get('reseller_partner'), $wallets)];
    }

    private function partnerPayload(ResellerPartner $partner, ResellerWalletService $wallets): array
    {
        $wallet = $wallets->ensureWallet($partner);
        $partner->setRelation('wallet', $wallet);
        $subscription = app(ResellerApiSubscriptionService::class)->subscriptionPayload($partner);

        return [
            'id' => $partner->id,
            'name' => $partner->name,
            'company_name' => $partner->company_name,
            'email' => $partner->email,
            'status' => $partner->status,
            'api_status' => $partner->api_status ?? 'active',
            'risk_level' => $partner->risk_level ?? 'excellent',
            'astral_score' => (int) ($partner->astral_score ?? 900),
            'order_creation_allowed' => (bool) ($partner->order_creation_allowed ?? true),
            'allowed_scope' => $partner->allowed_scope,
            'allowed_games' => collect($partner->metadata['allowed_games'] ?? Arr::wrap($partner->allowed_scope))
                ->filter(fn ($game) => is_string($game) && trim($game) !== '')
                ->values()
                ->all(),
            'margin_percent' => $partner->margin_percent,
            'minimum_topup' => $partner->minimum_topup,
            'low_balance_threshold' => $partner->low_balance_threshold,
            'wallet' => [
                'balance' => (float) $wallet->balance,
                'available_balance' => (float) $wallet->available_balance,
                'pending_balance' => (float) $wallet->pending_balance,
                'credit_balance' => (float) $wallet->credit_balance,
                'total_recharged' => (float) $wallet->total_recharged,
                'total_spent' => (float) $wallet->total_spent,
                'total_borrowed' => (float) $wallet->total_borrowed,
                'total_repaid' => (float) $wallet->total_repaid,
                'total_fees_paid' => (float) $wallet->total_fees_paid,
                'wallet_status' => $wallet->wallet_status,
                'currency' => $wallet->currency,
            ],
            'api_subscription' => $subscription,
        ];
    }

    private function isIndaPartner(ResellerPartner $partner): bool
    {
        $haystack = strtolower(implode(' ', array_filter([
            $partner->name,
            $partner->company_name,
            $partner->email,
            $partner->allowed_scope,
            $partner->metadata['partner_code'] ?? null,
        ])));

        return str_contains($haystack, 'inda');
    }

    private function isFraudBlocked(ResellerPartner $partner): bool
    {
        return (bool) ($partner->metadata['fraud_blocked'] ?? false)
            || ($partner->risk_level === 'blocked' && $partner->api_status === 'suspended');
    }

    private function blockPartnerForFraud(ResellerPartner $partner, DiscordNotificationService $discord): void
    {
        $metadata = is_array($partner->metadata) ? $partner->metadata : [];
        $alreadyBlocked = (bool) ($metadata['fraud_blocked'] ?? false);

        $metadata['fraud_blocked'] = true;
        $metadata['fraud_block_reason'] = 'Fraude observée';
        $metadata['fraud_blocked_at'] = $metadata['fraud_blocked_at'] ?? now()->toIso8601String();

        $partner->forceFill([
            'status' => 'suspended',
            'api_status' => 'suspended',
            'risk_level' => 'blocked',
            'order_creation_allowed' => false,
            'metadata' => $metadata,
        ])->save();

        ResellerApiKey::query()
            ->where('reseller_partner_id', $partner->id)
            ->where('active', true)
            ->update(['active' => false]);

        ResellerPartnerLog::create([
            'reseller_partner_id' => $partner->id,
            'type' => 'fraud_block',
            'description' => self::FRAUD_BLOCK_MESSAGE,
            'metadata' => ['support_url' => $this->supportUrl()],
        ]);

        if (! $alreadyBlocked) {
            $discord->resellerApiBlocked($partner->fresh() ?? $partner, self::FRAUD_BLOCK_MESSAGE, $this->supportUrl());
        }
    }

    private function supportUrl(): string
    {
        return (string) env('DISCORD_PARTNER_URL', env('DISCORD_INVITE_URL', 'https://discord.gg/wutKWRh5H'));
    }
}
