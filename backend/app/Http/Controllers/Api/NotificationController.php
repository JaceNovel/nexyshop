<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\Replay;
use App\Models\Stream;
use App\Models\Tournament;
use App\Models\UserNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class NotificationController extends Controller
{
    public function feed()
    {
        $items = collect()
            ->merge($this->officialNotifications())
            ->merge($this->upcomingTournaments())
            ->merge($this->latestBlogPosts())
            ->merge($this->streamItems())
            ->sortByDesc('sort_at')
            ->take(12)
            ->values()
            ->map(fn (array $item) => collect($item)->except('sort_at')->all())
            ->all();

        return response()->json([
            'unread_count' => count($items),
            'items' => $items,
        ]);
    }

    private function officialNotifications(): array
    {
        return UserNotification::query()
            ->whereNull('user_id')
            ->where('channel', 'bell')
            ->latest()
            ->take(8)
            ->get()
            ->map(fn (UserNotification $notification) => [
                'id' => 'notification-'.$notification->id,
                'type' => $notification->type,
                'title' => $notification->title,
                'description' => $notification->body,
                'href' => $notification->url,
                'date' => optional($notification->created_at)->toIso8601String(),
                'sort_at' => optional($notification->created_at)->toIso8601String(),
            ])
            ->all();
    }

    private function upcomingTournaments(): array
    {
        return Tournament::query()
            ->whereIn('status', ['scheduled', 'pending_validation'])
            ->where('starts_at', '>=', now()->subDay())
            ->orderBy('starts_at')
            ->take(4)
            ->get()
            ->map(fn (Tournament $tournament) => [
                'id' => 'tournament-'.$tournament->id,
                'type' => 'tournament',
                'title' => $tournament->title,
                'description' => 'Tournoi '.$tournament->mode.' - '.$this->humanDate($tournament->starts_at),
                'href' => '/tournois',
                'date' => optional($tournament->starts_at)->toIso8601String(),
                'sort_at' => optional($tournament->starts_at)->toIso8601String(),
            ])
            ->all();
    }

    private function latestBlogPosts(): array
    {
        return BlogPost::query()
            ->where('status', 'published')
            ->latest('published_at')
            ->take(4)
            ->get()
            ->map(fn (BlogPost $post) => [
                'id' => 'blog-'.$post->id,
                'type' => Str::contains(Str::lower($post->title), ['annonce', 'jeux a venir', 'jeux à venir']) ? 'announcement' : 'blog',
                'title' => $post->title,
                'description' => Str::limit(strip_tags((string) ($post->excerpt ?? $post->content_html)), 110),
                'href' => '/blog/'.$post->slug,
                'date' => optional($post->published_at ?? $post->created_at)->toIso8601String(),
                'sort_at' => optional($post->published_at ?? $post->created_at)->toIso8601String(),
            ])
            ->all();
    }

    private function streamItems(): array
    {
        $streams = Stream::query()
            ->whereIn('status', ['live', 'scheduled'])
            ->latest('scheduled_at')
            ->take(2)
            ->get()
            ->map(fn (Stream $stream) => [
                'id' => 'stream-'.$stream->id,
                'type' => 'stream',
                'title' => $stream->title ?? 'Live Astral4Gamer',
                'description' => $stream->status === 'live' ? 'Le stream est en direct.' : 'Stream programme - '.$this->humanDate($stream->scheduled_at),
                'href' => '/live',
                'date' => optional($stream->scheduled_at ?? $stream->started_at)->toIso8601String(),
                'sort_at' => optional($stream->scheduled_at ?? $stream->started_at)->toIso8601String(),
            ]);

        $replays = Replay::query()
            ->latest('published_at')
            ->take(2)
            ->get()
            ->map(fn (Replay $replay) => [
                'id' => 'replay-'.$replay->id,
                'type' => 'video',
                'title' => $replay->title,
                'description' => 'Nouvelle video ou replay disponible.',
                'href' => '/replays/'.$replay->slug,
                'date' => optional($replay->published_at ?? $replay->created_at)->toIso8601String(),
                'sort_at' => optional($replay->published_at ?? $replay->created_at)->toIso8601String(),
            ]);

        return $streams->merge($replays)->all();
    }

    private function humanDate($value): string
    {
        return $value ? Carbon::parse($value)->translatedFormat('d M H:i') : 'bientot';
    }
}
