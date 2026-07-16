<?php

namespace App\Services;

class TournamentScoringService
{
    private const PLACEMENT_POINTS = [
        1 => 12,
        2 => 9,
        3 => 8,
        4 => 7,
        5 => 6,
        6 => 5,
        7 => 4,
        8 => 3,
        9 => 2,
        10 => 1,
    ];

    public function points(int $placement, int $kills): int
    {
        return (self::PLACEMENT_POINTS[$placement] ?? 0) + $kills;
    }
}
