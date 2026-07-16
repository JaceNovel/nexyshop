<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResellerLoan extends Model
{
    protected $fillable = [
        'reseller_partner_id',
        'reference',
        'principal_amount',
        'margin_rate',
        'margin_amount',
        'total_due',
        'amount_repaid',
        'remaining_due',
        'currency',
        'status',
        'requested_at',
        'approved_at',
        'due_date',
        'grace_until',
        'repaid_at',
        'admin_note',
        'partner_note',
        'metadata',
    ];

    protected $casts = [
        'principal_amount' => 'float',
        'margin_rate' => 'float',
        'margin_amount' => 'float',
        'total_due' => 'float',
        'amount_repaid' => 'float',
        'remaining_due' => 'float',
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'due_date' => 'datetime',
        'grace_until' => 'datetime',
        'repaid_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(ResellerPartner::class, 'reseller_partner_id');
    }
}
