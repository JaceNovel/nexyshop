<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $fillable = ['name', 'slug', 'base_url', 'active', 'priority', 'credentials'];
    protected $casts = ['active' => 'boolean', 'credentials' => 'encrypted:array'];

    public function products(): HasMany
    {
        return $this->hasMany(SupplierProduct::class);
    }
}
