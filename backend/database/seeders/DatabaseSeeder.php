<?php

namespace Database\Seeders;

use App\Models\Guild;
use App\Models\BlogPost;
use App\Models\Highlight;
use App\Models\LiveStream;
use App\Models\Mission;
use App\Models\Product;
use App\Models\Replay;
use App\Models\ReplayMoment;
use App\Models\Stream;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\Tournament;
use App\Models\TournamentMatch;
use App\Models\TournamentRoundResult;
use App\Models\TournamentTeam;
use App\Models\YoutubeVideo;
use App\Services\TournamentScoringService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = collect([
            ['name' => 'Item4Gamer', 'slug' => 'item4gamer', 'base_url' => 'https://api.item4gamer.example', 'priority' => 1],
            ['name' => 'SEAGM', 'slug' => 'seagm', 'base_url' => 'https://api.seagm.example', 'priority' => 2],
            ['name' => 'UniPin', 'slug' => 'unipin', 'base_url' => 'https://api.unipin.example', 'priority' => 3],
        ])->map(fn ($supplier) => Supplier::create($supplier));

        $products = collect([
            ['Free Fire Diamonds', 'Free Fire', 'FF-110D', 1000],
            ['PUBG UC', 'PUBG Mobile', 'PUBG-UC-60', 1250],
            ['Mobile Legends Diamonds', 'Mobile Legends', 'ML-86D', 900],
            ['Roblox Robux', 'Roblox', 'RBX-400', 1500],
            ['Steam Gift Cards', 'Steam', 'STEAM-10', 5000],
            ['Google Play', 'Google Play', 'GP-10', 5000],
            ['PSN', 'PlayStation', 'PSN-10', 5500],
            ['Xbox', 'Xbox', 'XBOX-10', 5500],
            ['Apple Gift Cards', 'Apple', 'APPLE-10', 6000],
            ['Razer Gold', 'Razer', 'RAZER-10', 2500],
        ])->map(fn ($row) => Product::create([
            'name' => $row[0],
            'game' => $row[1],
            'sku' => $row[2],
            'price' => $row[3],
            'metadata' => ['delivery' => 'automatic', 'requires_uid' => ! str_contains($row[1], 'Steam')],
        ]));

        $products->each(function (Product $product) use ($suppliers) {
            $suppliers->each(fn (Supplier $supplier) => SupplierProduct::create([
                'supplier_id' => $supplier->id,
                'product_id' => $product->id,
                'external_sku' => $supplier->slug.'-'.$product->sku,
                'cost' => $product->price * 0.82,
            ]));
        });

        $guilds = collect(['Nexy Elite', 'Team Shadow', 'Blue Nova', 'Crimson Rush', 'Volt Hunters'])
            ->map(fn ($name) => Guild::create([
                'name' => $name,
                'slug' => Str::slug($name),
                'points' => random_int(900, 2500),
                'wins' => random_int(8, 42),
                'kills' => random_int(250, 1200),
            ]));

        $tournaments = collect([
            ['NEXY Elite Cup', 'BR Squad', 'live', now()->subHour(), 250000, 'NEXY-ELITE-442'],
            ['Shadow Clash', 'Clash Squad', 'open', now()->addHours(8), 75000, null],
            ['Guild Wars Prime', 'Guild Wars', 'scheduled', now()->addDay(), 500000, null],
        ])->map(fn ($row) => Tournament::create([
            'title' => $row[0],
            'mode' => $row[1],
            'status' => $row[2],
            'starts_at' => $row[3],
            'prize_pool' => $row[4],
            'room_id' => $row[5],
            'rules' => ['kill' => 1, 'top1' => 12, 'top2' => 9, 'top3' => 8],
        ]));

        $scoring = new TournamentScoringService();
        $tournaments->each(function (Tournament $tournament) use ($guilds, $scoring) {
            $guilds->each(function (Guild $guild, int $index) use ($tournament, $scoring) {
                $team = TournamentTeam::create([
                    'tournament_id' => $tournament->id,
                    'guild_id' => $guild->id,
                    'name' => $guild->name,
                    'status' => 'validated',
                ]);
                for ($round = 1; $round <= 3; $round++) {
                    $placement = $index + 1;
                    $kills = random_int(2, 18);
                    TournamentRoundResult::create([
                        'tournament_id' => $tournament->id,
                        'tournament_team_id' => $team->id,
                        'round' => $round,
                        'placement' => $placement,
                        'kills' => $kills,
                        'points' => $scoring->points($placement, $kills),
                    ]);
                }
                $team->update(['points' => $team->rounds()->sum('points'), 'kills' => $team->rounds()->sum('kills')]);
            });
        });

        collect([
            ['Regarder le live', 'watch_live', 'points', 50, 60],
            ['Inviter un ami', 'invite_friend', 'ticket', 1, 1440],
            ['Acheter diamants', 'buy_diamonds', 'cashback', 5, 1440],
            ['Participer tournoi', 'join_tournament', 'points', 120, 720],
            ['Partager TikTok', 'share_tiktok', 'coupon', 10, 1440],
            ['Rejoindre Discord', 'join_discord', 'badge', 1, 10080],
        ])->each(fn ($row) => Mission::create([
            'title' => $row[0],
            'type' => $row[1],
            'reward_type' => $row[2],
            'reward_amount' => $row[3],
            'cooldown_minutes' => $row[4],
        ]));

        LiveStream::create([
            'title' => 'NEXY Elite Cup - Grand Final',
            'youtube_video_id' => 'live_demo',
            'status' => 'live',
            'starts_at' => now()->subMinutes(35),
            'viewers' => 18342,
            'sponsor' => 'Razer Gold',
            'metadata' => ['mvp' => 'RavenX', 'remaining_teams' => 12, 'kills_live' => 312],
        ]);

        $videoTournaments = collect([
            ['NEXY CUP Spring Finals', 'BR Squad', 'ended', now()->subDays(18), 300000, 'NEXY-SPRING'],
            ['1VS4 Showdown Masters', 'Solo clutch', 'ended', now()->subDays(14), 150000, 'NEXY-1V4'],
            ['1VS1 Arena Night', 'Duel', 'ended', now()->subDays(9), 100000, 'NEXY-1V1'],
            ['Booyah Rush League', 'Rush', 'ended', now()->subDays(6), 200000, 'NEXY-RUSH'],
            ['Sniper Challenge Pro', 'Sniper', 'ended', now()->subDays(3), 120000, 'NEXY-SNIPER'],
        ])->map(fn ($row) => Tournament::firstOrCreate(
            ['room_id' => $row[5]],
            [
                'title' => $row[0],
                'mode' => $row[1],
                'status' => $row[2],
                'starts_at' => $row[3],
                'prize_pool' => $row[4],
                'rules' => ['kill' => 1, 'top1' => 12, 'top2' => 9, 'top3' => 8],
            ]
        ));

        $videoTournaments->each(function (Tournament $tournament) {
            for ($round = 1; $round <= 3; $round++) {
                TournamentMatch::firstOrCreate(
                    ['tournament_id' => $tournament->id, 'round' => $round],
                    [
                        'title' => "Round {$round} - {$tournament->title}",
                        'map' => ['Bermuda', 'Purgatory', 'Kalahari'][$round - 1],
                        'status' => 'completed',
                        'starts_at' => $tournament->starts_at?->copy()->addMinutes(($round - 1) * 45),
                        'stats' => ['kills' => random_int(28, 74), 'teams_alive_endgame' => random_int(2, 6)],
                    ]
                );
            }
        });

        $categories = ['NEXY CUP', '1VS4 Showdown', '1VS1 Arena', 'Booyah Rush', 'Sniper Challenge'];
        $teamsPool = ['TM-MAFIA', 'TEAM SHADOW', 'PRIME ELITE', 'TEAM DRAGON', 'ONLY GODS', 'BAD BOYS'];
        $momentTypes = ['kill', '1v4', 'booyah', 'mvp', 'funny', 'clutch'];
        $youtubeIds = ['M7lc1UVf-VE', 'dQw4w9WgXcQ', 'ysz5S6PUM-U', 'ScMzIvxBSi4', 'aqz-KE-bpKQ'];
        $createdMoments = collect();

        for ($index = 1; $index <= 10; $index++) {
            $tournament = $videoTournaments[($index - 1) % $videoTournaments->count()];
            $category = $categories[($index - 1) % count($categories)];
            $videoId = $youtubeIds[($index - 1) % count($youtubeIds)];
            $title = "{$category} - Replay complet #{$index}";
            $slug = Str::slug($title);
            $thumbnail = "https://img.youtube.com/vi/{$videoId}/hqdefault.jpg";

            $stream = Stream::firstOrCreate(
                ['youtube_video_id' => $videoId, 'title' => $title],
                [
                    'tournament_id' => $tournament->id,
                    'youtube_live_id' => 'live-'.$index,
                    'description' => 'Replay officiel NEXY avec classement, moments forts et statistiques tournoi.',
                    'status' => 'ended',
                    'scheduled_at' => now()->subDays(20 - $index),
                    'started_at' => now()->subDays(20 - $index)->addHour(),
                    'ended_at' => now()->subDays(20 - $index)->addHours(3),
                    'embed_url' => "https://www.youtube.com/embed/{$videoId}?enablejsapi=1",
                    'watch_url' => "https://www.youtube.com/watch?v={$videoId}",
                    'thumbnail_url' => $thumbnail,
                    'viewer_count' => random_int(4200, 24000),
                    'metadata' => ['sponsor' => ['Razer Gold', 'Red Bull', 'NEXY Prime'][$index % 3]],
                ]
            );

            $replay = Replay::updateOrCreate(
                ['slug' => $slug],
                [
                    'stream_id' => $stream->id,
                    'tournament_id' => $tournament->id,
                    'youtube_video_id' => $videoId,
                    'title' => $title,
                    'description' => 'Revivez le match complet avec les rotations, les duels decisifs, le classement live et les reactions caster.',
                    'thumbnail_url' => $thumbnail,
                    'duration_seconds' => random_int(4200, 9200),
                    'views_count' => random_int(8200, 185000),
                    'category' => $category,
                    'published_at' => now()->subDays(12 - $index),
                    'teams' => collect($teamsPool)->shuffle()->take(4)->values()->all(),
                    'hashtags' => ['NEXY', 'FreeFire', Str::slug($category, '')],
                    'stats' => [
                        'kills' => random_int(42, 96),
                        'booyah_team' => $teamsPool[$index % count($teamsPool)],
                        'mvp' => ['RavenX', 'ShadowX', 'Prime Sahel', 'Dragon Ilyas'][$index % 4],
                    ],
                ]
            );

            YoutubeVideo::updateOrCreate(
                ['youtube_video_id' => $videoId],
                [
                    'type' => 'replay',
                    'title' => $title,
                    'description' => $replay->description,
                    'thumbnail_url' => $thumbnail,
                    'duration_seconds' => $replay->duration_seconds,
                    'views_count' => $replay->views_count,
                    'published_at' => $replay->published_at,
                    'raw_payload' => ['seeded' => true],
                ]
            );

            for ($momentIndex = 1; $momentIndex <= 3; $momentIndex++) {
                $type = $momentTypes[(($index + $momentIndex) - 2) % count($momentTypes)];
                $createdMoments->push(ReplayMoment::updateOrCreate(
                    ['replay_id' => $replay->id, 'timestamp_seconds' => 240 + ($momentIndex * 520)],
                    [
                        'title' => match ($type) {
                            '1v4' => '1v4 clutch sous pression',
                            'booyah' => 'Booyah final de la map',
                            'mvp' => 'Action MVP du tournoi',
                            'funny' => 'Reaction caster memorable',
                            'kill' => 'Gros kill longue distance',
                            default => 'Clutch incroyable',
                        },
                        'description' => 'Moment fort detecte pour alimenter les clips courts et le chapitrage du replay.',
                        'type' => $type,
                        'thumbnail_url' => $thumbnail,
                        'ai_confidence' => random_int(8100, 9800) / 100,
                        'status' => $momentIndex === 1 ? 'approved' : 'pending',
                        'metadata' => ['seeded' => true],
                    ]
                ));
            }
        }

        $createdMoments->take(20)->values()->each(function (ReplayMoment $moment, int $index) {
            Highlight::updateOrCreate(
                ['moment_id' => $moment->id],
                [
                    'replay_id' => $moment->replay_id,
                    'youtube_video_id' => $index % 3 === 0 ? 'short_demo_'.$index : null,
                    'title' => $moment->title.' | NEXY Highlight',
                    'description' => trim(($moment->description ?? '')."\n\n#NEXY #Esport #Highlight"),
                    'short_url' => $index % 3 === 0 ? 'https://youtube.com/shorts/short_demo_'.$index : null,
                    'video_url' => $index % 3 === 0 ? 'https://youtube.com/watch?v=short_demo_'.$index : null,
                    'thumbnail_url' => $moment->thumbnail_url,
                    'format' => $index % 4 === 0 ? 'horizontal' : 'vertical',
                    'status' => $index % 3 === 0 ? 'published' : 'draft',
                    'views_count' => random_int(1200, 76000),
                    'hashtags' => ['NEXY', $moment->type, 'FreeFire'],
                ]
            );
        });

        $blogTitles = [
            ['NEXY CUP #12 : Team Shadow remporte la grande finale', 'tournoi'],
            ['Guide Free Fire : preparer son equipe pour un tournoi NEXY', 'seo'],
            ['Booyah Rush League : les resultats et le classement final', 'tournoi'],
            ['Replay de la semaine : les meilleurs clutchs valides par l IA', 'replay'],
            ['Annonce : prochaine saison Astral4Gamer Esport', 'annonce'],
            ['1VS4 Showdown : les moments forts a revoir', 'replay'],
            ['Comment acheter ses diamants Free Fire avant une finale', 'seo'],
            ['Sniper Challenge Pro : recap complet et MVP', 'tournoi'],
            ['Highlights NEXY : top actions de la semaine', 'replay'],
            ['Calendrier esport : les prochains rendez-vous Free Fire', 'annonce'],
        ];

        foreach ($blogTitles as $index => [$title, $kind]) {
            BlogPost::updateOrCreate(
                ['slug' => Str::slug($title)],
                [
                    'tournament_id' => $kind === 'tournoi' ? $tournaments->random()->id : null,
                    'replay_id' => $kind === 'replay' ? Replay::query()->inRandomOrder()->value('id') : null,
                    'highlight_id' => $kind === 'replay' ? Highlight::query()->inRandomOrder()->value('id') : null,
                    'title' => $title,
                    'excerpt' => 'Actualite NEXY avec resume, liens utiles et contexte esport Free Fire.',
                    'content_html' => '<h2>Introduction</h2><p>Retrouvez les informations essentielles, le contexte esport et les liens utiles pour suivre Astral4Gamer/NEXY.</p><h2>Resume</h2><p>Classement, highlights, replay et appels a participer aux prochains evenements.</p>',
                    'cover_image_url' => 'https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg',
                    'status' => $index < 7 ? 'published' : 'draft',
                    'published_at' => $index < 7 ? now()->subDays($index + 1) : null,
                ]
            );
        }
    }
}
