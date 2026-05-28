<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Highlight extends Model
{
    protected $fillable = [
        'replay_id', 'moment_id', 'youtube_video_id', 'title', 'description', 'short_url',
        'video_url', 'thumbnail_url', 'format', 'status', 'views_count', 'hashtags',
    ];

    protected $casts = ['hashtags' => 'array'];

    public function replay(): BelongsTo
    {
        return $this->belongsTo(Replay::class);
    }

    public function moment(): BelongsTo
    {
        return $this->belongsTo(ReplayMoment::class, 'moment_id');
    }
}
