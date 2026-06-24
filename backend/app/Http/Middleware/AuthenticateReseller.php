<?php

namespace App\Http\Middleware;

use App\Models\ResellerApiKey;
use App\Models\ResellerPartner;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateReseller
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = trim((string) (
            $request->bearerToken()
            ?: $request->header('X-API-Key')
            ?: $request->header('api-key')
            ?: $request->header('api_key')
            ?: $request->input('api_key')
        ));

        abort_if($token === '', 401, 'API key manquante.');

        $apiKey = ResellerApiKey::query()
            ->with('partner.wallet')
            ->where('key_hash', hash('sha256', $token))
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->first();

        $partner = $apiKey?->partner;
        $sandbox = false;

        if (! $partner && Str::startsWith($token, 'ag_sandbox_')) {
            $partner = ResellerPartner::query()
                ->with('wallet')
                ->where('status', 'active')
                ->get()
                ->first(fn (ResellerPartner $candidate) => hash_equals($this->sandboxKey($candidate), $token));
            $sandbox = (bool) $partner;
        }

        abort_unless($partner, 401, 'API key invalide.');
        abort_unless($partner->status === 'active', 403, 'Compte non actif.');

        if ($apiKey) {
            $apiKey->forceFill(['last_used_at' => now()])->save();
        }

        $request->attributes->set('reseller_partner', $partner);
        $request->attributes->set('reseller_key', $apiKey);
        $request->attributes->set('reseller_sandbox', $sandbox);

        return $next($request);
    }

    private function sandboxKey(ResellerPartner $partner): string
    {
        return 'ag_sandbox_'.substr(hash('sha256', 'partner:'.$partner->id.':'.$partner->email), 0, 40);
    }
}
