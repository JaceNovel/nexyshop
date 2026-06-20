<?php

namespace App\Http\Middleware;

use App\Models\ResellerApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateReseller
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken() ?: (string) $request->header('api-key');

        abort_if($token === '', 401, 'API key reseller manquante.');

        $apiKey = ResellerApiKey::query()
            ->with('partner.wallet')
            ->where('key_hash', hash('sha256', $token))
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->first();

        abort_unless($apiKey && $apiKey->partner, 401, 'API key reseller invalide.');
        abort_unless($apiKey->partner->status === 'active', 403, 'Compte reseller non actif.');

        $apiKey->forceFill(['last_used_at' => now()])->save();
        $request->attributes->set('reseller_partner', $apiKey->partner);
        $request->attributes->set('reseller_key', $apiKey);

        return $next($request);
    }
}
