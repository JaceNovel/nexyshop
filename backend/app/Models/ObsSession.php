<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ObsSession extends Model
{
    protected $fillable = ['stream_id', 'status', 'is_streaming', 'is_recording', 'connected_at', 'last_seen_at', 'state'];

    protected $casts = [
        'is_streaming' => 'boolean',
        'is_recording' => 'boolean',
        'connected_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'state' => 'array',
    ];
}
