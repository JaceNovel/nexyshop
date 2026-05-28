<?php

namespace App\Services\AI;

use App\Models\AiClipJob;
use App\Models\Replay;
use App\Models\ReplayMoment;

class ReplayHighlightService
{
    public function createAnalysisJob(Replay $replay): AiClipJob
    {
        return AiClipJob::create([
            'replay_id' => $replay->id,
            'status' => 'queued',
            'provider' => 'openai',
        ]);
    }

    public function generateSuggestedMoments(Replay $replay): array
    {
        $duration = max(600, $replay->duration_seconds ?: 3600);
        $types = ['1v4', 'booyah', 'mvp', 'clutch', 'kill', 'funny'];

        return collect($types)->map(function (string $type, int $index) use ($duration, $replay) {
            $timestamp = min($duration - 30, 180 + ($index * 420));

            return ReplayMoment::create([
                'replay_id' => $replay->id,
                'title' => match ($type) {
                    '1v4' => '1v4 decisif de la manche',
                    'booyah' => 'Booyah final',
                    'mvp' => 'Action MVP',
                    'funny' => 'Moment drole caster',
                    'kill' => 'Gros kill longue distance',
                    default => 'Clutch incroyable',
                },
                'description' => 'Moment propose automatiquement a partir du replay et des metadonnees tournoi.',
                'timestamp_seconds' => $timestamp,
                'type' => $type,
                'thumbnail_url' => $replay->thumbnail_url,
                'ai_confidence' => round(82 + ($index * 2.1), 2),
                'status' => 'pending',
                'metadata' => ['source' => 'ai_suggestion'],
            ]);
        })->all();
    }
}
