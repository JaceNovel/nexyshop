<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PartnershipRequest;
use App\Services\Discord\DiscordNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class PartnershipController extends Controller
{
    public function store(Request $request, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'company_name' => ['nullable', 'string', 'max:140'],
            'email' => ['required', 'email', 'max:160'],
            'discord' => ['nullable', 'string', 'max:120'],
            'discord_user_id' => ['nullable', 'string', 'max:80'],
            'discord_username' => ['nullable', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'max:80'],
            'type' => ['required', 'string', 'max:80'],
            'audience' => ['nullable', 'string', 'max:80'],
            'network_url' => ['nullable', 'string', 'max:240'],
            'message' => ['required', 'string', 'max:2000'],
            'expected_earning' => ['nullable', 'string', 'max:120'],
        ]);

        $reference = 'A4G-PARTNER-'.now()->format('Ymd-His').'-'.strtoupper(str()->random(4));
        PartnershipRequest::create($data + [
            'reference' => $reference,
            'status' => 'pending',
        ]);

        try {
            $discord->partnershipRequest($data + ['reference' => $reference]);
        } catch (Throwable $exception) {
            Log::warning('Partnership Discord notification failed.', [
                'reference' => $reference,
                'message' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'status' => 'received',
            'reference' => $reference,
            'message' => 'Votre dossier partenaire est en attente d’analyse.',
        ], 201);
    }

    public function approvedForBot(Request $request)
    {
        $this->authorizeBot($request);

        return PartnershipRequest::query()
            ->where('status', 'approved')
            ->whereNotNull('discord_user_id')
            ->whereNull('metadata->credentials_notified_at')
            ->whereNotNull('metadata->credentials')
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (PartnershipRequest $item) => [
                'id' => $item->id,
                'reference' => $item->reference,
                'name' => $item->name,
                'company_name' => $item->company_name,
                'discord_user_id' => $item->discord_user_id,
                'credentials' => $item->metadata['credentials'] ?? null,
            ]);
    }

    public function markBotNotified(Request $request, PartnershipRequest $partnershipRequest)
    {
        $this->authorizeBot($request);

        $metadata = $partnershipRequest->metadata ?? [];
        unset($metadata['credentials']);
        $metadata['credentials_notified_at'] = now()->toIso8601String();

        $partnershipRequest->update(['metadata' => $metadata]);

        return ['notified' => true];
    }

    private function authorizeBot(Request $request): void
    {
        $expected = (string) config('services.discord.backend_token');
        abort_if($expected === '', 403, 'Bot token non configure.');
        abort_unless(hash_equals($expected, (string) $request->header('X-Astral-Bot-Token')), 403, 'Bot token invalide.');
    }
}
