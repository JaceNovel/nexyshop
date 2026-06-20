<?php

namespace App\Services\Discord;

use App\Models\Stream;
use App\Models\Order;
use App\Models\Product;
use App\Models\Replay;
use App\Models\ResellerPartner;
use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Models\YoutubeVideo;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class DiscordNotificationService
{
    public function tournamentPublished(Tournament $tournament, string $event = 'created'): void
    {
        $detailUrl = $this->tournamentUrl($tournament);
        $registrationUrl = $this->frontendUrl('/tournois/creer-equipe?tournament='.$tournament->id);
        $status = $this->labelStatus((string) $tournament->status);
        $startsAt = $tournament->starts_at?->timezone(config('app.timezone'))->format('d/m/Y H:i') ?? 'A confirmer';
        $game = $tournament->rules['game'] ?? 'Astral4Gamer';
        $rewardUnit = $tournament->rules['reward_unit'] ?? 'FCFA';
        $teamType = $this->teamType($tournament);
        $participants = $tournament->rules['participants'] ?? null;
        $region = $tournament->rules['region'] ?? null;
        $platform = $tournament->rules['platform'] ?? null;
        $description = trim((string) ($tournament->rules['description'] ?? ''));

        $this->send('tournaments', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => $event === 'updated' ? 'Tournoi mis à jour' : 'Nouveau tournoi programmé',
                'description' => "**{$tournament->title}**\n".($description ?: 'Les inscriptions sont ouvertes sur Astral4Gamer. Prépare-toi et viens tenter ta chance.'),
                'url' => $detailUrl,
                'color' => $this->color(),
                'fields' => array_values(array_filter([
                    ['name' => 'Jeu', 'value' => (string) $game, 'inline' => true],
                    ['name' => 'Mode', 'value' => (string) $tournament->mode, 'inline' => true],
                    ['name' => 'Format', 'value' => $teamType, 'inline' => true],
                    ['name' => 'Statut', 'value' => $status, 'inline' => true],
                    ['name' => 'Début', 'value' => $startsAt, 'inline' => true],
                    ['name' => 'À gagner', 'value' => $this->money($tournament->prize_pool, (string) $rewardUnit), 'inline' => true],
                    $participants ? ['name' => 'Places', 'value' => (string) $participants, 'inline' => true] : null,
                    $region ? ['name' => 'Région', 'value' => (string) $region, 'inline' => true] : null,
                    $platform ? ['name' => 'Plateforme', 'value' => (string) $platform, 'inline' => true] : null,
                    $tournament->room_id ? ['name' => 'Room ID', 'value' => (string) $tournament->room_id, 'inline' => true] : null,
                ])),
                'footer' => ['text' => 'ASTRAL4GAMER - PLAY - COMPETE - WIN'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => [
                    [
                        'type' => 2,
                        'style' => 5,
                        'label' => 'Inscription',
                        'url' => $registrationUrl,
                    ],
                    [
                        'type' => 2,
                        'style' => 5,
                        'label' => 'Détails',
                        'url' => $detailUrl,
                    ],
                ],
            ]],
        ]);
    }

    public function tournamentRegistration(Tournament $tournament, TournamentTeam $team, ?User $user = null): void
    {
        $detailUrl = $this->tournamentUrl($tournament);
        $game = (string) ($tournament->rules['game'] ?? 'Astral4Gamer');
        $isSolo = $this->isSoloTournament($tournament);
        $name = $isSolo ? (string) ($user?->name ?: $team->name) : $team->name;
        $message = $isSolo
            ? "**{$name}** ({$game}) vient de s'inscrire à **{$tournament->title}**. Bonne chance à toi."
            : "L'équipe **{$team->name}** ({$game}) vient de s'inscrire à **{$tournament->title}**. Bonne chance à toute l'équipe.";

        $this->send('tournaments', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Nouvelle inscription tournoi',
                'description' => $message,
                'url' => $detailUrl,
                'color' => 0x22C55E,
                'fields' => array_values(array_filter([
                    ['name' => 'Jeu', 'value' => $game, 'inline' => true],
                    ['name' => 'Format', 'value' => $this->teamType($tournament), 'inline' => true],
                    ['name' => $isSolo ? 'Joueur' : 'Équipe', 'value' => $name, 'inline' => true],
                    ['name' => 'Statut', 'value' => 'Inscription reçue', 'inline' => true],
                ])),
                'footer' => ['text' => 'ASTRAL4GAMER - Inscriptions tournoi'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => [[
                    'type' => 2,
                    'style' => 5,
                    'label' => 'Voir le tournoi',
                    'url' => $detailUrl,
                ]],
            ]],
        ]);
    }

    public function tournamentCompleted(Tournament $tournament, ?TournamentTeam $winner = null): void
    {
        $detailUrl = $this->tournamentUrl($tournament);
        $rules = $tournament->rules ?? [];
        $winnerName = (string) ($winner?->name ?: ($rules['winner_name'] ?? 'Gagnant à confirmer'));
        $game = (string) ($rules['game'] ?? 'Astral4Gamer');
        $rewardUnit = (string) ($rules['reward_unit'] ?? 'FCFA');
        $reward = $this->money($tournament->prize_pool, $rewardUnit);

        $this->send('tournaments', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Résultat tournoi',
                'description' => "Le tournoi **{$tournament->title}** est terminé.\nFélicitations à **{$winnerName}** pour la victoire.",
                'url' => $detailUrl,
                'color' => 0xF59E0B,
                'fields' => [
                    ['name' => 'Jeu', 'value' => $game, 'inline' => true],
                    ['name' => 'Format', 'value' => $this->teamType($tournament), 'inline' => true],
                    ['name' => 'Gagnant', 'value' => $winnerName, 'inline' => true],
                    ['name' => 'Gain', 'value' => $reward, 'inline' => true],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Résultats officiels'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => [[
                    'type' => 2,
                    'style' => 5,
                    'label' => 'Voir les détails',
                    'url' => $detailUrl,
                ]],
            ]],
        ]);
    }

    public function tournamentRewardClaimed(Tournament $tournament, ?TournamentTeam $winner = null, mixed $amount = null, ?string $unit = null): void
    {
        $detailUrl = $this->tournamentUrl($tournament);
        $rules = $tournament->rules ?? [];
        $winnerName = (string) ($winner?->name ?: ($rules['winner_name'] ?? 'Gagnant'));
        $reward = $this->money($amount ?? $tournament->prize_pool, $unit ?? (string) ($rules['reward_unit'] ?? 'FCFA'));
        $subject = $this->isSoloTournament($tournament) ? "Le joueur **{$winnerName}**" : "Super, l'équipe **{$winnerName}**";

        $this->send('tournaments', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Gain tournoi réclamé',
                'description' => "{$subject} vient de réclamer ses gains pour **{$tournament->title}**.\nLes récompenses ont été envoyées par l'administration Astral4Gamer.",
                'url' => $detailUrl,
                'color' => 0x0EA5E9,
                'fields' => [
                    ['name' => 'Gagnant', 'value' => $winnerName, 'inline' => true],
                    ['name' => 'Gain envoyé', 'value' => $reward, 'inline' => true],
                    ['name' => 'Statut', 'value' => 'Récompense envoyée', 'inline' => true],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Réclamation validée'],
                'timestamp' => now()->toIso8601String(),
            ]],
        ]);
    }

    public function streamPublished(Stream|YoutubeVideo $stream, string $event = 'created'): void
    {
        $isYoutubeVideo = $stream instanceof YoutubeVideo;
        $watchUrl = $isYoutubeVideo
            ? 'https://www.youtube.com/watch?v='.$stream->youtube_video_id
            : ($stream->watch_url ?: $this->frontendUrl('/live'));
        $siteUrl = $this->frontendUrl($isYoutubeVideo ? '/replays' : '/live');
        $title = $stream->title ?: ($isYoutubeVideo ? 'Nouvelle video Astral4Gamer' : 'Live Astral4Gamer');
        $scheduledAt = $isYoutubeVideo
            ? $stream->published_at?->timezone(config('app.timezone'))->format('d/m/Y H:i')
            : $stream->scheduled_at?->timezone(config('app.timezone'))->format('d/m/Y H:i');
        $isLiveNow = ! $isYoutubeVideo && in_array((string) $stream->status, ['live', 'started'], true);
        $webhook = $isYoutubeVideo ? 'streams' : ($isLiveNow ? 'lives' : 'events');

        $this->send($webhook, [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => $isYoutubeVideo ? 'Nouvelle video disponible' : ($isLiveNow ? 'Live en cours' : 'Evenement live programme'),
                'description' => $isLiveNow
                    ? "**{$title}**\nLe live est en cours. Rejoins la diffusion et suis l'action maintenant."
                    : "**{$title}**\nUn live est programme sur Astral4Gamer. Ajoute-le a ton calendrier et prepare-toi.",
                'url' => $watchUrl,
                'color' => $isLiveNow ? 0x22C55E : $this->color(),
                'thumbnail' => $stream->thumbnail_url ? ['url' => $stream->thumbnail_url] : null,
                'fields' => array_values(array_filter([
                    ['name' => 'Type', 'value' => $isYoutubeVideo ? ucfirst((string) $stream->type) : ($isLiveNow ? 'Live maintenant' : 'Evenement live'), 'inline' => true],
                    ['name' => 'Statut', 'value' => $isYoutubeVideo ? 'Disponible' : $this->labelStatus((string) $stream->status), 'inline' => true],
                    $scheduledAt ? ['name' => $isYoutubeVideo ? 'Publication' : 'Debut', 'value' => $scheduledAt, 'inline' => true] : null,
                    ! $isYoutubeVideo && $stream->tournament ? ['name' => 'Tournoi lie', 'value' => $stream->tournament->title, 'inline' => false] : null,
                ])),
                'footer' => ['text' => 'ASTRAL4GAMER - Streams officiels'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => [
                    [
                        'type' => 2,
                        'style' => 5,
                        'label' => $isYoutubeVideo ? 'Voir la video' : ($isLiveNow ? 'Suivre le live' : 'Aller voir'),
                        'url' => $watchUrl,
                    ],
                    [
                        'type' => 2,
                        'style' => 5,
                        'label' => 'Ouvrir Astral4Gamer',
                        'url' => $siteUrl,
                    ],
                ],
            ]],
        ]);
    }

    public function dailyPromotion(array $products, int $discountPercent = 5, ?string $expiresAt = null): void
    {
        $items = collect($products)
            ->filter(fn ($product) => $product instanceof Product)
            ->take(2)
            ->values();

        if ($items->isEmpty()) {
            return;
        }

        $lines = $items->map(function (Product $product) use ($discountPercent) {
            $price = $product->metadata['promo']['price'] ?? $product->price;
            $currency = $product->currency ?: 'USD';

            return "**{$product->name}** - {$this->money($price, $currency)} avec -{$discountPercent}% pendant 24h";
        })->implode("\n");

        $this->send('promotions', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Promotions boutique du jour',
                'description' => "Deux offres Astral4Gamer sont en promotion aujourd'hui.\n{$lines}",
                'url' => $this->frontendUrl('/category/top-up'),
                'color' => 0xF97316,
                'fields' => [
                    ['name' => 'Reduction', 'value' => "-{$discountPercent}%", 'inline' => true],
                    ['name' => 'Duree', 'value' => '24h', 'inline' => true],
                    ['name' => 'Fin', 'value' => $expiresAt ?: 'Dans 24h', 'inline' => true],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Offres boutique'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => [[
                    'type' => 2,
                    'style' => 5,
                    'label' => 'Voir les promotions',
                    'url' => $this->frontendUrl('/category/top-up'),
                ]],
            ]],
        ]);
    }

    public function giveawayCalendar(array $items): void
    {
        $lines = collect($items)
            ->take(6)
            ->map(fn (array $item) => "- **".($item['title'] ?? 'Giveaway Astral4Gamer')."** : ".($item['date'] ?? 'Date a confirmer').' - '.($item['reward'] ?? 'Gain surprise'))
            ->implode("\n");

        $this->send('events', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Calendrier giveaways Astral4Gamer',
                'description' => $lines ?: 'Le calendrier des giveaways arrive bientot.',
                'url' => $this->frontendUrl('/tournois'),
                'color' => 0x8B5CF6,
                'footer' => ['text' => 'ASTRAL4GAMER - Evenements communautaires'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => [[
                    'type' => 2,
                    'style' => 5,
                    'label' => 'Voir les evenements',
                    'url' => $this->frontendUrl('/tournois'),
                ]],
            ]],
        ]);
    }

    public function orderSupportRequest(array $data, ?User $user = null, ?Order $order = null): void
    {
        $name = trim((string) ($data['name'] ?? $user?->name ?? 'Client Astral4Gamer'));
        $email = trim((string) ($data['email'] ?? $user?->email ?? 'Non renseigne'));
        $message = trim((string) ($data['message'] ?? ''));
        $orderReference = $order ? '#'.$order->id : trim((string) ($data['order_reference'] ?? 'Non renseignee'));

        $this->send('support', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Demande support commande',
                'description' => "**{$name}** demande une aide privee concernant une commande.\n\n{$message}",
                'color' => 0x0EA5E9,
                'fields' => [
                    ['name' => 'Commande', 'value' => $orderReference, 'inline' => true],
                    ['name' => 'Email', 'value' => $email, 'inline' => true],
                    ['name' => 'Statut commande', 'value' => $order?->status ?? 'Non verifie', 'inline' => true],
                    ['name' => 'Montant', 'value' => $order ? $this->money($order->amount, $order->currency) : 'Non renseigne', 'inline' => true],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Support prive'],
                'timestamp' => now()->toIso8601String(),
            ]],
        ]);
    }

    public function manualFulfillmentPaid(Order $order): void
    {
        $product = Product::find($order->product_id);
        $customer = $order->metadata['customer'] ?? [];
        $fields = collect($order->metadata['supplier_fields'] ?? [])
            ->map(fn ($value, $key) => ['name' => ucfirst(str_replace('_', ' ', (string) $key)), 'value' => (string) $value, 'inline' => false])
            ->values()
            ->all();

        $this->send('support', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Nouvelle recharge manuelle CODM à traiter',
                'description' => "La commande #{$order->id} a été payée et doit être traitée manuellement.",
                'color' => 0xF59E0B,
                'fields' => array_merge([
                    ['name' => 'Produit', 'value' => $product?->name ?? 'Produit inconnu', 'inline' => true],
                    ['name' => 'Montant', 'value' => $this->money($order->amount, $order->currency), 'inline' => true],
                    ['name' => 'Client', 'value' => trim((string) ($customer['first_name'] ?? '').' '.($customer['last_name'] ?? '')) ?: 'Client Astral4Gamer', 'inline' => true],
                    ['name' => 'Email paiement', 'value' => (string) ($customer['email'] ?? 'Non renseigne'), 'inline' => true],
                    ['name' => 'Telephone', 'value' => (string) ($customer['phone'] ?? 'Non renseigne'), 'inline' => true],
                    ['name' => 'Reference commande', 'value' => '#'.$order->id, 'inline' => true],
                ], $fields),
                'footer' => ['text' => 'ASTRAL4GAMER - Fulfillment manuel'],
                'timestamp' => now()->toIso8601String(),
            ]],
        ]);
    }

    public function manualFulfillmentUpdated(Order $order, string $status): void
    {
        $product = Product::find($order->product_id);
        $productName = $product?->name ?? 'Call of Duty Mobile';
        $isDelivered = $status === 'delivered';

        $this->send('community', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => $isDelivered ? 'Recharge Call of Duty Mobile livrée' : 'Recharge Call of Duty Mobile en échec',
                'description' => $isDelivered
                    ? "La recharge de **{$productName}** a été un grand succès."
                    : "La recharge de **{$productName}** a été un echec.",
                'color' => $isDelivered ? 0x22C55E : 0xEF4444,
                'fields' => [
                    ['name' => 'Commande', 'value' => '#'.$order->id, 'inline' => true],
                    ['name' => 'Statut', 'value' => $isDelivered ? 'Livrée' : 'Echec', 'inline' => true],
                    ['name' => 'Jeu', 'value' => 'Call of Duty Mobile', 'inline' => true],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Communaute CODM'],
                'timestamp' => now()->toIso8601String(),
            ]],
        ]);
    }

    public function communityProfileShare(User $user, array $data): void
    {
        $username = $user->username ?: str($user->name)->slug()->toString();
        $profileUrl = $this->frontendUrl('/profile/'.$username);
        $game = trim((string) ($data['game'] ?? $user->game ?? 'Jeu non renseigne'));
        $message = trim((string) ($data['message'] ?? ''));

        $this->send('community', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Profil partage dans la communaute',
                'description' => "**{$user->name}** partage son profil Astral4Gamer.\n{$message}",
                'url' => $profileUrl,
                'color' => 0xEF233C,
                'thumbnail' => ($user->avatar_url || $user->google_avatar_url) ? ['url' => $user->avatar_url ?: $user->google_avatar_url] : null,
                'fields' => [
                    ['name' => 'Jeu', 'value' => $game, 'inline' => true],
                    ['name' => 'UID', 'value' => $user->player_uid ?: 'Non renseigne', 'inline' => true],
                    ['name' => 'Rang', 'value' => $user->rank ?: 'Non renseigne', 'inline' => true],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Communaute'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => [[
                    'type' => 2,
                    'style' => 5,
                    'label' => 'Voir le profil',
                    'url' => $profileUrl,
                ]],
            ]],
        ]);
    }

    public function communityTeamSearch(User $user, array $data): void
    {
        $game = trim((string) ($data['game'] ?? $user->game ?? 'Jeu non renseigne'));
        $role = trim((string) ($data['role'] ?? 'Joueur'));
        $region = trim((string) ($data['region'] ?? $user->country ?? 'Region non renseignee'));
        $message = trim((string) ($data['message'] ?? 'Recherche une equipe pour jouer et progresser.'));

        $this->send('community', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Recherche team',
                'description' => "**{$user->name}** cherche une team.\n{$message}",
                'color' => 0x2563EB,
                'fields' => [
                    ['name' => 'Jeu', 'value' => $game, 'inline' => true],
                    ['name' => 'Role recherche', 'value' => $role, 'inline' => true],
                    ['name' => 'Region', 'value' => $region, 'inline' => true],
                    ['name' => 'Contact Discord', 'value' => trim((string) ($data['discord'] ?? 'Via Astral4Gamer')), 'inline' => true],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Recherche team'],
                'timestamp' => now()->toIso8601String(),
            ]],
        ]);
    }

    public function communityClipShare(User $user, Replay|YoutubeVideo|null $video, array $data): void
    {
        $youtubeVideoId = $data['youtube_video_id'] ?? $video?->youtube_video_id ?? null;
        $watchUrl = $youtubeVideoId ? "https://www.youtube.com/watch?v={$youtubeVideoId}" : $this->frontendUrl('/replays');
        $title = trim((string) ($data['title'] ?? $video?->title ?? 'Clip Astral4Gamer'));
        $message = trim((string) ($data['message'] ?? 'Clip issu d’un live passe.'));
        $thumbnail = $video?->thumbnail_url ?: ($youtubeVideoId ? "https://img.youtube.com/vi/{$youtubeVideoId}/hqdefault.jpg" : null);

        $this->send('community', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => $title,
                'description' => "**{$user->name}** partage un clip/replay.\n{$message}",
                'url' => $watchUrl,
                'color' => 0x8B5CF6,
                'thumbnail' => $thumbnail ? ['url' => $thumbnail] : null,
                'fields' => [
                    ['name' => 'Source', 'value' => 'Live passe / replay', 'inline' => true],
                    ['name' => 'YouTube', 'value' => $youtubeVideoId ?: 'Non renseigne', 'inline' => true],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Clips communaute'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => [[
                    'type' => 2,
                    'style' => 5,
                    'label' => 'Voir la video',
                    'url' => $watchUrl,
                ]],
            ]],
        ]);
    }

    public function partnershipRequest(array $data): void
    {
        $reference = (string) ($data['reference'] ?? 'A4G-PARTNER');
        $name = trim((string) ($data['name'] ?? '')) ?: 'Candidat partenaire';
        $type = trim((string) ($data['type'] ?? '')) ?: 'Partenariat';
        $email = trim((string) ($data['email'] ?? '')) ?: 'Non renseigné';
        $discordName = trim((string) ($data['discord'] ?? '')) ?: 'Non renseigné';
        $country = trim((string) ($data['country'] ?? '')) ?: 'Non renseigné';
        $audience = trim((string) ($data['audience'] ?? '')) ?: 'Non renseigné';
        $networkUrl = trim((string) ($data['network_url'] ?? ''));
        $earning = trim((string) ($data['expected_earning'] ?? '')) ?: 'A estimer';
        $message = trim((string) ($data['message'] ?? ''));

        $this->send('partners', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Nouvelle demande de partenariat',
                'description' => "**{$name}** a soumis un dossier partenaire depuis Astral4Gamer.\n\n{$message}",
                'color' => $this->color(),
                'fields' => array_values(array_filter([
                    ['name' => 'Référence', 'value' => $reference, 'inline' => true],
                    ['name' => 'Type', 'value' => $type, 'inline' => true],
                    ['name' => 'Gain estimé', 'value' => $earning, 'inline' => true],
                    ['name' => 'Email', 'value' => $email, 'inline' => true],
                    ['name' => 'Discord', 'value' => $discordName, 'inline' => true],
                    ['name' => 'Pays', 'value' => $country, 'inline' => true],
                    ['name' => 'Audience / Volume', 'value' => $audience, 'inline' => true],
                    $networkUrl !== '' ? ['name' => 'Lien', 'value' => $networkUrl, 'inline' => false] : null,
                    ['name' => 'Statut', 'value' => 'En attente d’analyse du dossier', 'inline' => false],
                ])),
                'footer' => ['text' => 'ASTRAL4GAMER - Dossier partenariat privé'],
                'timestamp' => now()->toIso8601String(),
            ]],
        ]);
    }

    public function resellerApproved(ResellerPartner $partner, string $email): void
    {
        $this->send('partners', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Partenaire reseller activé',
                'description' => "**{$partner->company_name}** peut maintenant utiliser l’API Astral4Gamer Reseller.",
                'color' => 0x22C55E,
                'fields' => [
                    ['name' => 'Email panel', 'value' => $email, 'inline' => true],
                    ['name' => 'Scope', 'value' => $partner->allowed_scope, 'inline' => true],
                    ['name' => 'Marge Astral', 'value' => $partner->margin_percent.'%', 'inline' => true],
                    ['name' => 'Panel', 'value' => (string) config('services.reseller.panel_url'), 'inline' => false],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Reseller API'],
                'timestamp' => now()->toIso8601String(),
            ]],
        ]);
    }

    public function resellerWalletEvent(ResellerPartner $partner, string $type, float $amount, float $balance, string $reference): void
    {
        $label = $type === 'credit' ? 'Recharge reseller confirmée' : 'Mouvement wallet reseller';

        $this->send('partners', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => $label,
                'description' => "**{$partner->company_name}** a un mouvement de solde reseller.",
                'color' => $type === 'credit' ? 0x22C55E : 0x8B5CF6,
                'fields' => [
                    ['name' => 'Montant', 'value' => $this->money($amount, 'USD'), 'inline' => true],
                    ['name' => 'Solde actuel', 'value' => $this->money($balance, 'USD'), 'inline' => true],
                    ['name' => 'Référence', 'value' => $reference, 'inline' => false],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Wallet reseller'],
                'timestamp' => now()->toIso8601String(),
            ]],
        ]);
    }

    public function resellerLowBalance(ResellerPartner $partner, float $balance): void
    {
        $this->send('partners', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Alerte solde reseller faible',
                'description' => "**{$partner->company_name}** est sous le seuil minimum.",
                'color' => 0xEF233C,
                'fields' => [
                    ['name' => 'Solde', 'value' => $this->money($balance, 'USD'), 'inline' => true],
                    ['name' => 'Seuil', 'value' => $this->money((float) $partner->low_balance_threshold, 'USD'), 'inline' => true],
                    ['name' => 'Action', 'value' => 'Notifier le partenaire ou attendre sa recharge Moneroo.', 'inline' => false],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Surveillance reseller'],
                'timestamp' => now()->toIso8601String(),
            ]],
        ]);
    }

    public function send(string $webhookKey, array $payload): void
    {
        if (! (bool) config('services.discord.enabled', false)) {
            return;
        }

        $webhookUrl = (string) config("services.discord.webhooks.{$webhookKey}", '');
        if ($webhookUrl === '') {
            return;
        }

        try {
            $response = Http::timeout((int) config('services.discord.timeout', 8))
                ->asJson()
                ->post($webhookUrl, $this->cleanPayload($payload));

            if ($response->failed()) {
                Log::warning('Discord webhook failed.', [
                    'webhook' => $webhookKey,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (Throwable $exception) {
            Log::warning('Discord webhook exception.', [
                'webhook' => $webhookKey,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    private function cleanPayload(array $payload): array
    {
        return collect($payload)
            ->filter(fn ($value) => $value !== null && $value !== [])
            ->map(fn ($value) => is_array($value) ? $this->cleanPayload($value) : $value)
            ->all();
    }

    private function frontendUrl(string $path): string
    {
        return rtrim((string) config('services.google.frontend_url'), '/').$path;
    }

    private function tournamentUrl(Tournament $tournament): string
    {
        return $this->frontendUrl('/tournois/detail?id='.$tournament->id);
    }

    private function teamType(Tournament $tournament): string
    {
        $type = trim((string) ($tournament->rules['team_type'] ?? ''));

        if ($type !== '') {
            return $type;
        }

        return $this->isSoloTournament($tournament) ? 'Solo' : 'Équipe';
    }

    private function isSoloTournament(Tournament $tournament): bool
    {
        $source = strtolower((string) ($tournament->rules['team_type'] ?? $tournament->mode));

        return str_contains($source, 'solo');
    }

    private function labelStatus(string $status): string
    {
        return match ($status) {
            'scheduled' => 'Programme',
            'open' => 'Inscriptions ouvertes',
            'live' => 'En direct',
            'completed' => 'Termine',
            default => $status !== '' ? ucfirst(str_replace('_', ' ', $status)) : 'A confirmer',
        };
    }

    private function money(mixed $amount, string $unit): string
    {
        if (! is_numeric($amount)) {
            return 'A confirmer';
        }

        $decimals = in_array(strtoupper($unit), ['USD', 'EUR'], true) ? 2 : 0;

        return trim(number_format((float) $amount, $decimals, ',', ' ').' '.$unit);
    }

    private function color(): int
    {
        return 0xEF233C;
    }
}
