<?php

namespace App\Jobs;

use App\Models\AiClipJob;
use App\Models\Replay;
use App\Services\AI\ReplayHighlightService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class AnalyzeReplayJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $replayId, public int $jobId)
    {
    }

    public function handle(ReplayHighlightService $service): void
    {
        $job = AiClipJob::findOrFail($this->jobId);
        $replay = Replay::findOrFail($this->replayId);

        $job->update(['status' => 'processing', 'started_at' => now()]);
        $moments = $service->generateSuggestedMoments($replay);
        $job->update([
            'status' => 'completed',
            'detected_moments' => collect($moments)->map->only(['id', 'title', 'type', 'timestamp_seconds'])->all(),
            'finished_at' => now(),
        ]);
    }
}
