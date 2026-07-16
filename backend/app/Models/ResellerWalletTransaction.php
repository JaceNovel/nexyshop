<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResellerWalletTransaction extends Model
{
    protected $fillable = [
        'reseller_partner_id',
        'reseller_wallet_id',
        'payment_id',
        'type',
        'amount',
        'direction',
        'status',
        'description',
        'balance_after',
        'currency',
        'reference',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'float',
        'balance_after' => 'float',
        'metadata' => 'array',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(ResellerPartner::class, 'reseller_partner_id');
    }
}
