<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifySignedWebhook
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->header('X-Moneroo-Signature')) {
            $signature = (string) $request->header('X-Moneroo-Signature');
            $secret = (string) config('services.payments.moneroo.webhook_secret');
        } else {
            $signature = (string) $request->header('X-NEXY-SIGNATURE');
            $secret = (string) config('services.webhook.secret');
        }

        $expected = hash_hmac('sha256', $request->getContent(), $secret);

        abort_unless($secret !== '' && hash_equals($expected, $signature), 403, 'Invalid webhook signature.');

        return $next($request);
    }
}
