<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResellerApiSubscription extends Model
{
    protected $fillable = [
        'reseller_partner_id',
        'period',
        'amount',
        'base_amount_xof',
        'currency',
        'status',
        'reference',
        'charged_at',
        'due_at',
        'grace_until',
        'paid_at',
        'suspended_at',
        'metadata',
    ];

    protected $casts = [
        'period' => 'date',
        'amount' => 'float',
        'base_amount_xof' => 'float',
        'charged_at' => 'datetime',
        'due_at' => 'datetime',
        'grace_until' => 'datetime',
        'paid_at' => 'datetime',
        'suspended_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(ResellerPartner::class, 'reseller_partner_id');
    }
}
