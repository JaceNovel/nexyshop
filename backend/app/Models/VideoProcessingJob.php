<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VideoProcessingJob extends Model
{
    protected $fillable = [
        'highlight_id', 'replay_moment_id', 'status', 'source_url', 'output_path', 'start_seconds',
        'duration_seconds', 'error_message', 'started_at', 'finished_at', 'metadata',
    ];

    protected $casts = ['started_at' => 'datetime', 'finished_at' => 'datetime', 'metadata' => 'array'];
}
