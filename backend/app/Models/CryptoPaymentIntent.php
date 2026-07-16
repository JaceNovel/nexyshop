<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CryptoPaymentIntent extends Model
{
    protected $fillable = [
        'user_id',
        'reseller_partner_id',
        'order_id',
        'payment_id',
        'purpose',
        'reference',
        'fiat_amount',
        'fiat_currency',
        'crypto_currency',
        'network',
        'expected_crypto_amount',
        'received_crypto_amount',
        'deposit_address',
        'deposit_memo',
        'status',
        'expires_at',
        'paid_at',
        'metadata',
    ];

    protected $casts = [
        'fiat_amount' => 'float',
        'expected_crypto_amount' => 'float',
        'received_crypto_amount' => 'float',
        'expires_at' => 'datetime',
        'paid_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(ResellerPartner::class, 'reseller_partner_id');
    }
}