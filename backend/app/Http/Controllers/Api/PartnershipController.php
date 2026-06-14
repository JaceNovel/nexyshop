<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Discord\DiscordNotificationService;
use Illuminate\Http\Request;

class PartnershipController extends Controller
{
    public function store(Request $request, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160'],
            'discord' => ['nullable', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'max:80'],
            'type' => ['required', 'string', 'max:80'],
            'audience' => ['nullable', 'string', 'max:80'],
            'network_url' => ['nullable', 'string', 'max:240'],
            'message' => ['required', 'string', 'max:2000'],
            'expected_earning' => ['nullable', 'string', 'max:120'],
        ]);

        $reference = 'A4G-PARTNER-'.now()->format('Ymd-His').'-'.strtoupper(str()->random(4));
        $discord->partnershipRequest($data + ['reference' => $reference]);

        return response()->json([
            'status' => 'received',
            'reference' => $reference,
            'message' => 'Votre dossier partenaire est en attente d’analyse.',
        ], 201);
    }
}
