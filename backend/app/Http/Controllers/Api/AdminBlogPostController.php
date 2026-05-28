<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateReplayBlogPostJob;
use App\Jobs\GenerateTournamentBlogPostJob;
use App\Jobs\PublishBloggerPostJob;
use App\Models\BlogPost;
use App\Models\Replay;
use App\Models\Tournament;
use App\Services\BloggerService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminBlogPostController extends Controller
{
    public function index(Request $request)
    {
        return BlogPost::query()
            ->with('tournament:id,title', 'replay:id,title,slug')
            ->when($request->query('status'), fn ($query, $status) => $query->where('status', $status))
            ->latest()
            ->paginate((int) $request->query('per_page', 20));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'excerpt' => ['required', 'string'],
            'content_html' => ['required', 'string'],
            'cover_image_url' => ['nullable', 'url'],
            'status' => ['nullable', 'in:draft,scheduled,published,failed'],
            'scheduled_at' => ['nullable', 'date'],
        ]);

        return BlogPost::create([
            ...$data,
            'slug' => Str::slug($data['title']),
            'status' => $data['status'] ?? 'draft',
            'created_by' => $request->user()?->id,
        ]);
    }

    public function show(BlogPost $blogPost)
    {
        return $blogPost->load('tournament', 'replay', 'highlight');
    }

    public function update(Request $request, BlogPost $blogPost)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:180'],
            'excerpt' => ['sometimes', 'string'],
            'content_html' => ['sometimes', 'string'],
            'cover_image_url' => ['nullable', 'url'],
            'status' => ['sometimes', 'in:draft,scheduled,published,failed'],
            'scheduled_at' => ['nullable', 'date'],
        ]);

        if (isset($data['title'])) {
            $data['slug'] = Str::slug($data['title']);
        }

        $blogPost->update($data);

        return $blogPost->refresh();
    }

    public function publishToBlogger(BlogPost $blogPost)
    {
        PublishBloggerPostJob::dispatch($blogPost->id);

        return response()->json(['message' => 'Publication Blogger mise en file.', 'data' => $blogPost]);
    }

    public function generateFromTournament(Tournament $tournament, Request $request, BloggerService $blogger)
    {
        $post = $blogger->draftFromTournament($tournament, $request->user()?->id);
        GenerateTournamentBlogPostJob::dispatch($tournament->id, $request->user()?->id);

        return response()->json(['message' => 'Article tournoi genere en brouillon.', 'data' => $post]);
    }

    public function generateFromReplay(Replay $replay, Request $request, BloggerService $blogger)
    {
        $post = $blogger->draftFromReplay($replay, $request->user()?->id);
        GenerateReplayBlogPostJob::dispatch($replay->id, $request->user()?->id);

        return response()->json(['message' => 'Article replay genere en brouillon.', 'data' => $post]);
    }

    public function generateWeeklySummary(Request $request)
    {
        $title = 'Resume hebdomadaire NEXY : tournois, replays et highlights';
        $post = BlogPost::create([
            'title' => $title,
            'slug' => Str::slug($title.' '.now()->format('Y-m-d')),
            'excerpt' => 'Les resultats, replays et annonces NEXY de la semaine.',
            'content_html' => '<h2>Resume de la semaine</h2><p>Les meilleurs resultats, highlights et annonces seront enrichis par l equipe admin avant publication.</p>',
            'status' => 'draft',
            'created_by' => $request->user()?->id,
        ]);

        return response()->json(['message' => 'Resume hebdomadaire cree en brouillon.', 'data' => $post]);
    }
}
