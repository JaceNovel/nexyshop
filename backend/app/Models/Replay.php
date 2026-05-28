<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Replay extends Model
{
    protected $fillable = [
        'stream_id', 'tournament_id', 'youtube_video_id', 'title', 'slug', 'description',
        'thumbnail_url', 'duration_seconds', 'views_count', 'category', 'published_at',
        'teams', 'hashtags', 'stats',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'teams' => 'array',
        'hashtags' => 'array',
        'stats' => 'array',
    ];

    public function stream(): BelongsTo
    {
        return $this->belongsTo(Stream::class);
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function moments(): HasMany
    {
        return $this->hasMany(ReplayMoment::class);
    }

    public function highlights(): HasMany
    {
        return $this->hasMany(Highlight::class);
    }
}
