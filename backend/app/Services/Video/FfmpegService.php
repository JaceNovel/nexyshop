<?php

namespace App\Services\Video;

use App\Models\Highlight;
use App\Models\ReplayMoment;
use App\Models\VideoProcessingJob;

class FfmpegService
{
    public function queueClip(ReplayMoment $moment, Highlight $highlight, int $before = 15, int $after = 45): VideoProcessingJob
    {
        $start = max(0, $moment->timestamp_seconds - $before);

        return VideoProcessingJob::create([
            'highlight_id' => $highlight->id,
            'replay_moment_id' => $moment->id,
            'status' => 'queued',
            'source_url' => $moment->replay?->youtube_video_id ? 'youtube:'.$moment->replay->youtube_video_id : null,
            'output_path' => 'highlights/'.$highlight->id.'.mp4',
            'start_seconds' => $start,
            'duration_seconds' => $before + $after,
            'metadata' => [
                'ffmpeg_command_template' => 'ffmpeg -ss {start} -i {source} -t {duration} -c:v libx264 -c:a aac {output}',
            ],
        ]);
    }
}
