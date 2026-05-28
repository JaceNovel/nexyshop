<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LiveStream;

class LiveController extends Controller
{
    public function current()
    {
        return LiveStream::where('status', 'live')->latest('starts_at')->first()
            ?? LiveStream::latest('starts_at')->first();
    }
}
