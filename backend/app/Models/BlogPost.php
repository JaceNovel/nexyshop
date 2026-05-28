<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlogPost extends Model
{
    protected $fillable = [
        'tournament_id', 'replay_id', 'highlight_id', 'title', 'slug', 'excerpt',
        'content_html', 'cover_image_url', 'status', 'blogger_post_id', 'blogger_url',
        'scheduled_at', 'published_at', 'created_by',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'published_at' => 'datetime',
    ];

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function replay(): BelongsTo
    {
        return $this->belongsTo(Replay::class);
    }

    public function highlight(): BelongsTo
    {
        return $this->belongsTo(Highlight::class);
    }
}
