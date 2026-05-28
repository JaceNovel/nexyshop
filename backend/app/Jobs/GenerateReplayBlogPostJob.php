<?php

namespace App\Jobs;

use App\Models\Replay;
use App\Services\BloggerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateReplayBlogPostJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 2;

    public function __construct(private readonly int $replayId, private readonly ?int $createdBy = null)
    {
    }

    public function handle(BloggerService $blogger): void
    {
        $blogger->draftFromReplay(Replay::findOrFail($this->replayId), $this->createdBy);
    }
}
