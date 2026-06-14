<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiamondDuel extends Model
{
    protected $fillable = [
        'creator_user_id',
        'opponent_user_id',
        'winner_user_id',
        'creator_name',
        'creator_avatar',
        'creator_rank',
        'opponent_name',
        'opponent_avatar',
        'opponent_rank',
        'stake',
        'prize_pool',
        'mode',
        'map',
        'status',
        'accepted_at',
        'completed_at',
        'metadata',
    ];

    protected $casts = [
        'accepted_at' => 'datetime',
        'completed_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function scopeVisible($query)
    {
        return $query->whereIn('status', ['open', 'matched', 'active', 'completed']);
    }
}
