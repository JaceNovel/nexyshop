<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = ['user_id', 'order_id', 'provider', 'reference', 'amount', 'currency', 'status', 'payload'];
    protected $casts = ['payload' => 'array'];
}
