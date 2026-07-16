<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ClerkAuthController extends Controller
{
    public function session(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $payload = $this->verifyToken($data['token']);
        $clerkId = (string) $payload['sub'];
        $profile = $this->clerkUser($clerkId);
        $email = $this->primaryEmail($profile);

        abort_unless($email, 422, 'Compte Clerk sans email valide.');

        $name = trim(implode(' ', array_filter([
            $profile['first_name'] ?? null,
            $profile['last_name'] ?? null,
        ]))) ?: ($profile['username'] ?? Str::before($email, '@'));

        $user = User::query()
            ->where('clerk_id', $clerkId)
            ->orWhere('email', $email)
            ->first();

        if (! $user) {
            $user = User::create([
                'clerk_id' => $clerkId,
                'name' => $name,
                'email' => $email,
                'password' => Hash::make(Str::random(40)),
                'avatar_url' => $profile['image_url'] ?? null,
                'last_login_at' => now(),
            ]);
        } else {
            $user->forceFill(array_filter([
                'clerk_id' => $user->clerk_id ?: $clerkId,
                'name' => $user->name ?: $name,
                'avatar_url' => $user->avatar_url ?: ($profile['image_url'] ?? null),
                'last_login_at' => now(),
            ], fn ($value) => $value !== null && $value !== ''))->save();
        }

        return response()->json([
            'token' => $user->createToken('clerk-web')->plainTextToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => $user->avatar_url,
            ],
        ]);
    }

    private function verifyToken(string $token): array
    {
        $parts = explode('.', $token);
        abort_unless(count($parts) === 3, 401, 'Session Clerk invalide.');

        $header = $this->decodeJson($parts[0]);
        $payload = $this->decodeJson($parts[1]);
        $issuer = rtrim((string) config('services.clerk.issuer'), '/');

        abort_unless($issuer !== '', 503, 'CLERK_JWT_ISSUER doit etre configure sur le backend.');
        abort_unless(($header['alg'] ?? null) === 'RS256' && ! empty($header['kid']), 401, 'Session Clerk invalide.');
        abort_unless(($payload['iss'] ?? null) === $issuer, 401, 'Emetteur Clerk invalide.');
        abort_unless(! empty($payload['sub']), 401, 'Utilisateur Clerk invalide.');

        $now = time();
        abort_unless(empty($payload['nbf']) || (int) $payload['nbf'] <= $now, 401, 'Session Clerk pas encore active.');
        abort_unless(empty($payload['exp']) || (int) $payload['exp'] > $now, 401, 'Session Clerk expiree.');

        $key = collect($this->jwks($issuer))->firstWhere('kid', $header['kid']);
        abort_unless($key && ($key['kty'] ?? null) === 'RSA', 401, 'Cle Clerk introuvable.');

        $verified = openssl_verify(
            $parts[0].'.'.$parts[1],
            $this->base64UrlDecode($parts[2]),
            $this->rsaJwkToPem($key),
            OPENSSL_ALGO_SHA256
        );

        abort_unless($verified === 1, 401, 'Signature Clerk invalide.');

        return $payload;
    }

    private function clerkUser(string $clerkId): array
    {
        $secret = (string) config('services.clerk.secret_key');
        abort_unless($secret !== '', 503, 'CLERK_SECRET_KEY doit etre configure sur le backend.');

        return Http::withToken($secret)
            ->acceptJson()
            ->get("https://api.clerk.com/v1/users/{$clerkId}")
            ->throw()
            ->json();
    }

    private function primaryEmail(array $profile): ?string
    {
        $primaryId = $profile['primary_email_address_id'] ?? null;
        $emails = collect($profile['email_addresses'] ?? []);
        $primary = $emails->firstWhere('id', $primaryId) ?? $emails->first();
        $email = $primary['email_address'] ?? null;

        return filter_var($email, FILTER_VALIDATE_EMAIL) ? strtolower($email) : null;
    }

    private function jwks(string $issuer): array
    {
        return Cache::remember('clerk_jwks:'.sha1($issuer), now()->addHours(6), function () use ($issuer) {
            return Http::acceptJson()->get($issuer.'/.well-known/jwks.json')->throw()->json('keys', []);
        });
    }

    private function decodeJson(string $value): array
    {
        $decoded = json_decode($this->base64UrlDecode($value), true);

        abort_unless(is_array($decoded), 401, 'Session Clerk invalide.');

        return $decoded;
    }

    private function base64UrlDecode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/').str_repeat('=', (4 - strlen($value) % 4) % 4)) ?: '';
    }

    private function rsaJwkToPem(array $key): string
    {
        $modulus = $this->base64UrlDecode((string) $key['n']);
        $exponent = $this->base64UrlDecode((string) $key['e']);
        $rsaPublicKey = $this->asn1Sequence($this->asn1Integer($modulus).$this->asn1Integer($exponent));
        $algorithm = hex2bin('300d06092a864886f70d0101010500');
        $publicKey = $this->asn1Sequence($algorithm.$this->asn1BitString($rsaPublicKey));

        return "-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode($publicKey), 64, "\n")."-----END PUBLIC KEY-----\n";
    }

    private function asn1Sequence(string $value): string
    {
        return "\x30".$this->asn1Length(strlen($value)).$value;
    }

    private function asn1Integer(string $value): string
    {
        $value = ltrim($value, "\x00") ?: "\x00";
        if (ord($value[0]) > 0x7f) {
            $value = "\x00".$value;
        }

        return "\x02".$this->asn1Length(strlen($value)).$value;
    }

    private function asn1BitString(string $value): string
    {
        return "\x03".$this->asn1Length(strlen($value) + 1)."\x00".$value;
    }

    private function asn1Length(int $length): string
    {
        if ($length < 128) {
            return chr($length);
        }

        $bytes = '';
        while ($length > 0) {
            $bytes = chr($length & 0xff).$bytes;
            $length >>= 8;
        }

        return chr(0x80 | strlen($bytes)).$bytes;
    }
}