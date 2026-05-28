<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TournamentTeam extends Model
{
    protected $fillable = ['tournament_id', 'guild_id', 'name', 'captain_user_id', 'status', 'points', 'kills'];

    public function rounds(): HasMany
    {
        return $this->hasMany(TournamentRoundResult::class);
    }
}
