<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mission;

class MissionController extends Controller
{
    public function claim(Mission $mission)
    {
        return [
            'claimed' => true,
            'reward_type' => $mission->reward_type,
            'reward_amount' => $mission->reward_amount,
            'next_claim_after_minutes' => $mission->cooldown_minutes,
        ];
    }
}
