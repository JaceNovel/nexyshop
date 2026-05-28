<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Mission extends Model
{
    protected $fillable = ['title', 'type', 'reward_type', 'reward_amount', 'cooldown_minutes', 'active'];
    protected $casts = ['active' => 'boolean'];
}
