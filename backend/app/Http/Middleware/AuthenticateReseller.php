<?php

namespace App\Http\Middleware;

use App\Models\ApiLog;
use App\Models\ResellerApiKey;
use App\Models\ResellerPartner;
use App\Services\Reseller\ResellerApiSubscriptionService;
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

        if ($token === '') {
            $this->logAuthenticationAttempt($request, 401, 'API key manquante.');
            abort(401, 'API key manquante.');
        }

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

        if (! $partner) {
            $this->logAuthenticationAttempt($request, 401, 'API key invalide.');
            abort(401, 'API key invalide.');
        }

        if ($this->isFraudBlocked($partner)) {
            $this->logAuthenticationAttempt($request, 403, 'Fraude observée. Contactez-nous via Discord.', $partner, $sandbox);
            abort(403, 'Fraude observée. Contactez-nous via Discord.');
        }

        if ($partner->status !== 'active') {
            $allowedWhileSuspended = $request->is('api/reseller/panel*') || $request->is('api/reseller/v1/get-balance');
            if (! $allowedWhileSuspended) {
                $this->logAuthenticationAttempt($request, 403, 'Compte partenaire suspendu. Accès API bloqué.', $partner, $sandbox);
                abort(403, 'Compte partenaire suspendu. Accès API bloqué.');
            }
        }

        $subscriptionService = app(ResellerApiSubscriptionService::class);
        if (! $subscriptionService->canUsePaidApi($partner, $request)) {
            $this->logAuthenticationAttempt($request, 403, 'Votre compte partenaire est suspendu car l’abonnement API Astral mensuel n’a pas été réglé. Rechargez votre solde pour réactiver l’accès.', $partner, $sandbox);
            abort(403, 'Votre compte partenaire est suspendu car l’abonnement API Astral mensuel n’a pas été réglé. Rechargez votre solde pour réactiver l’accès.');
        }

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

    private function isFraudBlocked(ResellerPartner $partner): bool
    {
        return (bool) ($partner->metadata['fraud_blocked'] ?? false)
            || ($partner->risk_level === 'blocked' && $partner->api_status === 'suspended');
    }

    private function logAuthenticationAttempt(Request $request, int $statusCode, string $message, ?ResellerPartner $partner = null, bool $sandbox = false): void
    {
        try {
            ApiLog::create([
                'service' => 'reseller_api',
                'direction' => 'incoming',
                'endpoint' => $request->path(),
                'status_code' => $statusCode,
                'payload' => [
                    'partner_id' => $partner?->id,
                    'partner_name' => $partner?->name,
                    'sandbox' => $sandbox,
                    'token_prefix' => $this->tokenPrefix($request),
                    'has_bearer_token' => $request->bearerToken() !== null,
                    'has_api_key_header' => $request->headers->has('X-API-Key') || $request->headers->has('api-key'),
                    'has_api_key_input' => $request->has('api_key'),
                ],
                'response' => ['message' => $message],
            ]);
        } catch (\Throwable) {
            // Auth logging must never change the API response.
        }
    }

    private function tokenPrefix(Request $request): ?string
    {
        $token = trim((string) (
            $request->bearerToken()
            ?: $request->header('X-API-Key')
            ?: $request->header('api-key')
            ?: $request->header('api_key')
            ?: $request->input('api_key')
        ));

        return $token === '' ? null : substr($token, 0, 12);
    }
}
