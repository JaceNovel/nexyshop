<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model
{
    protected $fillable = ['user_id', 'product_id', 'game_uid', 'nickname', 'amount', 'currency', 'status', 'metadata'];
    protected $casts = ['metadata' => 'array'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
