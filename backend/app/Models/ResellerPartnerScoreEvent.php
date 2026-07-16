<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResellerPartnerScoreEvent extends Model
{
    protected $fillable = ['reseller_partner_id', 'type', 'points', 'reason', 'admin_id', 'metadata'];

    protected $casts = [
        'points' => 'integer',
        'metadata' => 'array',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(ResellerPartner::class, 'reseller_partner_id');
    }
}
