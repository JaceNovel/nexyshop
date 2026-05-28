<?php

namespace App\Services\Obs;

use App\Models\ObsSession;

class ObsWebSocketService
{
    public function status(): array
    {
        $configured = filled(config('services.obs.websocket_url'));
        $session = ObsSession::query()->latest()->first();

        return [
            'configured' => $configured,
            'connected' => false,
            'status' => $configured ? ($session?->status ?? 'not_connected') : 'not_configured',
            'is_streaming' => (bool) $session?->is_streaming,
            'is_recording' => (bool) $session?->is_recording,
            'last_seen_at' => $session?->last_seen_at,
        ];
    }

    public function command(string $command): array
    {
        return [
            'accepted' => filled(config('services.obs.websocket_url')),
            'command' => $command,
            'message' => filled(config('services.obs.websocket_url'))
                ? 'Commande OBS preparee. Branchez un worker websocket pour execution temps reel.'
                : 'OBS WebSocket non configure, le site continue sans bloquer.',
        ];
    }
}
