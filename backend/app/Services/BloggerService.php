<?php

namespace App\Services;

use App\Models\ApiLog;
use App\Models\BlogPost;
use App\Models\GoogleAccount;
use App\Models\Replay;
use App\Models\Tournament;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class BloggerService
{
    public function syncPost(BlogPost $post, bool $publish = true): array
    {
        if (! filled(config('services.blogger.blog_id'))) {
            throw new \RuntimeException('BLOGGER_BLOG_ID n est pas configure.');
        }

        $content = $this->contentForBlogger($post);
        $labels = config('services.blogger.labels');

        return $post->blogger_post_id
            ? $this->updatePost($post->blogger_post_id, $post->title, $content, $labels)
            : $this->createPost($post->title, $content, $labels, ! $publish);
    }

    public function listBlogs(GoogleAccount $account): array
    {
        $response = Http::withToken($account->access_token)->get('https://www.googleapis.com/blogger/v3/users/self/blogs');
        $this->log('users.self.blogs', $response);
        $response->throw();

        return $response->json('items', []);
    }

    public function createPost(string $title, string $contentHtml, array $labels = [], bool $isDraft = true, ?GoogleAccount $account = null): array
    {
        $account ??= $this->publisherAccount();
        $blogId = config('services.blogger.blog_id');

        $response = Http::withToken($account->access_token)->post("https://www.googleapis.com/blogger/v3/blogs/{$blogId}/posts/?isDraft=".($isDraft ? 'true' : 'false'), [
            'kind' => 'blogger#post',
            'blog' => ['id' => $blogId],
            'title' => $title,
            'content' => $contentHtml,
            'labels' => array_values($labels ?: config('services.blogger.labels')),
        ]);
        $this->log('posts.insert', $response, ['title' => $title, 'draft' => $isDraft]);
        $response->throw();

        return $response->json();
    }

    public function updatePost(string $bloggerPostId, string $title, string $contentHtml, array $labels = [], ?GoogleAccount $account = null): array
    {
        $account ??= $this->publisherAccount();
        $blogId = config('services.blogger.blog_id');

        $response = Http::withToken($account->access_token)->patch("https://www.googleapis.com/blogger/v3/blogs/{$blogId}/posts/{$bloggerPostId}", [
            'title' => $title,
            'content' => $contentHtml,
            'labels' => array_values($labels ?: config('services.blogger.labels')),
        ]);
        $this->log('posts.patch', $response, ['post_id' => $bloggerPostId]);
        $response->throw();

        return $response->json();
    }

    public function publishPost(string $bloggerPostId, ?GoogleAccount $account = null): array
    {
        $account ??= $this->publisherAccount();
        $blogId = config('services.blogger.blog_id');

        $response = Http::withToken($account->access_token)->post("https://www.googleapis.com/blogger/v3/blogs/{$blogId}/posts/{$bloggerPostId}/publish");
        $this->log('posts.publish', $response, ['post_id' => $bloggerPostId]);
        $response->throw();

        return $response->json();
    }

    public function deletePost(string $bloggerPostId, ?GoogleAccount $account = null): void
    {
        $account ??= $this->publisherAccount();
        $blogId = config('services.blogger.blog_id');
        $response = Http::withToken($account->access_token)->delete("https://www.googleapis.com/blogger/v3/blogs/{$blogId}/posts/{$bloggerPostId}");
        $this->log('posts.delete', $response, ['post_id' => $bloggerPostId]);
        $response->throw();
    }

    public function getPost(string $bloggerPostId, ?GoogleAccount $account = null): array
    {
        $account ??= $this->publisherAccount();
        $blogId = config('services.blogger.blog_id');
        $response = Http::withToken($account->access_token)->get("https://www.googleapis.com/blogger/v3/blogs/{$blogId}/posts/{$bloggerPostId}");
        $this->log('posts.get', $response, ['post_id' => $bloggerPostId]);
        $response->throw();

        return $response->json();
    }

    public function contentForBlogger(BlogPost $post): string
    {
        $frontendUrl = rtrim((string) config('services.google.frontend_url'), '/');
        $articleUrl = $frontendUrl.'/blog/'.$post->slug;
        $cover = $post->cover_image_url
            ? '<p><img src="'.e($post->cover_image_url).'" alt="" style="max-width:100%;height:auto;border-radius:12px;" /></p>'
            : '';

        return $cover
            .$post->content_html
            .'<hr />'
            .'<p><strong>Astral4Gamer</strong> - Lire l article original : <a href="'.e($articleUrl).'">'.e($articleUrl).'</a></p>';
    }

    public function draftFromTournament(Tournament $tournament, ?int $createdBy = null): BlogPost
    {
        $tournament->loadMissing(['teams' => fn ($query) => $query->orderByDesc('points')->orderByDesc('kills')]);
        $topTeams = $tournament->teams->take(3);
        $winner = $topTeams->first();
        $mvp = $tournament->teams->sortByDesc('kills')->first();
        $kills = $tournament->teams->sum('kills');
        $title = 'Resultats '.$tournament->title.' : '.($winner?->name ?? 'la meilleure team').' remporte la grande finale';

        $content = view('blog.tournament-result', [
            'tournament' => $tournament,
            'topTeams' => $topTeams,
            'winner' => $winner,
            'mvp' => $mvp,
            'kills' => $kills,
        ])->render();

        return BlogPost::query()->updateOrCreate(
            ['slug' => Str::slug($title)],
            [
                'tournament_id' => $tournament->id,
                'title' => $title,
                'excerpt' => "Classement final, MVP et meilleurs moments de {$tournament->title}.",
                'content_html' => $content,
                'status' => 'draft',
                'created_by' => $createdBy,
            ]
        );
    }

    public function draftFromReplay(Replay $replay, ?int $createdBy = null): BlogPost
    {
        $title = 'Replay NEXY : '.$replay->title;
        $content = view('blog.replay-summary', ['replay' => $replay->loadMissing('tournament', 'highlights')])->render();

        return BlogPost::query()->updateOrCreate(
            ['slug' => Str::slug($title)],
            [
                'replay_id' => $replay->id,
                'title' => $title,
                'excerpt' => $replay->description ?: 'Resume replay, highlights et liens utiles.',
                'content_html' => $content,
                'cover_image_url' => $replay->thumbnail_url,
                'status' => 'draft',
                'created_by' => $createdBy,
            ]
        );
    }

    public function publisherAccount(): GoogleAccount
    {
        $account = GoogleAccount::query()
            ->whereJsonContains('scopes', 'https://www.googleapis.com/auth/blogger')
            ->latest()
            ->first();

        if (! $account) {
            throw new \RuntimeException('Aucun compte Google avec le scope Blogger n est connecte.');
        }

        if ($account->token_expires_at?->isPast() && $account->refresh_token) {
            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'refresh_token' => $account->refresh_token,
                'grant_type' => 'refresh_token',
            ]);
            $this->log('oauth/token', $response, ['grant_type' => 'refresh_token']);
            $response->throw();

            $payload = $response->json();
            $account->update([
                'access_token' => $payload['access_token'],
                'token_expires_at' => now()->addSeconds((int) ($payload['expires_in'] ?? 3600) - 60),
            ]);
        }

        return $account;
    }

    private function log(string $endpoint, Response $response, array $payload = []): void
    {
        ApiLog::create([
            'service' => 'blogger',
            'direction' => 'out',
            'endpoint' => $endpoint,
            'status_code' => $response->status(),
            'payload' => $payload,
            'response' => $response->json() ?: ['body' => Str::limit($response->body(), 1000)],
            'duration_ms' => null,
        ]);
    }
}
