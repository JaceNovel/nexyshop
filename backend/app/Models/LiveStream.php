<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LiveStream extends Model
{
    protected $fillable = ['title', 'youtube_video_id', 'status', 'starts_at', 'viewers', 'sponsor', 'metadata'];
    protected $casts = ['starts_at' => 'datetime', 'metadata' => 'array'];
}
