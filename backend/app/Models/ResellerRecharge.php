<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResellerRecharge extends Model
{
    protected $fillable = [
        'reseller_partner_id',
        'reseller_wallet_id',
        'payment_id',
        'reference',
        'recharge_type',
        'amount',
        'fee',
        'total_to_pay',
        'credited_amount',
        'currency',
        'status',
        'is_express',
        'paid_at',
        'credited_at',
        'due_credit_at',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'float',
        'fee' => 'float',
        'total_to_pay' => 'float',
        'credited_amount' => 'float',
        'is_express' => 'boolean',
        'paid_at' => 'datetime',
        'credited_at' => 'datetime',
        'due_credit_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(ResellerPartner::class, 'reseller_partner_id');
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(ResellerWallet::class, 'reseller_wallet_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }
}
