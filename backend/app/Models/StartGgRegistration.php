<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StartGgRegistration extends Model
{
    protected $fillable = [
        'user_id',
        'tournament_id',
        'tournament_slug',
        'tournament_name',
        'event_id',
        'event_name',
        'team_name',
        'team_tag',
        'captain_name',
        'contact_whatsapp',
        'discord',
        'country',
        'status',
        'members',
        'metadata',
    ];

    protected $casts = [
        'members' => 'array',
        'metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}