<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Highlight;
use App\Models\Replay;
use App\Models\ReplayMoment;
use App\Models\Stream;
use App\Models\StreamMarker;
use App\Models\YoutubeAccount;
use App\Services\AI\ReplayHighlightService;
use App\Services\AstralNotificationService;
use App\Services\Discord\DiscordNotificationService;
use App\Services\Obs\ObsWebSocketService;
use App\Services\Video\FfmpegService;
use App\Services\Video\YouTubeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AdminVideoController extends Controller
{
    public function youtubeStatus()
    {
        $account = YoutubeAccount::query()->latest()->first();

        return response()->json([
            'connected' => (bool) $account,
            'account' => $account?->only(['id', 'channel_id', 'channel_title', 'token_expires_at', 'status']),
        ]);
    }

    public function youtubeRedirect(Request $request, YouTubeService $youtube)
    {
        $state = Str::random(48);
        Cache::put('youtube_oauth_state:'.$state, $request->user()?->id, now()->addMinutes(10));

        return response()->json(['url' => $youtube->authorizationUrl($state)]);
    }

    public function youtubeCallback(Request $request, YouTubeService $youtube)
    {
        $request->validate(['code' => ['required', 'string'], 'state' => ['required', 'string']]);

        $cacheKey = 'youtube_oauth_state:'.$request->state;
        abort_unless(Cache::has($cacheKey), 419, 'OAuth state invalide ou expire.');

        $account = $youtube->exchangeCode($request->code, Cache::pull($cacheKey));

        return response()->json([
            'message' => 'Compte YouTube connecte.',
            'account' => $account->only(['id', 'channel_id', 'channel_title', 'token_expires_at', 'status']),
        ]);
    }

    public function createLive(
        Request $request,
        YouTubeService $youtube,
        AstralNotificationService $notifications,
        DiscordNotificationService $discord
    ) {
        $data = $request->validate([
            'tournament_id' => ['nullable', 'exists:tournaments,id'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'scheduled_at' => ['nullable', 'date'],
            'privacy_status' => ['nullable', 'in:public,unlisted,private'],
        ]);

        $account = YoutubeAccount::query()->latest()->first();
        abort_unless($account, 422, 'Aucun compte YouTube connecte.');

        $stream = $youtube->createLive($account, $data);

        $notifications->broadcast([
            'channel' => 'bell',
            'type' => 'stream',
            'title' => 'Stream programme',
            'body' => $stream->title.' sera diffuse sur Astral4Gamer.',
            'url' => '/live',
            'action_label' => 'Voir le live',
            'action_url' => rtrim((string) config('services.google.frontend_url'), '/').'/live',
            'data' => ['stream_id' => $stream->id],
        ], true);

        $discord->streamPublished($stream);

        return response()->json(['data' => $stream], 201);
    }

    public function syncVideo(
        Request $request,
        YouTubeService $youtube,
        AstralNotificationService $notifications,
        DiscordNotificationService $discord
    ) {
        $data = $request->validate([
            'youtube_video_id' => ['required', 'string'],
            'type' => ['nullable', 'in:live,replay,highlight'],
        ]);

        $video = $youtube->syncVideoMetadata($data['youtube_video_id'], $data['type'] ?? 'replay');

        if ($video) {
            $notifications->broadcast([
                'channel' => 'bell',
                'type' => 'video',
                'title' => 'Nouvelle video disponible',
                'body' => $video->title,
                'url' => '/replays',
                'action_label' => 'Voir les videos',
                'action_url' => rtrim((string) config('services.google.frontend_url'), '/').'/replays',
                'data' => ['youtube_video_id' => $video->youtube_video_id],
            ], true);
            $discord->streamPublished($video);
        }

        return response()->json(['data' => $video]);
    }

    public function analyzeReplay(Replay $replay, ReplayHighlightService $service)
    {
        $job = $service->createAnalysisJob($replay);
        $moments = $service->generateSuggestedMoments($replay);
        $job->update([
            'status' => 'completed',
            'detected_moments' => collect($moments)->map->only(['id', 'title', 'type', 'timestamp_seconds'])->all(),
            'finished_at' => now(),
        ]);

        return response()->json(['job' => $job->fresh(), 'moments' => $moments], 202);
    }

    public function updateMoment(Request $request, ReplayMoment $moment)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string'],
            'timestamp_seconds' => ['sometimes', 'integer', 'min:0'],
            'type' => ['sometimes', 'in:kill,1v4,booyah,mvp,funny,clutch'],
            'status' => ['sometimes', 'in:pending,approved,rejected'],
        ]);

        $moment->update($data);

        return response()->json(['data' => $moment->fresh()]);
    }

    public function generateHighlight(ReplayMoment $moment, FfmpegService $ffmpeg, YouTubeService $youtube)
    {
        $replay = $moment->replay()->firstOrFail();
        $draft = $youtube->createHighlightDraft($replay, [
            'title' => $moment->title,
            'description' => $moment->description,
        ]);

        $highlight = Highlight::create([
            'replay_id' => $replay->id,
            'moment_id' => $moment->id,
            'title' => $draft['title'],
            'description' => $draft['description'],
            'format' => 'vertical',
            'status' => 'processing',
            'thumbnail_url' => $moment->thumbnail_url ?: $replay->thumbnail_url,
            'hashtags' => ['NEXY', 'Esport', $moment->type],
        ]);

        $job = $ffmpeg->queueClip($moment, $highlight);

        return response()->json(['highlight' => $highlight, 'job' => $job], 202);
    }

    public function markStreamMoment(Request $request, Stream $stream)
    {
        $data = $request->validate([
            'timestamp_seconds' => ['required', 'integer', 'min:0'],
            'type' => ['nullable', 'in:kill,1v4,booyah,mvp,funny,clutch'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $marker = StreamMarker::create([
            'stream_id' => $stream->id,
            'timestamp_seconds' => $data['timestamp_seconds'],
            'type' => $data['type'] ?? 'clutch',
            'note' => $data['note'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json(['data' => $marker], 201);
    }

    public function updateStreamStatus(Request $request, Stream $stream, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'status' => ['required', 'in:scheduled,live,ended,cancelled'],
            'watch_url' => ['nullable', 'url', 'max:500'],
            'thumbnail_url' => ['nullable', 'url', 'max:500'],
        ]);

        $previousStatus = $stream->status;
        $metadata = $stream->metadata ?? [];
        $updates = [
            'status' => $data['status'],
            'watch_url' => $data['watch_url'] ?? $stream->watch_url,
            'thumbnail_url' => $data['thumbnail_url'] ?? $stream->thumbnail_url,
        ];

        if ($data['status'] === 'live' && ! $stream->started_at) {
            $updates['started_at'] = now();
        }

        if (in_array($data['status'], ['ended', 'cancelled'], true) && ! $stream->ended_at) {
            $updates['ended_at'] = now();
        }

        $stream->update($updates);

        if ($previousStatus !== 'live' && $stream->status === 'live' && empty($metadata['discord_live_announced_at'])) {
            $discord->streamPublished($stream->fresh('tournament'), 'live');
            $metadata['discord_live_announced_at'] = now()->toIso8601String();
            $stream->forceFill(['metadata' => $metadata])->save();
        }

        return response()->json(['data' => $stream->fresh()]);
    }

    public function obsStatus(ObsWebSocketService $obs)
    {
        return response()->json($obs->status());
    }

    public function obsCommand(string $command, ObsWebSocketService $obs)
    {
        abort_unless(in_array($command, ['start-stream', 'stop-stream', 'start-recording', 'stop-recording', 'marker'], true), 404);

        return response()->json($obs->command($command));
    }
}
