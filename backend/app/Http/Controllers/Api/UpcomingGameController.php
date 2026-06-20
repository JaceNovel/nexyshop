<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Games\UpcomingGamesService;
use App\Services\Steam\SteamService;
use Illuminate\Http\JsonResponse;

class UpcomingGameController extends Controller
{
    public function index(UpcomingGamesService $games, SteamService $steam): JsonResponse
    {
        $payload = $games->list();
        $steamUpcoming = $steam->upcomingReleases(10);

        if ($steamUpcoming !== []) {
            $payload['result'] = $steamUpcoming;
        }

        $payload['steam_news'] = $steam->officialNews(null, 3);

        return response()->json($payload);
    }
}
