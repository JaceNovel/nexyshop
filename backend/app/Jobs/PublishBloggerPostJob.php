<?php

namespace App\Jobs;

use App\Models\BlogPost;
use App\Services\BloggerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PublishBloggerPostJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public function __construct(private readonly int $blogPostId)
    {
    }

    public function handle(BloggerService $blogger): void
    {
        $post = BlogPost::findOrFail($this->blogPostId);

        try {
            $payload = $post->blogger_post_id
                ? $blogger->updatePost($post->blogger_post_id, $post->title, $post->content_html, config('services.blogger.labels'))
                : $blogger->createPost($post->title, $post->content_html, config('services.blogger.labels'), false);

            $post->update([
                'blogger_post_id' => $payload['id'] ?? $post->blogger_post_id,
                'blogger_url' => $payload['url'] ?? $post->blogger_url,
                'status' => 'published',
                'published_at' => now(),
            ]);
        } catch (\Throwable $exception) {
            $post->update(['status' => 'failed']);
            Log::error('Blogger publication failed', ['post_id' => $post->id, 'message' => $exception->getMessage()]);
            throw $exception;
        }
    }
}
