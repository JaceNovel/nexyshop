<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CryptoDeposit extends Model
{
    protected $fillable = [
        'crypto_payment_intent_id',
        'provider',
        'provider_deposit_id',
        'tx_hash',
        'currency',
        'network',
        'amount',
        'address',
        'memo',
        'status',
        'observed_at',
        'credited_at',
        'raw_payload',
    ];

    protected $casts = [
        'amount' => 'float',
        'observed_at' => 'datetime',
        'credited_at' => 'datetime',
        'raw_payload' => 'array',
    ];

    public function intent(): BelongsTo
    {
        return $this->belongsTo(CryptoPaymentIntent::class, 'crypto_payment_intent_id');
    }
}