<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ReplayMoment extends Model
{
    protected $fillable = [
        'replay_id', 'title', 'description', 'timestamp_seconds', 'type', 'thumbnail_url',
        'ai_confidence', 'status', 'metadata',
    ];

    protected $casts = ['ai_confidence' => 'float', 'metadata' => 'array'];

    public function replay(): BelongsTo
    {
        return $this->belongsTo(Replay::class);
    }

    public function highlight(): HasOne
    {
        return $this->hasOne(Highlight::class, 'moment_id');
    }
}
