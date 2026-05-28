<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Stream extends Model
{
    protected $fillable = [
        'tournament_id', 'youtube_video_id', 'youtube_live_id', 'title', 'description', 'status',
        'scheduled_at', 'started_at', 'ended_at', 'embed_url', 'watch_url', 'thumbnail_url',
        'viewer_count', 'metadata',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function replays(): HasMany
    {
        return $this->hasMany(Replay::class);
    }

    public function markers(): HasMany
    {
        return $this->hasMany(StreamMarker::class);
    }
}
