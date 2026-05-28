<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tournament extends Model
{
    protected $fillable = ['title', 'mode', 'status', 'starts_at', 'prize_pool', 'room_id', 'rules'];
    protected $casts = ['starts_at' => 'datetime', 'rules' => 'array'];

    public function teams(): HasMany
    {
        return $this->hasMany(TournamentTeam::class);
    }

    public function matches(): HasMany
    {
        return $this->hasMany(TournamentMatch::class);
    }

    public function streams(): HasMany
    {
        return $this->hasMany(Stream::class);
    }

    public function replays(): HasMany
    {
        return $this->hasMany(Replay::class);
    }
}
