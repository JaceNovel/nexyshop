<?php

namespace App\Console\Commands;

use App\Models\Stream;
use App\Models\Tournament;
use App\Services\Discord\DiscordNotificationService;
use Illuminate\Console\Command;

class SendDiscordCommunityCalendar extends Command
{
    protected $signature = 'nexy:discord-community-calendar';

    protected $description = 'Publish the weekly community calendar with tournaments, lives and giveaways.';

    public function handle(DiscordNotificationService $discord): int
    {
        $items = collect();

        Tournament::query()
            ->whereIn('status', ['scheduled', 'open', 'live'])
            ->whereNotNull('starts_at')
            ->where('starts_at', '>=', now())
            ->orderBy('starts_at')
            ->limit(3)
            ->get()
            ->each(fn (Tournament $tournament) => $items->push([
                'title' => 'Tournoi '.$tournament->title,
                'date' => $tournament->starts_at?->timezone(config('app.timezone'))->format('d/m/Y H:i'),
                'reward' => 'Gain: '.number_format((float) $tournament->prize_pool, 0, ',', ' ').' '.($tournament->rules['reward_unit'] ?? 'FCFA'),
            ]));

        Stream::query()
            ->whereIn('status', ['scheduled', 'live'])
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '>=', now()->subMinutes(30))
            ->orderBy('scheduled_at')
            ->limit(2)
            ->get()
            ->each(fn (Stream $stream) => $items->push([
                'title' => $stream->status === 'live' ? 'Live en cours: '.$stream->title : 'Live programme: '.$stream->title,
                'date' => $stream->scheduled_at?->timezone(config('app.timezone'))->format('d/m/Y H:i'),
                'reward' => 'A suivre sur Astral4Gamer',
            ]));

        $items->push([
            'title' => 'Giveaway communautaire',
            'date' => now()->next('Saturday')->setTime(20, 0)->timezone(config('app.timezone'))->format('d/m/Y H:i'),
            'reward' => 'Diamants, cartes cadeaux ou bonus boutique selon le stock disponible',
        ]);

        $discord->giveawayCalendar($items->values()->all());
        $this->info('Discord community calendar sent.');

        return self::SUCCESS;
    }
}
