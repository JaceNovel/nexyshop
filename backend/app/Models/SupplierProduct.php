<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplierProduct extends Model
{
    protected $fillable = ['supplier_id', 'product_id', 'external_sku', 'cost', 'active', 'metadata'];
    protected $casts = ['active' => 'boolean', 'metadata' => 'array'];
}
