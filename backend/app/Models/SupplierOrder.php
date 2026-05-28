<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplierOrder extends Model
{
    protected $fillable = ['order_id', 'supplier_id', 'external_id', 'status', 'payload', 'response'];
    protected $casts = ['payload' => 'array', 'response' => 'array'];
}
