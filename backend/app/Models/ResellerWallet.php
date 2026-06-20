<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ResellerWallet extends Model
{
    protected $fillable = ['reseller_partner_id', 'balance', 'currency'];

    protected $casts = ['balance' => 'float'];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(ResellerPartner::class, 'reseller_partner_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(ResellerWalletTransaction::class);
    }
}
