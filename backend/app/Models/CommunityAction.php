<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunityAction extends Model
{
    protected $fillable = [
        'user_id', 'type', 'target_type', 'target_id', 'youtube_video_id', 'status', 'metadata',
    ];

    protected $casts = ['metadata' => 'array'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
