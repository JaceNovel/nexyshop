<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartnershipRequest extends Model
{
    protected $fillable = [
        'reference',
        'name',
        'company_name',
        'email',
        'discord',
        'discord_user_id',
        'discord_username',
        'country',
        'type',
        'audience',
        'network_url',
        'message',
        'expected_earning',
        'status',
        'metadata',
    ];

    protected $casts = ['metadata' => 'array'];
}
