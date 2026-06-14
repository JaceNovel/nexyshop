<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GoogleTournamentCalendarService;
use Illuminate\Http\Request;

class TournamentCalendarController extends Controller
{
    public function slots(Request $request, GoogleTournamentCalendarService $calendar)
    {
        $request->validate([
            'date' => ['nullable', 'date'],
        ]);

        return response()->json([
            'data' => $calendar->slots($request->query('date')),
        ]);
    }
}
