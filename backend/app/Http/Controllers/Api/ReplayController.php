<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Highlight;
use App\Models\Replay;
use App\Models\Stream;
use App\Models\YoutubeVideo;
use App\Services\Video\YouTubeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Throwable;

class ReplayController extends Controller
{
    public function index(Request $request)
    {
        $query = Replay::query()
            ->with('tournament:id,title,mode,status,starts_at')
            ->withCount('moments')
            ->latest('published_at');

        if ($search = $request->query('q')) {
            $query->where(function ($builder) use ($search) {
                $builder->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        foreach (['category', 'tournament_id'] as $filter) {
            if ($value = $request->query($filter)) {
                $query->where($filter, $value);
            }
        }

        if ($team = $request->query('team')) {
            $query->whereJsonContains('teams', $team);
        }

        return response()->json($query->paginate((int) $request->query('per_page', 12)));
    }

    public function show(string $slug)
    {
        $replay = Replay::query()
            ->with([
                'tournament:id,title,mode,status,starts_at,prize_pool',
                'moments' => fn ($query) => $query->orderBy('timestamp_seconds'),
                'highlights',
            ])
            ->where('slug', $slug)
            ->firstOrFail();

        $recommended = Replay::query()
            ->whereKeyNot($replay->id)
            ->where('category', $replay->category)
            ->latest('published_at')
            ->take(6)
            ->get();

        return response()->json(['data' => $replay, 'recommended' => $recommended]);
    }

    public function highlights(Request $request)
    {
        $query = Highlight::query()
            ->with(['replay:id,title,slug,category,thumbnail_url', 'moment:id,type,timestamp_seconds'])
            ->whereIn('status', ['draft', 'processing', 'published'])
            ->latest();

        if ($type = $request->query('type')) {
            $query->whereHas('moment', fn ($builder) => $builder->where('type', $type));
        }

        if ($search = $request->query('q')) {
            $query->where(fn ($builder) => $builder->where('title', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%"));
        }

        return response()->json($query->paginate((int) $request->query('per_page', 18)));
    }

    public function recentYoutube(YouTubeService $youtube)
    {
        $videos = Cache::remember('youtube:recent-videos:public', now()->addMinutes(10), function () use ($youtube) {
            try {
                $fresh = $youtube->recentUploads(4);

                if ($fresh->isNotEmpty()) {
                    return $fresh;
                }
            } catch (Throwable) {
                // Fall back to locally synced videos below.
            }

            $synced = YoutubeVideo::query()
                ->latest('published_at')
                ->latest()
                ->take(4)
                ->get();

            if ($synced->isNotEmpty()) {
                return $synced;
            }

            return Replay::query()
                ->latest('published_at')
                ->take(4)
                ->get()
                ->map(fn (Replay $replay) => (object) [
                    'youtube_video_id' => $replay->youtube_video_id,
                    'type' => 'replay',
                    'title' => $replay->title,
                    'description' => $replay->description,
                    'thumbnail_url' => $replay->thumbnail_url,
                    'duration_seconds' => $replay->duration_seconds,
                    'views_count' => $replay->views_count,
                    'published_at' => $replay->published_at,
                    'slug' => $replay->slug,
                ]);
        });

        return response()->json([
            'data' => collect($videos)->values()->map(function ($video) {
                $videoId = $video->youtube_video_id ?? null;
                $replaySlug = $video->slug ?? ($videoId ? Replay::query()->where('youtube_video_id', $videoId)->value('slug') : null);
                $slug = $replaySlug ?? Str::slug((string) ($video->title ?? $videoId));

                return [
                    'youtube_video_id' => $videoId,
                    'title' => $video->title,
                    'description' => $video->description ?? null,
                    'thumbnail_url' => $video->thumbnail_url ?: ($videoId ? "https://img.youtube.com/vi/{$videoId}/hqdefault.jpg" : null),
                    'duration_seconds' => (int) ($video->duration_seconds ?? 0),
                    'views_count' => (int) ($video->views_count ?? 0),
                    'published_at' => optional($video->published_at)->toISOString(),
                    'watch_url' => $videoId ? "https://www.youtube.com/watch?v={$videoId}" : null,
                    'url' => $replaySlug ? "/replays/{$replaySlug}" : ($videoId ? "https://www.youtube.com/watch?v={$videoId}" : "/replays/{$slug}"),
                    'slug' => $slug,
                    'category' => $video->type ?? $video->category ?? 'replay',
                ];
            }),
        ]);
    }

    public function currentStream()
    {
        $stream = Stream::query()
            ->with('tournament:id,title,mode,status,starts_at,prize_pool')
            ->where('status', 'live')
            ->latest('started_at')
            ->first()
            ?? Stream::query()->with('tournament:id,title,mode,status,starts_at,prize_pool')->latest('scheduled_at')->first();

        return response()->json(['data' => $stream]);
    }
}
