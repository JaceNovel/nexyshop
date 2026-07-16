<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Services\AstralNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AstralChallengeController extends Controller
{
    public function index(Request $request)
    {
        $orders = Order::query()
            ->where('user_id', $request->user()->id)
            ->where('metadata->type', 'astral_esport_challenge')
            ->latest()
            ->limit(5)
            ->get();

        return response()->json([
            'data' => $orders->map(fn (Order $order) => $this->serializeChallenge($order))->values(),
        ]);
    }

    public function store(Request $request, AstralNotificationService $notifications)
    {
        $data = $request->validate([
            'team.name' => ['required', 'string', 'max:120'],
            'team.tag' => ['nullable', 'string', 'max:10'],
            'team.country' => ['nullable', 'string', 'max:80'],
            'team.contact_whatsapp' => ['required', 'string', 'max:40'],
            'team.contact_email' => ['required', 'email', 'max:160'],
            'team.discord' => ['nullable', 'string', 'max:160'],
            'team.members' => ['nullable', 'array', 'max:5'],
            'team.members.*.role' => ['required_with:team.members', 'string', 'max:40'],
            'team.members.*.nickname' => ['nullable', 'string', 'max:80'],
            'team.members.*.uid' => ['nullable', 'string', 'max:40'],
            'team.members.*.whatsapp' => ['nullable', 'string', 'max:40'],
        ]);

        $amount = 10000;
        $currency = 'XOF';
        $team = $data['team'];

        $order = DB::transaction(function () use ($request, $team, $amount, $currency) {
            $product = Product::updateOrCreate(
                ['sku' => 'astral-esport-challenge-fee'],
                [
                    'name' => 'Défi Astral Esport',
                    'game' => 'Astral Esport',
                    'price' => $amount,
                    'currency' => $currency,
                    'active' => true,
                    'metadata' => ['type' => 'astral_esport_challenge'],
                ]
            );

            return Order::create([
                'user_id' => $request->user()->id,
                'product_id' => $product->id,
                'game_uid' => 'ASTRAL-CHALLENGE-'.now()->format('YmdHis').'-'.$request->user()->id,
                'nickname' => $team['name'],
                'amount' => $amount,
                'currency' => $currency,
                'status' => 'pending_payment',
                'metadata' => [
                    'type' => 'astral_esport_challenge',
                    'manual_fulfillment' => true,
                    'fulfillment_status' => 'awaiting_payment',
                    'challenge_status' => 'awaiting_payment',
                    'challenge_schedule' => [
                        'starts_at' => '2026-07-07 20:00:00',
                        'label' => 'Programmé le 07 Jul 2026, 20h00',
                    ],
                    'team' => $team,
                    'room_notice' => 'Les coordonnées seront affichées ici.',
                    'selection_notice' => 'Si votre équipe parvient à gagner, le meilleur joueur sera sélectionné pour rejoindre la team Astral Esport avec une rémunération mensuelle de 50$ à 100$ par mois.',
                ],
            ]);
        });

        $notifications->notifyUser($request->user(), [
            'type' => 'astral_esport_challenge_payment',
            'title' => 'Paiement défi requis',
            'subject' => 'Défi Astral Esport - paiement requis',
            'preview' => "Ton équipe {$team['name']} est prête. Termine le paiement de {$amount} {$currency} pour lancer le défi.",
            'action_label' => 'Payer maintenant',
            'action_url' => rtrim((string) config('services.google.frontend_url'), '/').'/mode',
            'data' => ['order_id' => $order->id, 'challenge' => 'astral_esport'],
        ]);

        return response()->json([
            'order' => $order,
            'message' => 'Défi créé. Paiement requis pour lancer la procédure Astral Esport.',
        ], 201);
    }

    private function serializeChallenge(Order $order): array
    {
        $metadata = $order->metadata ?? [];

        return [
            'id' => $order->id,
            'status' => $order->status,
            'amount' => (float) $order->amount,
            'currency' => $order->currency,
            'team' => $metadata['team'] ?? ['name' => $order->nickname],
            'challenge_status' => $metadata['challenge_status'] ?? null,
            'challenge_status_label' => $metadata['challenge_status_label'] ?? $this->challengeStatusLabel($metadata['challenge_status'] ?? $order->status),
            'schedule' => $metadata['challenge_schedule'] ?? null,
            'room_notice' => $metadata['room_notice'] ?? 'Les coordonnées seront affichées ici.',
            'selection_notice' => $metadata['selection_notice'] ?? 'Si votre équipe parvient à gagner, le meilleur joueur sera sélectionné pour rejoindre la team Astral Esport avec une rémunération mensuelle de 50$ à 100$ par mois.',
            'paid_at' => $metadata['paid_at'] ?? null,
            'created_at' => $order->created_at?->toIso8601String(),
        ];
    }

    private function challengeStatusLabel(?string $status): string
    {
        return match ($status) {
            'accepted', 'scheduled' => 'Défi accepté',
            'awaiting_payment' => 'Paiement requis',
            default => 'Défi en cours de traitement',
        };
    }
}