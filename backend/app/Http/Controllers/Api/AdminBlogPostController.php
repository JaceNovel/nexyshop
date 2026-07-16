<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateReplayBlogPostJob;
use App\Jobs\GenerateTournamentBlogPostJob;
use App\Jobs\PublishBloggerPostJob;
use App\Models\BlogPost;
use App\Models\Replay;
use App\Models\Tournament;
use App\Services\AstralNotificationService;
use App\Services\BloggerService;
use App\Services\Discord\DiscordNotificationService;
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

    public function store(Request $request, AstralNotificationService $notifications, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'excerpt' => ['required', 'string'],
            'content_html' => ['required', 'string'],
            'cover_image_url' => ['nullable', 'url'],
            'status' => ['nullable', 'in:draft,scheduled,published,failed'],
            'scheduled_at' => ['nullable', 'date'],
        ]);

        $post = BlogPost::create([
            ...$data,
            'slug' => Str::slug($data['title']),
            'status' => $data['status'] ?? 'draft',
            'created_by' => $request->user()?->id,
        ]);

        if ($post->status === 'published') {
            $this->announcePublishedPost($post, $notifications, $discord);
            $this->publishToBloggerIfEnabled($post);
        }

        return $post;
    }

    public function show(BlogPost $blogPost)
    {
        return $blogPost->load('tournament', 'replay', 'highlight');
    }

    public function update(Request $request, BlogPost $blogPost, AstralNotificationService $notifications, DiscordNotificationService $discord)
    {
        $wasPublished = $blogPost->status === 'published';
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

        if (! $wasPublished && $blogPost->status === 'published') {
            $this->announcePublishedPost($blogPost->refresh(), $notifications, $discord);
        }

        if ($blogPost->status === 'published') {
            $this->publishToBloggerIfEnabled($blogPost->refresh());
        }

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

    private function announcePublishedPost(BlogPost $post, AstralNotificationService $notifications, DiscordNotificationService $discord): void
    {
        $notifications->broadcast([
            'channel' => 'bell',
            'type' => str_contains(Str::lower($post->title), 'annonce') ? 'announcement' : 'blog',
            'title' => $post->title,
            'body' => $post->excerpt,
            'url' => '/blog/'.$post->slug,
            'action_label' => 'Lire l article',
            'action_url' => rtrim((string) config('services.google.frontend_url'), '/').'/blog/'.$post->slug,
            'data' => ['blog_post_id' => $post->id],
        ], true);

        $discord->blogPostPublished($post);
    }

    private function publishToBloggerIfEnabled(BlogPost $post): void
    {
        if (! config('services.blogger.auto_publish') || ! filled(config('services.blogger.blog_id'))) {
            return;
        }

        PublishBloggerPostJob::dispatch($post->id);
    }
}
