<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierProduct extends Model
{
    protected $fillable = ['supplier_id', 'product_id', 'external_sku', 'cost', 'active', 'metadata'];
    protected $casts = ['active' => 'boolean', 'metadata' => 'array'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
