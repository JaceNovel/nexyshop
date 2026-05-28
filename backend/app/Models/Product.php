<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = ['name', 'game', 'sku', 'price', 'currency', 'active', 'metadata'];
    protected $casts = ['active' => 'boolean', 'metadata' => 'array'];

    public function supplierProducts(): HasMany
    {
        return $this->hasMany(SupplierProduct::class);
    }

    public function primarySupplierProduct()
    {
        return $this->hasOne(SupplierProduct::class)->oldestOfMany();
    }
}
