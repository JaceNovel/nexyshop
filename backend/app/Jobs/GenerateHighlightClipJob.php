<?php

namespace App\Jobs;

use App\Models\Highlight;
use App\Models\ReplayMoment;
use App\Services\Video\FfmpegService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class GenerateHighlightClipJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $momentId, public int $highlightId)
    {
    }

    public function handle(FfmpegService $ffmpeg): void
    {
        $moment = ReplayMoment::findOrFail($this->momentId);
        $highlight = Highlight::findOrFail($this->highlightId);

        $ffmpeg->queueClip($moment, $highlight);
    }
}
