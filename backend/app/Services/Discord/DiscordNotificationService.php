<?php

namespace App\Services\Discord;

use App\Models\BlogPost;
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
    public function blogPostPublished(BlogPost $post): void
    {
        $url = $this->frontendUrl('/blog/'.$post->slug);

        $this->send('announcements', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Nouvel article Astral4Gamer',
                'description' => "**{$post->title}**\n".($post->excerpt ?: 'Un nouvel article est disponible sur le blog Astral4Gamer.'),
                'url' => $url,
                'color' => $this->color(),
                'image' => ($imageUrl = $this->publicImageUrl($post->cover_image_url)) ? ['url' => $imageUrl] : null,
                'fields' => [
                    ['name' => 'Blog', 'value' => 'Astral4Gamer', 'inline' => true],
                    ['name' => 'Statut', 'value' => 'Publié', 'inline' => true],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Annonces'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => [[
                    'type' => 2,
                    'style' => 5,
                    'label' => 'Lire l article',
                    'url' => $url,
                ]],
            ]],
        ]);
    }

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
        $title = trim((string) ($tournament->rules['title_en'] ?? '')) ?: $tournament->title;
        $description = trim((string) ($tournament->rules['description_en'] ?? $tournament->rules['description'] ?? ''));
        $imageUrl = $this->publicImageUrl($tournament->rules['cover_image'] ?? null) ?: $this->frontendUrl('/hero-tournament.png');
        $liveUrl = trim((string) ($tournament->rules['live_url'] ?? ''));

        $this->send('tournament_registrations', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => $event === 'updated' ? 'Tournament Updated' : 'New Tournament Scheduled',
                'description' => "**{$title}**\n".($description ?: 'Registrations are open on Astral4Gamer. Get ready and compete for the prize.'),
                'url' => $detailUrl,
                'color' => $this->color(),
                'image' => ['url' => $imageUrl],
                'fields' => array_values(array_filter([
                    ['name' => 'Game', 'value' => (string) $game, 'inline' => true],
                    ['name' => 'Mode', 'value' => (string) $tournament->mode, 'inline' => true],
                    ['name' => 'Format', 'value' => $teamType, 'inline' => true],
                    ['name' => 'Status', 'value' => $status, 'inline' => true],
                    ['name' => 'Starts', 'value' => $startsAt, 'inline' => true],
                    ['name' => 'Prize', 'value' => $this->money($tournament->prize_pool, (string) $rewardUnit), 'inline' => true],
                    $participants ? ['name' => 'Slots', 'value' => (string) $participants, 'inline' => true] : null,
                    $region ? ['name' => 'Region', 'value' => (string) $region, 'inline' => true] : null,
                    $platform ? ['name' => 'Platform', 'value' => (string) $platform, 'inline' => true] : null,
                    $tournament->room_id ? ['name' => 'Room ID', 'value' => (string) $tournament->room_id, 'inline' => true] : null,
                ])),
                'footer' => ['text' => 'ASTRAL4GAMER - PLAY - COMPETE - WIN'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => array_values(array_filter([
                    [
                        'type' => 2,
                        'style' => 5,
                        'label' => 'Register',
                        'url' => $registrationUrl,
                    ],
                    [
                        'type' => 2,
                        'style' => 5,
                        'label' => 'Details',
                        'url' => $detailUrl,
                    ],
                    $liveUrl ? [
                        'type' => 2,
                        'style' => 5,
                        'label' => 'Watch Live',
                        'url' => $liveUrl,
                    ] : null,
                ])),
            ]],
        ]);
    }

    public function tournamentRegistration(Tournament $tournament, TournamentTeam $team, ?User $user = null): void
    {
        $detailUrl = $this->tournamentUrl($tournament);
        $imageUrl = $this->publicImageUrl($tournament->rules['cover_image'] ?? null) ?: $this->frontendUrl('/hero-tournament.png');
        $game = (string) ($tournament->rules['game'] ?? 'Astral4Gamer');
        $title = trim((string) ($tournament->rules['title_en'] ?? '')) ?: $tournament->title;
        $isSolo = $this->isSoloTournament($tournament);
        $name = $isSolo ? (string) ($user?->name ?: $team->name) : $team->name;
        $message = $isSolo
            ? "**{$name}** ({$game}) just registered for **{$title}**. Good luck."
            : "Team **{$team->name}** ({$game}) just registered for **{$title}**. Good luck to the squad.";

        $this->send('tournaments', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'New Tournament Registration',
                'description' => $message,
                'url' => $detailUrl,
                'color' => 0x22C55E,
                'image' => ['url' => $imageUrl],
                'fields' => array_values(array_filter([
                    ['name' => 'Game', 'value' => $game, 'inline' => true],
                    ['name' => 'Format', 'value' => $this->teamType($tournament), 'inline' => true],
                    ['name' => $isSolo ? 'Player' : 'Team', 'value' => $name, 'inline' => true],
                    ['name' => 'Status', 'value' => 'Registration received', 'inline' => true],
                ])),
                'footer' => ['text' => 'ASTRAL4GAMER - Tournament Registrations'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => [[
                    'type' => 2,
                    'style' => 5,
                    'label' => 'View Tournament',
                    'url' => $detailUrl,
                ]],
            ]],
        ]);
    }

    public function tournamentCompleted(Tournament $tournament, ?TournamentTeam $winner = null): void
    {
        $detailUrl = $this->tournamentUrl($tournament);
        $rules = $tournament->rules ?? [];
        $imageUrl = $this->publicImageUrl($rules['cover_image'] ?? null) ?: $this->frontendUrl('/hero-tournament.png');
        $winnerName = (string) ($winner?->name ?: ($rules['winner_name'] ?? 'Gagnant à confirmer'));
        $game = (string) ($rules['game'] ?? 'Astral4Gamer');
        $title = trim((string) ($rules['title_en'] ?? '')) ?: $tournament->title;
        $rewardUnit = (string) ($rules['reward_unit'] ?? 'FCFA');
        $reward = $this->money($tournament->prize_pool, $rewardUnit);

        $this->send('tournaments', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Tournament Result',
                'description' => "The tournament **{$title}** is completed.\nCongratulations to **{$winnerName}** for the win.",
                'url' => $detailUrl,
                'color' => 0xF59E0B,
                'image' => ['url' => $imageUrl],
                'fields' => [
                    ['name' => 'Game', 'value' => $game, 'inline' => true],
                    ['name' => 'Format', 'value' => $this->teamType($tournament), 'inline' => true],
                    ['name' => 'Winner', 'value' => $winnerName, 'inline' => true],
                    ['name' => 'Prize', 'value' => $reward, 'inline' => true],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Official Results'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => [[
                    'type' => 2,
                    'style' => 5,
                    'label' => 'View Details',
                    'url' => $detailUrl,
                ]],
            ]],
        ]);
    }

    public function tournamentRewardClaimed(Tournament $tournament, ?TournamentTeam $winner = null, mixed $amount = null, ?string $unit = null): void
    {
        $detailUrl = $this->tournamentUrl($tournament);
        $rules = $tournament->rules ?? [];
        $imageUrl = $this->publicImageUrl($rules['cover_image'] ?? null) ?: $this->frontendUrl('/hero-tournament.png');
        $winnerName = (string) ($winner?->name ?: ($rules['winner_name'] ?? 'Gagnant'));
        $reward = $this->money($amount ?? $tournament->prize_pool, $unit ?? (string) ($rules['reward_unit'] ?? 'FCFA'));
        $title = trim((string) ($rules['title_en'] ?? '')) ?: $tournament->title;
        $subject = $this->isSoloTournament($tournament) ? "Player **{$winnerName}**" : "Team **{$winnerName}**";

        $this->send('tournaments', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Tournament Prize Claimed',
                'description' => "{$subject} just claimed the prize for **{$title}**.\nRewards have been sent by the Astral4Gamer administration.",
                'url' => $detailUrl,
                'color' => 0x0EA5E9,
                'image' => ['url' => $imageUrl],
                'fields' => [
                    ['name' => 'Winner', 'value' => $winnerName, 'inline' => true],
                    ['name' => 'Prize Sent', 'value' => $reward, 'inline' => true],
                    ['name' => 'Status', 'value' => 'Reward sent', 'inline' => true],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Claim Approved'],
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
                'image' => ($imageUrl = $this->publicImageUrl($stream->thumbnail_url)) ? ['url' => $imageUrl] : null,
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
        $imageUrl = $this->productImageUrl($items->first()) ?: $this->frontendUrl('/freefire-media/diamond-removebg-preview.png');

        $this->send('promotions', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'Promotions boutique du jour',
                'description' => "Deux offres Astral4Gamer sont en promotion aujourd'hui.\n{$lines}",
                'url' => $this->frontendUrl('/category/top-up'),
                'color' => 0xF97316,
                'image' => ['url' => $imageUrl],
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
                'image' => ['url' => $this->frontendUrl('/hero-tournament.png')],
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
                'title' => 'Nouvelle recharge manuelle à traiter',
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
        $productName = $product?->name ?? 'Recharge manuelle';
        $isDelivered = $status === 'delivered';

        $this->send('community', [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => $isDelivered ? 'Recharge livrée' : 'Recharge en échec',
                'description' => $isDelivered
                    ? "La recharge de **{$productName}** a été un grand succès."
                    : "La recharge de **{$productName}** a été un echec.",
                'color' => $isDelivered ? 0x22C55E : 0xEF4444,
                'fields' => [
                    ['name' => 'Commande', 'value' => '#'.$order->id, 'inline' => true],
                    ['name' => 'Statut', 'value' => $isDelivered ? 'Livrée' : 'Echec', 'inline' => true],
                    ['name' => 'Jeu', 'value' => $product?->game ?? 'Astral4Gamer', 'inline' => true],
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

    public function resellerApiBlocked(ResellerPartner $partner, string $message, string $supportUrl): void
    {
        $payload = [
            'username' => config('services.discord.username', 'Astral4Gamer'),
            'avatar_url' => config('services.discord.avatar_url'),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => 'API partenaire bloquée',
                'description' => $message."\n\nL’accès API et le panel partenaire sont suspendus. Contactez le support Astral4Gamer via Discord pour vérification.",
                'color' => 0xEF233C,
                'fields' => [
                    ['name' => 'Partenaire', 'value' => (string) ($partner->company_name ?: $partner->name), 'inline' => true],
                    ['name' => 'Email', 'value' => (string) $partner->email, 'inline' => true],
                    ['name' => 'Statut API', 'value' => (string) ($partner->api_status ?? 'suspended'), 'inline' => true],
                ],
                'footer' => ['text' => 'ASTRAL4GAMER - Sécurité API privée'],
                'timestamp' => now()->toIso8601String(),
            ]],
            'components' => [[
                'type' => 1,
                'components' => [[
                    'type' => 2,
                    'style' => 5,
                    'label' => 'Contacter le support',
                    'url' => $supportUrl,
                ]],
            ]],
        ];

        if ($discordUserId = $this->partnerDiscordUserId($partner)) {
            $this->sendDirectMessage($discordUserId, $payload);
        }

        $this->send('partners', $payload);
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

        $payload = $this->englishPayload($payload);

        $webhookUrl = (string) config("services.discord.webhooks.{$webhookKey}", '');
        if ($webhookUrl === '') {
            $this->sendToChannel($webhookKey, $payload);
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

    private function sendToChannel(string $channelKey, array $payload): void
    {
        $channelId = (string) config("services.discord.channels.{$channelKey}", '');
        $botToken = (string) config('services.discord.bot_token', '');

        if ($channelId === '' || $botToken === '') {
            return;
        }

        try {
            $messagePayload = $payload;
            unset($messagePayload['username'], $messagePayload['avatar_url']);
            $authorization = str_starts_with($botToken, 'Bot ') ? $botToken : 'Bot '.$botToken;

            $response = Http::timeout((int) config('services.discord.timeout', 8))
                ->withHeaders(['Authorization' => $authorization])
                ->asJson()
                ->post("https://discord.com/api/v10/channels/{$channelId}/messages", $this->cleanPayload($messagePayload));

            if ($response->failed()) {
                Log::warning('Discord channel message failed.', [
                    'channel' => $channelKey,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (Throwable $exception) {
            Log::warning('Discord channel message exception.', [
                'channel' => $channelKey,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    private function sendDirectMessage(string $discordUserId, array $payload): void
    {
        $botToken = (string) config('services.discord.bot_token', '');

        if ($botToken === '') {
            return;
        }

        try {
            $authorization = str_starts_with($botToken, 'Bot ') ? $botToken : 'Bot '.$botToken;
            $dmResponse = Http::timeout((int) config('services.discord.timeout', 8))
                ->withHeaders(['Authorization' => $authorization])
                ->asJson()
                ->post('https://discord.com/api/v10/users/@me/channels', ['recipient_id' => $discordUserId]);

            if ($dmResponse->failed()) {
                Log::warning('Discord DM channel creation failed.', [
                    'user_id' => $discordUserId,
                    'status' => $dmResponse->status(),
                    'body' => $dmResponse->body(),
                ]);
                return;
            }

            $channelId = (string) data_get($dmResponse->json(), 'id');
            if ($channelId === '') {
                return;
            }

            $messagePayload = $payload;
            unset($messagePayload['username'], $messagePayload['avatar_url']);

            $messageResponse = Http::timeout((int) config('services.discord.timeout', 8))
                ->withHeaders(['Authorization' => $authorization])
                ->asJson()
                ->post("https://discord.com/api/v10/channels/{$channelId}/messages", $this->cleanPayload($messagePayload));

            if ($messageResponse->failed()) {
                Log::warning('Discord DM message failed.', [
                    'user_id' => $discordUserId,
                    'status' => $messageResponse->status(),
                    'body' => $messageResponse->body(),
                ]);
            }
        } catch (Throwable $exception) {
            Log::warning('Discord DM exception.', [
                'user_id' => $discordUserId,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    private function partnerDiscordUserId(ResellerPartner $partner): ?string
    {
        $candidates = [
            $partner->metadata['discord_user_id'] ?? null,
            $partner->metadata['discord_id'] ?? null,
            $partner->discord,
        ];

        foreach ($candidates as $candidate) {
            if (! is_string($candidate) && ! is_numeric($candidate)) {
                continue;
            }

            if (preg_match('/\d{15,25}/', (string) $candidate, $matches)) {
                return $matches[0];
            }
        }

        return null;
    }

    private function cleanPayload(array $payload): array
    {
        $cleaned = [];

        foreach ($payload as $key => $value) {
            if ($value === null) {
                continue;
            }

            if (is_array($value)) {
                if ($key === 'parse') {
                    $cleaned[$key] = $value;
                    continue;
                }

                $value = $this->cleanPayload($value);

                if ($value === []) {
                    continue;
                }
            }

            $cleaned[$key] = $value;
        }

        return $cleaned;
    }

    private function englishPayload(mixed $value): mixed
    {
        if (is_array($value)) {
            return collect($value)
                ->map(fn ($item) => $this->englishPayload($item))
                ->all();
        }

        if (! is_string($value)) {
            return $value;
        }

        return $this->englishText($value);
    }

    private function englishText(string $value): string
    {
        return strtr($value, [
            'Nouvel article Astral4Gamer' => 'New Astral4Gamer Article',
            'Un nouvel article est disponible sur le blog Astral4Gamer.' => 'A new article is available on the Astral4Gamer blog.',
            'Publié' => 'Published',
            'ASTRAL4GAMER - Annonces' => 'ASTRAL4GAMER - Announcements',
            'Lire l article' => 'Read Article',
            'Tournoi mis à jour' => 'Tournament Updated',
            'Nouveau tournoi programmé' => 'New Tournament Scheduled',
            'Les inscriptions sont ouvertes sur Astral4Gamer. Prépare-toi et viens tenter ta chance.' => 'Registrations are open on Astral4Gamer. Get ready and compete.',
            'Jeu' => 'Game',
            'Statut' => 'Status',
            'Début' => 'Start',
            'Debut' => 'Start',
            'À gagner' => 'Prize',
            'Région' => 'Region',
            'Plateforme' => 'Platform',
            'Inscription' => 'Register',
            'Détails' => 'Details',
            'Nouvelle inscription tournoi' => 'New Tournament Registration',
            'Joueur' => 'Player',
            'Équipe' => 'Team',
            'Inscription reçue' => 'Registration Received',
            'ASTRAL4GAMER - Inscriptions tournoi' => 'ASTRAL4GAMER - Tournament Registrations',
            'Voir le tournoi' => 'View Tournament',
            'Résultat tournoi' => 'Tournament Result',
            'est terminé.' => 'is completed.',
            'Félicitations à' => 'Congratulations to',
            'pour la victoire.' => 'for the win.',
            'Gagnant' => 'Winner',
            'Gain' => 'Reward',
            'ASTRAL4GAMER - Résultats officiels' => 'ASTRAL4GAMER - Official Results',
            'Voir les détails' => 'View Details',
            'Gain tournoi réclamé' => 'Tournament Reward Claimed',
            'vient de réclamer ses gains pour' => 'just claimed their rewards for',
            'Les récompenses ont été envoyées par l\'administration Astral4Gamer.' => 'The rewards were sent by Astral4Gamer administration.',
            'Gain envoyé' => 'Reward Sent',
            'Récompense envoyée' => 'Reward Sent',
            'ASTRAL4GAMER - Réclamation validée' => 'ASTRAL4GAMER - Claim Approved',
            'Nouvelle video disponible' => 'New Video Available',
            'Live en cours' => 'Live Now',
            'Evenement live programme' => 'Live Event Scheduled',
            'Le live est en cours. Rejoins la diffusion et suis l\'action maintenant.' => 'The live is on. Join the stream and follow the action now.',
            'Un live est programme sur Astral4Gamer. Ajoute-le a ton calendrier et prepare-toi.' => 'A live session is scheduled on Astral4Gamer. Add it to your calendar and get ready.',
            'Live maintenant' => 'Live Now',
            'Disponible' => 'Available',
            'Tournoi lie' => 'Linked Tournament',
            'ASTRAL4GAMER - Streams officiels' => 'ASTRAL4GAMER - Official Streams',
            'Voir la video' => 'Watch Video',
            'Suivre le live' => 'Watch Live',
            'Aller voir' => 'Open',
            'Ouvrir Astral4Gamer' => 'Open Astral4Gamer',
            'Promotions boutique du jour' => 'Daily Store Promotions',
            'Deux offres Astral4Gamer sont en promotion aujourd\'hui.' => 'Two Astral4Gamer offers are on promotion today.',
            'avec' => 'with',
            'pendant 24h' => 'for 24h',
            'Reduction' => 'Discount',
            'Duree' => 'Duration',
            'Fin' => 'Ends',
            'Dans 24h' => 'In 24h',
            'ASTRAL4GAMER - Offres boutique' => 'ASTRAL4GAMER - Store Offers',
            'Voir les promotions' => 'View Promotions',
            'Calendrier giveaways Astral4Gamer' => 'Astral4Gamer Giveaway Calendar',
            'Le calendrier des giveaways arrive bientot.' => 'The giveaway calendar is coming soon.',
            'ASTRAL4GAMER - Evenements communautaires' => 'ASTRAL4GAMER - Community Events',
            'Voir les evenements' => 'View Events',
            'Demande support commande' => 'Order Support Request',
            'demande une aide privee concernant une commande.' => 'requests private help about an order.',
            'Commande' => 'Order',
            'Statut commande' => 'Order Status',
            'Montant' => 'Amount',
            'Non verifie' => 'Not verified',
            'Non renseigne' => 'Not provided',
            'ASTRAL4GAMER - Support prive' => 'ASTRAL4GAMER - Private Support',
            'Nouvelle recharge manuelle CODM à traiter' => 'New Manual CODM Top-Up To Process',
            'a été payée et doit être traitée manuellement.' => 'was paid and must be processed manually.',
            'Produit' => 'Product',
            'Produit inconnu' => 'Unknown product',
            'Client Astral4Gamer' => 'Astral4Gamer Customer',
            'Email paiement' => 'Payment Email',
            'Telephone' => 'Phone',
            'Reference commande' => 'Order Reference',
            'ASTRAL4GAMER - Fulfillment manuel' => 'ASTRAL4GAMER - Manual Fulfillment',
            'Recharge Call of Duty Mobile livrée' => 'Call of Duty Mobile Top-Up Delivered',
            'Recharge Call of Duty Mobile en échec' => 'Call of Duty Mobile Top-Up Failed',
            'La recharge de' => 'The top-up for',
            'a été un grand succès.' => 'was successful.',
            'a été un echec.' => 'failed.',
            'Livrée' => 'Delivered',
            'Echec' => 'Failed',
            'ASTRAL4GAMER - Communaute CODM' => 'ASTRAL4GAMER - CODM Community',
            'Profil partage dans la communaute' => 'Profile Shared In The Community',
            'partage son profil Astral4Gamer.' => 'shared their Astral4Gamer profile.',
            'Rang' => 'Rank',
            'ASTRAL4GAMER - Communaute' => 'ASTRAL4GAMER - Community',
            'Voir le profil' => 'View Profile',
            'Recherche team' => 'Team Search',
            'cherche une team.' => 'is looking for a team.',
            'Role recherche' => 'Wanted Role',
            'Via Astral4Gamer' => 'Through Astral4Gamer',
            'ASTRAL4GAMER - Recherche team' => 'ASTRAL4GAMER - Team Search',
            'partage un clip/replay.' => 'shared a clip/replay.',
            'Live passe / replay' => 'Past live / replay',
            'ASTRAL4GAMER - Clips communaute' => 'ASTRAL4GAMER - Community Clips',
            'Nouvelle demande de partenariat' => 'New Partnership Request',
            'a soumis un dossier partenaire depuis Astral4Gamer.' => 'submitted a partner file from Astral4Gamer.',
            'Référence' => 'Reference',
            'Gain estimé' => 'Estimated Earnings',
            'Pays' => 'Country',
            'Lien' => 'Link',
            'En attente d’analyse du dossier' => 'Waiting for file review',
            'ASTRAL4GAMER - Dossier partenariat privé' => 'ASTRAL4GAMER - Private Partnership File',
            'Partenaire reseller activé' => 'Reseller Partner Activated',
            'peut maintenant utiliser l’API Astral4Gamer Reseller.' => 'can now use the Astral4Gamer Reseller API.',
            'Marge Astral' => 'Astral Margin',
            'Recharge reseller confirmée' => 'Reseller Top-Up Confirmed',
            'Mouvement wallet reseller' => 'Reseller Wallet Movement',
            'a un mouvement de solde reseller.' => 'has a reseller balance movement.',
            'Solde actuel' => 'Current Balance',
            'Alerte solde reseller faible' => 'Low Reseller Balance Alert',
            'est sous le seuil minimum.' => 'is below the minimum threshold.',
            'Solde' => 'Balance',
            'Seuil' => 'Threshold',
            'Action' => 'Action',
            'Notifier le partenaire ou attendre sa recharge Moneroo.' => 'Notify the partner or wait for their Moneroo top-up.',
        ]);
    }

    private function frontendUrl(string $path): string
    {
        return rtrim((string) config('services.google.frontend_url'), '/').$path;
    }

    private function productImageUrl(?Product $product): ?string
    {
        if (! $product) {
            return null;
        }

        return $this->publicImageUrl(
            $product->metadata['image_url']
            ?? $product->metadata['raw']['image']
            ?? $product->metadata['image']
            ?? $product->metadata['thumbnail_url']
            ?? $product->metadata['cover_image_url']
            ?? null
        );
    }

    private function publicImageUrl(mixed $value): ?string
    {
        if (is_array($value)) {
            foreach (['cover_image_url', 'cover_image', 'image_url', 'image', 'thumbnail_url', 'thumbnail', 'url', 'src'] as $key) {
                $url = $this->publicImageUrl($value[$key] ?? null);
                if ($url) {
                    return $url;
                }
            }

            foreach ($value as $item) {
                $url = $this->publicImageUrl($item);
                if ($url) {
                    return $url;
                }
            }

            return null;
        }

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $url = trim($value);
        if (str_starts_with($url, 'data:')) {
            return null;
        }

        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }

        if (str_starts_with($url, '/')) {
            return $this->frontendUrl($url);
        }

        if (preg_match('#^(storage|uploads|images|img|media|assets|blog-assets|freefire-media)/#i', $url) === 1) {
            return $this->frontendUrl('/'.$url);
        }

        return null;
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
            'scheduled' => 'Scheduled',
            'open' => 'Registrations Open',
            'live' => 'Live',
            'completed' => 'Completed',
            default => $status !== '' ? ucfirst(str_replace('_', ' ', $status)) : 'To be confirmed',
        };
    }

    private function money(mixed $amount, string $unit): string
    {
        if (! is_numeric($amount)) {
            return 'To be confirmed';
        }

        $decimals = in_array(strtoupper($unit), ['USD', 'EUR'], true) ? 2 : 0;

        return trim(number_format((float) $amount, $decimals, ',', ' ').' '.$unit);
    }

    private function color(): int
    {
        return 0xEF233C;
    }
}
