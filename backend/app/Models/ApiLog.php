<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApiLog extends Model
{
    protected $fillable = ['service', 'direction', 'endpoint', 'status_code', 'payload', 'response', 'duration_ms'];
    protected $casts = ['payload' => 'array', 'response' => 'array'];
}
