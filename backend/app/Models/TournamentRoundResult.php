<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TournamentRoundResult extends Model
{
    protected $fillable = ['tournament_id', 'tournament_team_id', 'round', 'placement', 'kills', 'points', 'mvp_user_id'];
}
