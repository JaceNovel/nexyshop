<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResellerOrder extends Model
{
    protected $fillable = [
        'reseller_partner_id',
        'order_id',
        'product_id',
        'supplier_product_id',
        'external_reference',
        'partner_reference',
        'supplier_cost',
        'amount',
        'margin_amount',
        'currency',
        'status',
        'request_payload',
        'response_payload',
    ];

    protected $casts = [
        'supplier_cost' => 'float',
        'amount' => 'float',
        'margin_amount' => 'float',
        'request_payload' => 'array',
        'response_payload' => 'array',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(ResellerPartner::class, 'reseller_partner_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function supplierProduct(): BelongsTo
    {
        return $this->belongsTo(SupplierProduct::class);
    }
}
