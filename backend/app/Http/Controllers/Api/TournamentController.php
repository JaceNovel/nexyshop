<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Tournament;
use App\Models\TournamentRoundResult;
use App\Models\TournamentTeam;
use App\Services\AstralNotificationService;
use App\Services\Discord\DiscordNotificationService;
use App\Services\GoogleTournamentCalendarService;
use App\Services\Payments\PaymentManager;
use App\Services\TournamentScoringService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class TournamentController extends Controller
{
    public function index()
    {
        return Tournament::withCount('teams')->latest('starts_at')->paginate(18);
    }

    public function show(Tournament $tournament)
    {
        return $tournament->load(['teams' => fn ($query) => $query->orderByDesc('points')]);
    }

    public function mine(Request $request)
    {
        return Tournament::query()
            ->where('rules->creator_user_id', $request->user()->id)
            ->withCount('teams')
            ->latest('created_at')
            ->paginate(18);
    }

    public function store(Request $request, AstralNotificationService $notifications, DiscordNotificationService $discord)
    {
        $tournament = Tournament::create($request->validate([
            'title' => ['required', 'string', 'max:160'],
            'mode' => ['required', 'in:BR Squad,Solo,Duo,Clash Squad,Guild Wars'],
            'status' => ['required', 'string'],
            'starts_at' => ['required', 'date'],
            'prize_pool' => ['required', 'numeric'],
            'room_id' => ['nullable', 'string'],
            'rules' => ['array'],
        ]));

        if (in_array($tournament->status, ['scheduled', 'open', 'live'], true)) {
            $notifications->broadcast([
                'channel' => 'bell',
                'type' => 'tournament',
                'title' => 'Nouveau tournoi disponible',
                'body' => $tournament->title.' commence le '.$tournament->starts_at?->format('d/m/Y H:i').'.',
                'url' => '/tournois',
                'action_url' => rtrim((string) config('services.google.frontend_url'), '/').'/tournois',
                'data' => ['tournament_id' => $tournament->id],
            ], true);
            $discord->tournamentPublished($tournament);
        }

        return $tournament;
    }

    public function requestCreation(
        Request $request,
        AstralNotificationService $notifications,
        GoogleTournamentCalendarService $calendar,
        DiscordNotificationService $discord
    ) {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'game' => ['required', 'string', 'max:80'],
            'mode' => ['required', 'string', 'max:80'],
            'team_type' => ['required', 'string', 'max:40'],
            'slot.starts_at' => ['required', 'date'],
            'slot.ends_at' => ['required', 'date'],
            'region' => ['required', 'string', 'max:80'],
            'platform' => ['required', 'string', 'max:80'],
            'phone' => ['required', 'string', 'min:6', 'max:40'],
            'participants' => ['required', 'integer', 'min:2', 'max:512'],
            'reward_amount' => ['required', 'numeric', 'min:0'],
            'reward_unit' => ['required', 'string', 'max:40'],
            'funding' => ['required', 'in:astral,self'],
            'description' => ['nullable', 'string', 'max:500'],
            'cover_image' => ['nullable', 'string', 'max:1500000'],
        ]);

        $calendar->assertAvailable($data['slot']['starts_at'], $data['slot']['ends_at']);

        $tournament = Tournament::create([
            'title' => $data['title'],
            'mode' => $data['mode'],
            'status' => $data['funding'] === 'astral' ? 'pending_financing_validation' : 'scheduled',
            'starts_at' => $data['slot']['starts_at'],
            'prize_pool' => $data['reward_amount'],
            'rules' => [
                'game' => $data['game'],
                'creator_user_id' => $request->user()->id,
                'team_type' => $data['team_type'],
                'region' => $data['region'],
                'platform' => $data['platform'],
                'phone' => $data['phone'],
                'participants' => $data['participants'],
                'reward_unit' => $data['reward_unit'],
                'funding' => $data['funding'],
                'description' => $data['description'] ?? null,
                'cover_image' => $data['cover_image'] ?? null,
                'calendar_slot' => $data['slot'],
                'duration_minutes' => max(30, (int) round((strtotime($data['slot']['ends_at']) - strtotime($data['slot']['starts_at'])) / 60)),
            ],
        ]);

        $notifications->notifyUser($request->user(), [
            'type' => 'tournament_creation',
            'title' => 'Demande de tournoi recue',
            'subject' => 'Demande de tournoi recue',
            'preview' => "Ton tournoi {$tournament->title} est planifie sur le creneau choisi.",
            'action_label' => 'Voir mes tournois',
            'action_url' => rtrim((string) config('services.google.frontend_url'), '/').'/tournois?tab=mine',
            'data' => ['tournament_id' => $tournament->id],
        ]);

        if ($tournament->status === 'scheduled') {
            $notifications->broadcast([
                'channel' => 'bell',
                'type' => 'tournament',
                'title' => 'Nouveau tournoi disponible',
                'body' => $tournament->title.' commence le '.$tournament->starts_at?->format('d/m/Y H:i').'.',
                'url' => '/tournois',
                'action_url' => rtrim((string) config('services.google.frontend_url'), '/').'/tournois',
                'data' => ['tournament_id' => $tournament->id],
            ], true);
            $discord->tournamentPublished($tournament);
        }

        $paymentPayload = $this->initiateFundingPayment($request, $tournament);

        return response()->json(['data' => $tournament, ...$paymentPayload], 201);
    }

    public function update(Request $request, Tournament $tournament, AstralNotificationService $notifications, DiscordNotificationService $discord)
    {
        $previousStatus = $tournament->status;
        $tournament->update($request->only(['title', 'mode', 'status', 'starts_at', 'prize_pool', 'room_id', 'rules']));

        if ($previousStatus !== $tournament->status && in_array($tournament->status, ['scheduled', 'open', 'live'], true)) {
            $notifications->broadcast([
                'channel' => 'bell',
                'type' => 'tournament',
                'title' => 'Tournoi mis a jour',
                'body' => $tournament->title.' est maintenant '.$tournament->status.'.',
                'url' => '/tournois',
                'action_url' => rtrim((string) config('services.google.frontend_url'), '/').'/tournois',
                'data' => ['tournament_id' => $tournament->id],
            ], true);
            $discord->tournamentPublished($tournament, 'updated');
        }

        if ($previousStatus !== $tournament->status && $tournament->status === 'completed') {
            $this->announceTournamentCompletedOnce($tournament->fresh(), $discord);
        }

        return $tournament->fresh();
    }

    public function destroy(Tournament $tournament)
    {
        $tournament->delete();

        return response()->noContent();
    }

    public function register(Request $request, Tournament $tournament, AstralNotificationService $notifications, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'tag' => ['nullable', 'string', 'max:10'],
            'guild_id' => ['nullable', 'exists:guilds,id'],
            'region' => ['nullable', 'string', 'max:80'],
            'country' => ['nullable', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:150'],
            'contact_whatsapp' => ['nullable', 'string', 'max:40'],
            'instagram' => ['nullable', 'string', 'max:80'],
            'discord' => ['nullable', 'string', 'max:160'],
            'logo' => ['nullable', 'string', 'max:1500000'],
            'members' => ['nullable', 'array', 'max:5'],
            'members.*.role' => ['required_with:members', 'string', 'max:40'],
            'members.*.nickname' => ['nullable', 'string', 'max:80'],
            'members.*.uid' => ['nullable', 'string', 'max:40'],
            'members.*.whatsapp' => ['nullable', 'string', 'max:40'],
        ]);

        $team = TournamentTeam::create([
            'name' => $data['name'],
            'guild_id' => $data['guild_id'] ?? null,
            'tournament_id' => $tournament->id,
            'captain_user_id' => $request->user()->id,
            'status' => 'pending_validation',
            'metadata' => [
                'tag' => $data['tag'] ?? null,
                'region' => $data['region'] ?? null,
                'country' => $data['country'] ?? null,
                'description' => $data['description'] ?? null,
                'contact_whatsapp' => $data['contact_whatsapp'] ?? null,
                'instagram' => $data['instagram'] ?? null,
                'discord' => $data['discord'] ?? null,
                'logo' => $data['logo'] ?? null,
                'members' => $data['members'] ?? [],
            ],
        ]);

        $notifications->notifyUser($request->user(), [
            'type' => 'tournament_registration',
            'title' => 'Inscription tournoi recue',
            'subject' => 'Inscription tournoi recue',
            'preview' => "Ton equipe {$team->name} est en attente de validation pour {$tournament->title}.",
            'action_label' => 'Voir le tournoi',
            'action_url' => rtrim((string) config('services.google.frontend_url'), '/').'/tournois',
            'data' => ['tournament_id' => $tournament->id, 'team_id' => $team->id],
        ]);

        $discord->tournamentRegistration($tournament, $team, $request->user());

        return $team;
    }

    public function complete(Request $request, Tournament $tournament, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'winner_team_id' => ['nullable', 'exists:tournament_teams,id'],
            'winner_name' => ['nullable', 'string', 'max:160'],
            'reward_amount' => ['nullable', 'numeric', 'min:0'],
            'reward_unit' => ['nullable', 'string', 'max:40'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $winner = $this->winnerTeamFromPayload($tournament, $data['winner_team_id'] ?? null);
        $rules = $tournament->rules ?? [];
        $rules['winner_team_id'] = $winner?->id;
        $rules['winner_name'] = $winner?->name ?: ($data['winner_name'] ?? $rules['winner_name'] ?? null);
        $rules['completed_at'] = now()->toIso8601String();
        $rules['result_note'] = $data['note'] ?? $rules['result_note'] ?? null;

        if (array_key_exists('reward_amount', $data)) {
            $tournament->prize_pool = $data['reward_amount'];
        }

        if (array_key_exists('reward_unit', $data)) {
            $rules['reward_unit'] = $data['reward_unit'];
        }

        $tournament->status = 'completed';
        $tournament->rules = $rules;
        $tournament->save();

        $this->announceTournamentCompletedOnce($tournament->fresh(), $discord);

        return $tournament->fresh(['teams' => fn ($query) => $query->orderByDesc('points')]);
    }

    public function claimReward(Request $request, Tournament $tournament, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'winner_team_id' => ['nullable', 'exists:tournament_teams,id'],
            'winner_name' => ['nullable', 'string', 'max:160'],
            'reward_amount' => ['nullable', 'numeric', 'min:0'],
            'reward_unit' => ['nullable', 'string', 'max:40'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $winner = $this->winnerTeamFromPayload($tournament, $data['winner_team_id'] ?? ($tournament->rules['winner_team_id'] ?? null));
        $rules = $tournament->rules ?? [];
        $rules['winner_team_id'] = $winner?->id ?: ($rules['winner_team_id'] ?? null);
        $rules['winner_name'] = $winner?->name ?: ($data['winner_name'] ?? $rules['winner_name'] ?? null);
        $rules['reward_claimed'] = true;
        $rules['reward_claimed_at'] = now()->toIso8601String();
        $rules['reward_sent_by'] = $request->user()?->id;
        $rules['reward_note'] = $data['note'] ?? $rules['reward_note'] ?? null;

        if (array_key_exists('reward_amount', $data)) {
            $rules['reward_amount_sent'] = $data['reward_amount'];
        }

        if (array_key_exists('reward_unit', $data)) {
            $rules['reward_unit'] = $data['reward_unit'];
        }

        $tournament->rules = $rules;
        $tournament->save();

        $this->announceTournamentRewardClaimedOnce($tournament->fresh(), $discord);

        return $tournament->fresh(['teams' => fn ($query) => $query->orderByDesc('points')]);
    }

    public function submitResult(Request $request, Tournament $tournament, TournamentScoringService $scoring)
    {
        $data = $request->validate([
            'team_id' => ['required', 'exists:tournament_teams,id'],
            'round' => ['required', 'integer', 'min:1'],
            'placement' => ['required', 'integer', 'min:1'],
            'kills' => ['required', 'integer', 'min:0'],
            'mvp_user_id' => ['nullable', 'exists:users,id'],
        ]);

        return DB::transaction(function () use ($data, $tournament, $scoring) {
            $points = $scoring->points($data['placement'], $data['kills']);
            $result = TournamentRoundResult::updateOrCreate(
                ['tournament_id' => $tournament->id, 'tournament_team_id' => $data['team_id'], 'round' => $data['round']],
                ['placement' => $data['placement'], 'kills' => $data['kills'], 'points' => $points, 'mvp_user_id' => $data['mvp_user_id'] ?? null]
            );

            $team = TournamentTeam::findOrFail($data['team_id']);
            $team->update([
                'points' => $team->rounds()->sum('points'),
                'kills' => $team->rounds()->sum('kills'),
            ]);

            return $result;
        });
    }

    private function initiateFundingPayment(Request $request, Tournament $tournament): array
    {
        if (($tournament->rules['funding'] ?? null) !== 'astral') {
            return ['payment' => null, 'checkout_url' => null];
        }

        if (blank(config('services.payments.moneroo.secret_key'))) {
            return ['payment' => null, 'checkout_url' => null, 'payment_status' => 'not_configured'];
        }

        try {
            $user = $request->user();
            $nameParts = preg_split('/\s+/', trim((string) $user->name), 2) ?: [];
            $checkout = (new PaymentManager('moneroo'))->initiate([
                'amount' => 2,
                'currency' => 'USD',
                'description' => 'Financement tournoi Astral4Gamer #'.$tournament->id,
                'return_url' => config('services.payments.moneroo.return_url').'?tournament_id='.$tournament->id,
                'customer' => [
                    'email' => $user->email,
                    'first_name' => $nameParts[0] ?? $user->name,
                    'last_name' => $nameParts[1] ?? 'Astral4Gamer',
                    'phone' => $tournament->rules['phone'] ?? null,
                ],
                'metadata' => [
                    'tournament_id' => (string) $tournament->id,
                    'user_id' => (string) $user->id,
                    'type' => 'tournament_funding',
                ],
            ]);

            $payment = Payment::create([
                'user_id' => $user->id,
                'provider' => 'moneroo',
                'reference' => $checkout['reference'] ?: 'tournament-'.$tournament->id.'-'.Str::uuid(),
                'amount' => 2,
                'currency' => 'USD',
                'status' => 'initiated',
                'payload' => [
                    ...$checkout,
                    'metadata' => [
                        'tournament_id' => $tournament->id,
                        'type' => 'tournament_funding',
                    ],
                ],
            ]);

            $rules = $tournament->rules ?? [];
            $rules['payment_id'] = $payment->id;
            $rules['payment_status'] = 'initiated';
            $tournament->update(['rules' => $rules]);

            return ['payment' => $payment, 'checkout_url' => $checkout['checkout_url'] ?? null];
        } catch (Throwable $exception) {
            report($exception);

            return ['payment' => null, 'checkout_url' => null, 'payment_status' => 'unavailable'];
        }
    }

    private function winnerTeamFromPayload(Tournament $tournament, mixed $teamId): ?TournamentTeam
    {
        if (! $teamId) {
            return null;
        }

        return TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->whereKey($teamId)
            ->firstOrFail();
    }

    private function winnerTeamFromRules(Tournament $tournament): ?TournamentTeam
    {
        $teamId = $tournament->rules['winner_team_id'] ?? null;

        if (! $teamId) {
            return null;
        }

        return TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->whereKey($teamId)
            ->first();
    }

    private function announceTournamentCompletedOnce(Tournament $tournament, DiscordNotificationService $discord): void
    {
        $rules = $tournament->rules ?? [];

        if (($rules['discord_result_announced'] ?? false) === true) {
            return;
        }

        $discord->tournamentCompleted($tournament, $this->winnerTeamFromRules($tournament));

        $rules['discord_result_announced'] = true;
        $rules['discord_result_announced_at'] = now()->toIso8601String();
        $tournament->forceFill(['rules' => $rules])->save();
    }

    private function announceTournamentRewardClaimedOnce(Tournament $tournament, DiscordNotificationService $discord): void
    {
        $rules = $tournament->rules ?? [];

        if (($rules['discord_reward_claimed_announced'] ?? false) === true) {
            return;
        }

        $discord->tournamentRewardClaimed(
            $tournament,
            $this->winnerTeamFromRules($tournament),
            $rules['reward_amount_sent'] ?? $tournament->prize_pool,
            $rules['reward_unit'] ?? null
        );

        $rules['discord_reward_claimed_announced'] = true;
        $rules['discord_reward_claimed_announced_at'] = now()->toIso8601String();
        $tournament->forceFill(['rules' => $rules])->save();
    }
}
