<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ResellerWallet extends Model
{
    protected $fillable = [
        'reseller_partner_id',
        'balance',
        'currency',
        'available_balance',
        'pending_balance',
        'credit_balance',
        'total_recharged',
        'total_spent',
        'total_borrowed',
        'total_repaid',
        'total_fees_paid',
        'wallet_status',
    ];

    protected $casts = [
        'balance' => 'float',
        'available_balance' => 'float',
        'pending_balance' => 'float',
        'credit_balance' => 'float',
        'total_recharged' => 'float',
        'total_spent' => 'float',
        'total_borrowed' => 'float',
        'total_repaid' => 'float',
        'total_fees_paid' => 'float',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(ResellerPartner::class, 'reseller_partner_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(ResellerWalletTransaction::class);
    }
}
