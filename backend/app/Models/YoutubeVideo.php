<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class YoutubeVideo extends Model
{
    protected $fillable = [
        'youtube_account_id', 'youtube_video_id', 'type', 'title', 'description',
        'thumbnail_url', 'duration_seconds', 'views_count', 'published_at', 'raw_payload',
    ];

    protected $casts = ['published_at' => 'datetime', 'raw_payload' => 'array'];
}
