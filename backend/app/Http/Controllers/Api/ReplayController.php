<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Highlight;
use App\Models\Replay;
use App\Models\Stream;
use Illuminate\Http\Request;

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
