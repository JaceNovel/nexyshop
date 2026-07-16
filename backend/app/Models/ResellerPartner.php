<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Hash;

class ResellerPartner extends Model
{
    protected $fillable = [
        'name',
        'company_name',
        'email',
        'password',
        'discord',
        'status',
        'api_status',
        'risk_level',
        'astral_score',
        'order_creation_allowed',
        'allowed_scope',
        'margin_percent',
        'minimum_topup',
        'low_balance_threshold',
        'metadata',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'margin_percent' => 'float',
        'minimum_topup' => 'float',
        'low_balance_threshold' => 'float',
        'astral_score' => 'integer',
        'order_creation_allowed' => 'boolean',
        'metadata' => 'array',
    ];

    public function setPasswordAttribute(string $value): void
    {
        $this->attributes['password'] = Hash::needsRehash($value) ? Hash::make($value) : $value;
    }

    public function wallet(): HasOne
    {
        return $this->hasOne(ResellerWallet::class);
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ResellerApiKey::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(ResellerOrder::class);
    }

    public function recharges(): HasMany
    {
        return $this->hasMany(ResellerRecharge::class);
    }

    public function loans(): HasMany
    {
        return $this->hasMany(ResellerLoan::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(ResellerPartnerLog::class);
    }

    public function scoreEvents(): HasMany
    {
        return $this->hasMany(ResellerPartnerScoreEvent::class);
    }
}
