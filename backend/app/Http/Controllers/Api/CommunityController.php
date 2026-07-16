<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommunityAction;
use App\Models\Replay;
use App\Models\YoutubeVideo;
use App\Services\Discord\DiscordNotificationService;
use App\Services\Video\YouTubeEngagementService;
use Illuminate\Http\Request;
use Throwable;

class CommunityController extends Controller
{
    public function shareProfile(Request $request, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'game' => ['nullable', 'string', 'max:80'],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $discord->communityProfileShare($request->user(), $data);
        $this->record($request, 'profile_shared', 'user', $request->user()->id, null, $data);

        return response()->json(['message' => 'Profil partage dans la communaute.'], 201);
    }

    public function searchTeam(Request $request, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'game' => ['required', 'string', 'max:80'],
            'role' => ['nullable', 'string', 'max:80'],
            'region' => ['nullable', 'string', 'max:80'],
            'discord' => ['nullable', 'string', 'max:160'],
            'message' => ['nullable', 'string', 'max:700'],
        ]);

        $discord->communityTeamSearch($request->user(), $data);
        $this->record($request, 'team_search', 'user', $request->user()->id, null, $data);

        return response()->json(['message' => 'Recherche team publiee dans la communaute.'], 201);
    }

    public function shareClip(Request $request, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'replay_id' => ['nullable', 'integer', 'exists:replays,id'],
            'youtube_video_id' => ['nullable', 'string', 'max:80'],
            'title' => ['nullable', 'string', 'max:180'],
            'message' => ['nullable', 'string', 'max:700'],
        ]);

        $video = null;
        $targetType = null;
        $targetId = null;

        if (! empty($data['replay_id'])) {
            $video = Replay::findOrFail($data['replay_id']);
            $targetType = 'replay';
            $targetId = $video->id;
        } elseif (! empty($data['youtube_video_id'])) {
            $video = YoutubeVideo::query()->where('youtube_video_id', $data['youtube_video_id'])->first();
            $targetType = 'youtube_video';
            $targetId = $video?->id;
        }

        abort_unless($video || ! empty($data['youtube_video_id']), 422, 'Selectionne une video ou un replay.');

        try {
            $discord->communityClipShare($request->user(), $video, $data);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Clip enregistre, mais la publication Discord est momentanement indisponible.',
                'status' => 'clip_saved_discord_failed',
            ], 202);
        }

        $this->record($request, 'clip_shared', $targetType, $targetId, $data['youtube_video_id'] ?? $video?->youtube_video_id, $data);

        return response()->json(['message' => 'Clip partage dans la communaute.'], 201);
    }

    public function likeYoutubeVideo(Request $request, YouTubeEngagementService $youtube)
    {
        $data = $request->validate([
            'youtube_video_id' => ['required', 'string', 'max:80'],
        ]);

        try {
            $result = $youtube->likeVideo($request->user(), $data['youtube_video_id']);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['message' => $this->youtubeActionMessage($exception)], 422);
        }

        $this->record($request, 'youtube_like', 'youtube_video', null, $data['youtube_video_id'], $result);

        return response()->json($result);
    }

    public function subscribeYoutube(Request $request, YouTubeEngagementService $youtube)
    {
        try {
            $result = $youtube->subscribeToConfiguredChannel($request->user());
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['message' => $this->youtubeActionMessage($exception)], 422);
        }

        $this->record($request, 'youtube_subscribe', 'youtube_channel', null, null, $result);

        return response()->json($result);
    }

    public function shareYoutubeVideo(Request $request)
    {
        $data = $request->validate([
            'youtube_video_id' => ['required', 'string', 'max:80'],
            'platform' => ['nullable', 'string', 'max:40'],
        ]);

        $this->record($request, 'youtube_share', 'youtube_video', null, $data['youtube_video_id'], $data);

        return response()->json([
            'status' => 'tracked',
            'message' => 'Partage enregistre sur Astral4Gamer. YouTube ne fournit pas de compteur de partage public via cette API.',
        ]);
    }

    private function record(Request $request, string $type, ?string $targetType, mixed $targetId, ?string $youtubeVideoId, array $metadata): void
    {
        CommunityAction::create([
            'user_id' => $request->user()?->id,
            'type' => $type,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'youtube_video_id' => $youtubeVideoId,
            'status' => 'sent',
            'metadata' => $metadata,
        ]);
    }

    private function youtubeActionMessage(Throwable $exception): string
    {
        $message = $exception->getMessage();

        if (str_contains($message, 'Reconnecte Google') || str_contains($message, 'Connexion Google')) {
            return $message;
        }

        if (str_contains($message, 'insufficientPermissions') || str_contains($message, 'forbidden') || str_contains($message, '403')) {
            return 'Reconnecte Google pour autoriser les actions YouTube, puis reessaie.';
        }

        if (str_contains($message, 'Chaine YouTube non configuree')) {
            return $message;
        }

        return 'Action YouTube indisponible pour le moment. Reessaie dans quelques instants.';
    }
}
