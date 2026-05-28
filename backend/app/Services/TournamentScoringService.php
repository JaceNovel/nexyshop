<?php

namespace App\Services;

class TournamentScoringService
{
    private const PLACEMENT_POINTS = [
        1 => 12,
        2 => 9,
        3 => 8,
        4 => 6,
        5 => 5,
        6 => 3,
        7 => 2,
        8 => 1,
        9 => 1,
    ];

    public function points(int $placement, int $kills): int
    {
        return (self::PLACEMENT_POINTS[$placement] ?? 0) + $kills;
    }
}
