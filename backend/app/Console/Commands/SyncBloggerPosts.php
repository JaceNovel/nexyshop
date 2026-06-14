<?php

namespace App\Console\Commands;

use App\Jobs\PublishBloggerPostJob;
use App\Models\BlogPost;
use Illuminate\Console\Command;

class SyncBloggerPosts extends Command
{
    protected $signature = 'nexy:sync-blogger-posts {--limit=100 : Number of posts to queue} {--dry-run : Show posts without queueing}';

    protected $description = 'Publish or update local published blog posts on Blogger.';

    public function handle(): int
    {
        if (! filled(config('services.blogger.blog_id'))) {
            $this->error('BLOGGER_BLOG_ID is not configured.');

            return self::FAILURE;
        }

        $posts = BlogPost::query()
            ->where('status', 'published')
            ->latest('published_at')
            ->limit((int) $this->option('limit'))
            ->get();

        if ($posts->isEmpty()) {
            $this->info('No published local blog posts found.');

            return self::SUCCESS;
        }

        foreach ($posts as $post) {
            $line = "#{$post->id} {$post->title}";

            if ($this->option('dry-run')) {
                $this->line('Would sync '.$line);
                continue;
            }

            PublishBloggerPostJob::dispatch($post->id);
            $this->line('Queued '.$line);
        }

        $this->info(($this->option('dry-run') ? 'Checked' : 'Queued').' '.$posts->count().' Blogger posts.');

        return self::SUCCESS;
    }
}
