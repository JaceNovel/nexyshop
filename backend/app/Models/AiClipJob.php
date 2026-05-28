<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiClipJob extends Model
{
    protected $fillable = [
        'replay_id', 'status', 'provider', 'audio_path', 'transcript', 'detected_moments',
        'error_message', 'started_at', 'finished_at',
    ];

    protected $casts = ['detected_moments' => 'array', 'started_at' => 'datetime', 'finished_at' => 'datetime'];

    public function replay(): BelongsTo
    {
        return $this->belongsTo(Replay::class);
    }
}
