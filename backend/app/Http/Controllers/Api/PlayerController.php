<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\TournamentTeam;
use App\Services\FreeFire\FreeFireLookupService;
use App\Services\Suppliers\FazerCardsGateway;
use App\Services\Suppliers\SupplierManager;
use Illuminate\Http\Request;
use RuntimeException;

class PlayerController extends Controller
{
    public function verify(Request $request, SupplierManager $suppliers, FreeFireLookupService $freeFire)
    {
        $data = $request->validate([
            'game' => ['required', 'string', 'max:80'],
            'uid' => ['required', 'string', 'max:64'],
            'region' => ['nullable', 'string', 'max:8'],
            'variation_id' => ['nullable', 'string', 'max:255'],
            'fields' => ['nullable', 'array'],
            'fields.*' => ['nullable', 'string', 'max:500'],
        ]);

        if ($this->isFreeFireGame($data['game'])) {
            try {
                $profile = $freeFire->validateUid($data['uid'], $data['region'] ?? config('services.freefire.lookup.default_region', 'me'));
            } catch (RuntimeException $exception) {
                return response()->json([
                    'message' => $this->publicVerificationMessage($exception),
                    'verified' => false,
                ], 422);
            }

            return [
                'uid' => $profile['uid'],
                'nickname' => $profile['nickname'],
                'avatar' => null,
                'region' => $profile['region'] ?? null,
                'level' => $profile['level'] ?? null,
                'verified' => (bool) ($profile['verified'] ?? false),
            ];
        }

        if (! empty($data['variation_id']) && $this->requiresFazerValidation((string) $data['variation_id'])) {
            $supplier = Supplier::query()->where('slug', 'fazercards')->whereActive(true)->first();

            abort_unless($supplier, 503, 'Service de vérification joueur indisponible.');

            $gateway = $suppliers->gateway($supplier);
            abort_unless($gateway instanceof FazerCardsGateway, 503, 'Service de vérification joueur indisponible.');

            try {
                $fields = array_filter($data['fields'] ?? [], fn ($value) => $value !== null && $value !== '');
                $fields += [
                    'player_id' => $data['uid'],
                    'user_id' => $data['uid'],
                    'uid' => $data['uid'],
                    'account_id' => $data['uid'],
                ];
                $validation = $gateway->validateTopupSku((string) $data['variation_id'], $fields);
            } catch (\Throwable $exception) {
                if ($this->isSupplierValidationUnavailable($exception) && $this->hasValidRequiredFields((string) $data['variation_id'], $data['uid'], $fields ?? [])) {
                    return [
                        'uid' => $data['uid'],
                        'nickname' => $data['uid'],
                        'avatar' => null,
                        'region' => $data['region'] ?? null,
                        'verified' => true,
                        'source' => 'format_validation',
                    ];
                }

                return response()->json([
                    'message' => 'ID joueur invalide ou introuvable pour ce produit.',
                    'verified' => false,
                ], 422);
            }

            if (! $this->isSuccessfulValidation($validation)) {
                return response()->json([
                    'message' => $validation['message'] ?? $validation['error'] ?? 'ID joueur invalide ou introuvable pour ce produit.',
                    'verified' => false,
                ], 422);
            }

            return [
                'uid' => $data['uid'],
                'nickname' => $validation['nickname'] ?? $validation['username'] ?? data_get($validation, 'data.nickname') ?? data_get($validation, 'data.username') ?? $data['uid'],
                'avatar' => null,
                'region' => $data['region'] ?? null,
                'verified' => true,
                'source' => 'fazercards',
            ];
        }

        $supplier = Supplier::whereActive(true)->orderBy('priority')->first();

        abort_unless($supplier, 503, 'Service de vérification joueur indisponible.');

        return $suppliers->gateway($supplier)->verifyPlayer($data['game'], $data['uid']);
    }

    public function leaderboards()
    {
        return [
            'top_players' => TournamentTeam::orderByDesc('points')->limit(20)->get(),
            'top_killers' => TournamentTeam::orderByDesc('kills')->limit(20)->get(),
            'top_guilds' => TournamentTeam::selectRaw('guild_id, sum(points) as points, sum(kills) as kills')
                ->groupBy('guild_id')
                ->orderByDesc('points')
                ->limit(20)
                ->get(),
        ];
    }

    private function isFreeFireGame(string $game): bool
    {
        $normalized = str($game)->lower()->ascii()->toString();

        return str_contains($normalized, 'free fire') || str_contains($normalized, 'freefire') || str_contains($normalized, 'garena');
    }

    private function requiresFazerValidation(string $variationId): bool
    {
        $categoryId = FazerCardsGateway::decodedTopupCategory($variationId);

        return $categoryId && preg_match('/^(genshin_impact|pubg_|mobile_legends)/', $categoryId) === 1;
    }

    private function isSuccessfulValidation(array $validation): bool
    {
        foreach (['valid', 'verified', 'success', 'data.valid', 'data.verified', 'data.success'] as $key) {
            $value = data_get($validation, $key);

            if ($value !== null) {
                return (bool) $value;
            }
        }

        if (array_key_exists('ok', $validation)) {
            return (bool) $validation['ok'];
        }

        return true;
    }

    private function isSupplierValidationUnavailable(\Throwable $exception): bool
    {
        return str_contains($exception->getMessage(), 'ID validation is not available');
    }

    private function hasValidRequiredFields(string $variationId, string $uid, array $fields): bool
    {
        $categoryId = FazerCardsGateway::decodedTopupCategory($variationId) ?? '';
        $playerId = trim((string) ($fields['player_id'] ?? $fields['user_id'] ?? $fields['uid'] ?? $fields['account_id'] ?? $uid));

        if ($playerId === '') {
            return false;
        }

        if (str_starts_with($categoryId, 'genshin_impact')) {
            return preg_match('/^\d{6,12}$/', $playerId) === 1 && trim((string) ($fields['server'] ?? '')) !== '';
        }

        if (str_starts_with($categoryId, 'mobile_legends')) {
            return preg_match('/^\d{4,20}$/', $playerId) === 1 && preg_match('/^\d{1,10}$/', (string) ($fields['server_id'] ?? '')) === 1;
        }

        if (str_starts_with($categoryId, 'pubg_')) {
            return preg_match('/^[A-Za-z0-9_\-]{5,40}$/', $playerId) === 1;
        }

        return true;
    }

    private function publicVerificationMessage(RuntimeException $exception): string
    {
        $message = $exception->getMessage();

        if (str_contains($message, 'clé') || str_contains($message, 'API')) {
            return 'Vérification du joueur indisponible pour le moment.';
        }

        return $message ?: 'Vérification du joueur impossible.';
    }
}
