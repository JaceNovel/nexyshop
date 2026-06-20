<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ResellerApiKey;
use App\Models\ResellerPartner;
use App\Services\Reseller\ResellerWalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ResellerAuthController extends Controller
{
    public function login(Request $request, ResellerWalletService $wallets)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $partner = ResellerPartner::where('email', $data['email'])->first();
        abort_unless($partner && Hash::check($data['password'], $partner->password), 422, 'Identifiants reseller incorrects.');
        abort_unless($partner->status === 'active', 403, 'Compte reseller non actif.');

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

        return [
            'id' => $partner->id,
            'name' => $partner->name,
            'company_name' => $partner->company_name,
            'email' => $partner->email,
            'status' => $partner->status,
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
                'currency' => $wallet->currency,
            ],
        ];
    }
}
