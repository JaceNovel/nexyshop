<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResellerPartnerLog extends Model
{
    protected $fillable = ['reseller_partner_id', 'type', 'description', 'metadata'];

    protected $casts = ['metadata' => 'array'];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(ResellerPartner::class, 'reseller_partner_id');
    }
}
