<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TournamentMatch extends Model
{
    protected $fillable = ['tournament_id', 'title', 'map', 'round', 'status', 'starts_at', 'stats'];

    protected $casts = ['starts_at' => 'datetime', 'stats' => 'array'];

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }
}
