<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Guild extends Model
{
    protected $fillable = ['name', 'slug', 'logo_url', 'leader_user_id', 'points', 'wins', 'kills', 'metadata'];
    protected $casts = ['metadata' => 'array'];
}
