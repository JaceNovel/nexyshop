<?php

namespace App\Services\Reseller;

use App\Models\Payment;
use App\Models\ResellerLoan;
use App\Models\ResellerOrder;
use App\Models\ResellerPartner;
use App\Models\ResellerPartnerLog;
use App\Models\ResellerPartnerScoreEvent;
use App\Models\ResellerRecharge;
use App\Models\ResellerWallet;
use App\Models\ResellerWalletTransaction;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdvancedResellerWalletService
{
    public function isBusinessDay(CarbonInterface $date): bool
    {
        return ! $date->isWeekend();
    }

    public function getNextBusinessDay(CarbonInterface $date): CarbonInterface
    {
        $next = Carbon::instance($date)->copy()->addDay()->setTime(9, 0);

        while (! $this->isBusinessDay($next)) {
            $next->addDay();
        }

        return $next;
    }

    public function shouldCreditImmediately(CarbonInterface $date, string $rechargeType): bool
    {
        return $rechargeType === 'express' || $this->isBusinessDay($date);
    }

    public function ensureWallet(ResellerPartner $partner): ResellerWallet
    {
        $wallet = $partner->wallet()->firstOrCreate([], [
            'balance' => 0,
            'available_balance' => 0,
            'pending_balance' => 0,
            'credit_balance' => 0,
            'currency' => 'USD',
            'wallet_status' => 'active',
        ]);

        $updates = [];
        if ((float) ($wallet->available_balance ?? 0) === 0.0 && (float) $wallet->balance > 0) {
            $updates['available_balance'] = (float) $wallet->balance;
        }
        if (! $wallet->wallet_status) {
            $updates['wallet_status'] = 'active';
        }
        if ($updates !== []) {
            $wallet->forceFill($updates)->save();
            $wallet->refresh();
        }

        return $wallet;
    }

    public function minimumTopup(ResellerPartner $partner): float
    {
        return max((float) ($partner->minimum_topup ?: 0), (float) config('services.reseller.minimum_topup', 100));
    }

    public function expressFee(float $amount, ResellerPartner $partner): float
    {
        $metadata = $partner->metadata ?? [];
        $percent = (float) ($metadata['express_fee_percent'] ?? config('services.reseller.express_fee_percent', 10));
        $minimum = (float) ($metadata['express_fee_minimum'] ?? config('services.reseller.express_fee_minimum', 5));

        if ((int) ($partner->astral_score ?? 900) >= 900) {
            $percent = max(0, $percent - 2);
        }

        return round(max($minimum, $amount * ($percent / 100)), 2);
    }

    public function createRecharge(ResellerPartner $partner, Payment $payment, string $type, float $amount, float $fee, string $reference, array $metadata = []): ResellerRecharge
    {
        $wallet = $this->ensureWallet($partner);
        $now = now();
        $creditImmediately = $this->shouldCreditImmediately($now, $type);

        $recharge = ResellerRecharge::create([
            'reseller_partner_id' => $partner->id,
            'reseller_wallet_id' => $wallet->id,
            'payment_id' => $payment->id,
            'reference' => $reference,
            'recharge_type' => $type,
            'amount' => $amount,
            'fee' => $fee,
            'total_to_pay' => round($amount + $fee, 2),
            'credited_amount' => 0,
            'currency' => $wallet->currency,
            'status' => 'pending_payment',
            'is_express' => $type === 'express',
            'due_credit_at' => $creditImmediately ? null : $this->getNextBusinessDay($now),
            'metadata' => $metadata,
        ]);

        $this->log($partner, 'recharge_created', 'Recharge '.$type.' créée.', ['recharge_id' => $recharge->id, 'amount' => $amount, 'fee' => $fee]);

        return $recharge;
    }

    public function confirmRechargePayment(Payment $payment): ?ResellerRecharge
    {
        $recharge = ResellerRecharge::query()->where('payment_id', $payment->id)->first();

        if (! $recharge || $recharge->status === 'credited') {
            return $recharge;
        }

        return DB::transaction(function () use ($payment, $recharge) {
            $recharge = ResellerRecharge::query()->lockForUpdate()->find($recharge->id);
            if (! $recharge || $recharge->status === 'credited') {
                return $recharge;
            }

            $partner = ResellerPartner::query()->lockForUpdate()->findOrFail($recharge->reseller_partner_id);
            $wallet = ResellerWallet::query()->where('reseller_partner_id', $partner->id)->lockForUpdate()->firstOrFail();
            $now = now();

            $recharge->forceFill(['paid_at' => $now]);

            if ($this->shouldCreditImmediately($now, $recharge->recharge_type)) {
                $creditedToWallet = $this->creditWalletLocked($partner, $wallet, (float) $recharge->amount, 'wallet_credit', $recharge->reference, 'Recharge '.$recharge->recharge_type.' créditée.', ['payment_id' => $payment->id, 'recharge_id' => $recharge->id]);
                $wallet->total_recharged = round((float) $wallet->total_recharged + (float) $recharge->amount, 2);
                $wallet->total_fees_paid = round((float) $wallet->total_fees_paid + (float) $recharge->fee, 2);
                $wallet->save();

                if ((float) $recharge->fee > 0) {
                    $this->recordTransaction($partner, $wallet, 'express_fee', (float) $recharge->fee * -1, 'debit', $recharge->reference.'-FEE', 'Frais recharge express.', ['recharge_id' => $recharge->id]);
                }

                $recharge->forceFill([
                    'status' => 'credited',
                    'credited_amount' => (float) $recharge->amount,
                    'credited_at' => $now,
                    'metadata' => array_merge($recharge->metadata ?? [], ['auto_repayment_amount' => (float) $recharge->amount - $creditedToWallet]),
                ])->save();

                $this->log($partner, 'recharge_credited', 'Recharge créditée sur le wallet.', ['recharge_id' => $recharge->id]);
                DB::afterCommit(function () use ($partner) {
                    app(ResellerApiSubscriptionService::class)->settleFromWallet($partner->fresh());
                    app(PendingResellerOrderService::class)->process($partner->fresh());
                });
            } else {
                $wallet->pending_balance = round((float) $wallet->pending_balance + (float) $recharge->amount, 2);
                $wallet->total_fees_paid = round((float) $wallet->total_fees_paid + (float) $recharge->fee, 2);
                $wallet->save();
                $recharge->forceFill([
                    'status' => 'paid_pending_credit',
                    'due_credit_at' => $recharge->due_credit_at ?: $this->getNextBusinessDay($now),
                ])->save();

                $this->recordTransaction($partner, $wallet, 'recharge_standard', (float) $recharge->amount, 'credit', $recharge->reference, 'Recharge standard payée, en attente du prochain jour ouvrable.', ['recharge_id' => $recharge->id]);
                $this->log($partner, 'recharge_pending_credit', 'Recharge mise en attente week-end.', ['recharge_id' => $recharge->id]);
            }

            $this->refreshScore($partner);

            return $recharge->fresh();
        });
    }

    public function creditDuePendingRecharges(): int
    {
        $count = 0;

        ResellerRecharge::query()
            ->where('status', 'paid_pending_credit')
            ->where('due_credit_at', '<=', now())
            ->orderBy('id')
            ->get()
            ->each(function (ResellerRecharge $recharge) use (&$count) {
                DB::transaction(function () use ($recharge, &$count) {
                    $recharge = ResellerRecharge::query()->lockForUpdate()->find($recharge->id);
                    if (! $recharge || $recharge->status !== 'paid_pending_credit') {
                        return;
                    }

                    $partner = ResellerPartner::query()->lockForUpdate()->findOrFail($recharge->reseller_partner_id);
                    $wallet = ResellerWallet::query()->where('reseller_partner_id', $partner->id)->lockForUpdate()->firstOrFail();
                    $wallet->pending_balance = max(0, round((float) $wallet->pending_balance - (float) $recharge->amount, 2));
                    $creditedToWallet = $this->creditWalletLocked($partner, $wallet, (float) $recharge->amount, 'wallet_credit', $recharge->reference, 'Recharge standard créditée après jour ouvrable.', ['recharge_id' => $recharge->id]);
                    $wallet->total_recharged = round((float) $wallet->total_recharged + (float) $recharge->amount, 2);
                    $wallet->save();

                    $recharge->forceFill([
                        'status' => 'credited',
                        'credited_amount' => (float) $recharge->amount,
                        'credited_at' => now(),
                        'metadata' => array_merge($recharge->metadata ?? [], ['auto_repayment_amount' => (float) $recharge->amount - $creditedToWallet]),
                    ])->save();

                    $this->log($partner, 'recharge_credited', 'Recharge week-end créditée automatiquement.', ['recharge_id' => $recharge->id]);
                    DB::afterCommit(function () use ($partner) {
                        app(ResellerApiSubscriptionService::class)->settleFromWallet($partner->fresh());
                        app(PendingResellerOrderService::class)->process($partner->fresh());
                    });
                    $count++;
                });
            });

        return $count;
    }

    public function requestLoan(ResellerPartner $partner, float $amount, ?string $note = null): ResellerLoan
    {
        return DB::transaction(function () use ($partner, $amount, $note) {
            $partner = ResellerPartner::query()->lockForUpdate()->findOrFail($partner->id);
            abort_if($partner->status === 'suspended' || $partner->api_status === 'suspended', 403, 'Partenaire suspendu. Prêt Astral indisponible.');
            abort_if((int) ($partner->astral_score ?? 900) < 600, 422, 'Score Astral insuffisant pour demander un prêt.');
            abort_if(ResellerLoan::where('reseller_partner_id', $partner->id)->whereIn('status', ['requested', 'approved', 'active', 'grace_period', 'overdue'])->exists(), 422, 'Un prêt Astral est déjà actif.');

            $limit = $this->loanLimit($partner);
            abort_if($amount <= 0 || $amount > $limit, 422, 'Plafond de prêt disponible: '.$limit.' USD.');

            $marginRate = (float) config('services.reseller.loan_margin_rate', 10);
            $margin = round($amount * ($marginRate / 100), 2);

            $loan = ResellerLoan::create([
                'reseller_partner_id' => $partner->id,
                'reference' => $this->reference('A4G-LOAN'),
                'principal_amount' => $amount,
                'margin_rate' => $marginRate,
                'margin_amount' => $margin,
                'total_due' => round($amount + $margin, 2),
                'remaining_due' => round($amount + $margin, 2),
                'currency' => $this->ensureWallet($partner)->currency,
                'status' => config('services.reseller.loan_auto_approve', true) ? 'active' : 'requested',
                'requested_at' => now(),
                'approved_at' => config('services.reseller.loan_auto_approve', true) ? now() : null,
                'due_date' => config('services.reseller.loan_auto_approve', true) ? $this->nextLoanDueDate() : null,
                'grace_until' => config('services.reseller.loan_auto_approve', true) ? $this->nextLoanDueDate()->copy()->addDays(2) : null,
                'partner_note' => $note,
            ]);

            $this->log($partner, 'loan_requested', 'Demande de prêt Astral créée.', ['loan_id' => $loan->id, 'amount' => $amount]);

            if ($loan->status === 'active') {
                $this->activateLoan($loan, 'Approbation automatique.');
            }

            return $loan->fresh();
        });
    }

    public function approveLoan(ResellerLoan $loan, ?string $adminNote = null): ResellerLoan
    {
        return DB::transaction(function () use ($loan, $adminNote) {
            $loan = ResellerLoan::query()->lockForUpdate()->findOrFail($loan->id);
            abort_unless(in_array($loan->status, ['requested', 'approved'], true), 422, 'Ce prêt ne peut plus être approuvé.');
            $loan->forceFill([
                'status' => 'active',
                'approved_at' => now(),
                'due_date' => $loan->due_date ?: $this->nextLoanDueDate(),
                'grace_until' => $loan->grace_until ?: $this->nextLoanDueDate()->copy()->addDays(2),
                'admin_note' => $adminNote,
            ])->save();

            return $this->activateLoan($loan, $adminNote ?: 'Prêt approuvé par admin.');
        });
    }

    public function activateLoan(ResellerLoan $loan, string $reason): ResellerLoan
    {
        $partner = ResellerPartner::query()->lockForUpdate()->findOrFail($loan->reseller_partner_id);
        $wallet = ResellerWallet::query()->where('reseller_partner_id', $partner->id)->lockForUpdate()->firstOrFail();

        if (! ($loan->metadata['credited'] ?? false)) {
            $wallet->credit_balance = round((float) $wallet->credit_balance + (float) $loan->principal_amount, 2);
            $wallet->total_borrowed = round((float) $wallet->total_borrowed + (float) $loan->principal_amount, 2);
            $wallet->available_balance = round((float) $wallet->available_balance + (float) $loan->principal_amount, 2);
            $wallet->balance = $wallet->available_balance;
            $wallet->save();
            $this->recordTransaction($partner, $wallet, 'loan_credit', (float) $loan->principal_amount, 'credit', $loan->reference, 'Crédit Prêt Astral.', ['loan_id' => $loan->id]);
            $loan->forceFill(['metadata' => array_merge($loan->metadata ?? [], ['credited' => true])])->save();
            $this->log($partner, 'loan_approved', $reason, ['loan_id' => $loan->id]);
            DB::afterCommit(fn () => app(PendingResellerOrderService::class)->process($partner->fresh()));
        }

        return $loan->fresh();
    }

    public function repayLoan(ResellerPartner $partner, float $amount, string $reference, array $metadata = []): float
    {
        $loan = ResellerLoan::query()
            ->where('reseller_partner_id', $partner->id)
            ->whereIn('status', ['active', 'overdue', 'grace_period', 'defaulted'])
            ->orderBy('id')
            ->lockForUpdate()
            ->first();

        if (! $loan || $amount <= 0) {
            return 0;
        }

        $repayment = min($amount, (float) $loan->remaining_due);
        $loan->amount_repaid = round((float) $loan->amount_repaid + $repayment, 2);
        $loan->remaining_due = max(0, round((float) $loan->remaining_due - $repayment, 2));
        if ((float) $loan->remaining_due <= 0) {
            $loan->status = 'repaid';
            $loan->repaid_at = now();
        }
        $loan->save();

        $wallet = ResellerWallet::query()->where('reseller_partner_id', $partner->id)->lockForUpdate()->firstOrFail();
        $wallet->credit_balance = max(0, round((float) $wallet->credit_balance - min($repayment, (float) $wallet->credit_balance), 2));
        $wallet->total_repaid = round((float) $wallet->total_repaid + $repayment, 2);
        $wallet->save();

        $this->recordTransaction($partner, $wallet, 'loan_repayment', $repayment * -1, 'debit', $reference, 'Remboursement automatique du Prêt Astral.', $metadata + ['loan_id' => $loan->id]);
        $this->log($partner, 'loan_repayment', 'Remboursement automatique du Prêt Astral.', ['loan_id' => $loan->id, 'amount' => $repayment]);

        if ($loan->status === 'repaid') {
            $this->log($partner, 'loan_repaid', 'Prêt Astral remboursé.', ['loan_id' => $loan->id]);
            $this->restoreAfterRepayment($partner);
        }

        return $repayment;
    }

    public function processLoanDeadlines(): int
    {
        $count = 0;
        $now = now();

        ResellerLoan::query()->whereIn('status', ['active', 'overdue', 'grace_period'])->get()->each(function (ResellerLoan $loan) use ($now, &$count) {
            DB::transaction(function () use ($loan, $now, &$count) {
                $loan = ResellerLoan::query()->lockForUpdate()->find($loan->id);
                if (! $loan || (float) $loan->remaining_due <= 0) {
                    return;
                }

                if ($loan->status === 'active' && $loan->due_date && $loan->due_date->lt($now)) {
                    $loan->forceFill(['status' => 'grace_period', 'grace_until' => $loan->grace_until ?: $now->copy()->addDays(2)])->save();
                    $this->log($loan->partner, 'loan_grace_period', 'Grace period activée pour prêt en retard.', ['loan_id' => $loan->id]);
                    $count++;
                }

                if (in_array($loan->status, ['grace_period', 'overdue'], true) && $loan->grace_until && $loan->grace_until->lt($now)) {
                    $loan->forceFill(['status' => 'defaulted'])->save();
                    $this->suspendPartner($loan->partner, 'Prêt Astral non remboursé après délai de grâce.', ['loan_id' => $loan->id]);
                    $count++;
                }
            });
        });

        return $count;
    }

    public function suspendPartner(ResellerPartner $partner, string $reason, array $metadata = []): void
    {
        $partner->forceFill([
            'status' => 'suspended',
            'api_status' => 'suspended',
            'risk_level' => 'blocked',
            'astral_score' => min((int) ($partner->astral_score ?? 900), 399),
            'order_creation_allowed' => false,
        ])->save();

        $wallet = $this->ensureWallet($partner);
        $wallet->forceFill(['wallet_status' => 'frozen'])->save();
        $this->recordTransaction($partner, $wallet, 'api_suspension', 0, 'debit', $this->reference('A4G-SUSP'), $reason, $metadata);
        $this->log($partner, 'api_suspension', $reason, $metadata);
    }

    public function reactivatePartner(ResellerPartner $partner, string $reason): void
    {
        $score = max((int) ($partner->astral_score ?? 700), 650);
        $partner->forceFill([
            'status' => 'active',
            'api_status' => 'active',
            'risk_level' => $this->riskLevel($score),
            'astral_score' => $score,
            'order_creation_allowed' => true,
        ])->save();

        $wallet = $this->ensureWallet($partner);
        $wallet->forceFill(['wallet_status' => 'active'])->save();
        $this->log($partner, 'admin_reactivation', $reason, []);
    }

    public function refreshScore(ResellerPartner $partner): int
    {
        $score = $this->calculateAstralScore($partner);
        $partner->forceFill([
            'astral_score' => $score,
            'risk_level' => $this->riskLevel($score),
            'api_status' => $score < 400 ? 'suspended' : ($partner->api_status ?: 'active'),
            'order_creation_allowed' => $score >= 400 && ($partner->order_creation_allowed ?? true),
        ])->save();

        if ($score < 400) {
            $this->suspendPartner($partner, 'Score Astral bloqué.', ['score' => $score]);
        }

        return $score;
    }

    public function calculateAstralScore(ResellerPartner $partner): int
    {
        $partner->loadMissing(['wallet', 'orders', 'loans', 'scoreEvents']);
        $score = 700;
        $wallet = $partner->wallet;
        $ordersCount = $partner->orders()->count();
        $failedOrders = $partner->orders()->whereIn('status', ['failed', 'cancelled', 'refused'])->count();
        $repaidLoans = $partner->loans()->where('status', 'repaid')->count();
        $badLoans = $partner->loans()->whereIn('status', ['overdue', 'grace_period', 'defaulted'])->count();
        $manualEvents = $partner->scoreEvents()->sum('points');

        $score += min(120, $ordersCount * 2);
        $score += min(80, (int) ((float) ($wallet?->total_recharged ?? 0) / 25));
        $score += min(80, $repaidLoans * 30);
        $score -= min(180, $failedOrders * 20);
        $score -= min(300, $badLoans * 120);

        if ($wallet && (float) $wallet->available_balance <= 0) {
            $score -= 25;
        }
        if ($partner->created_at && $partner->created_at->lt(now()->subMonths(3))) {
            $score += 40;
        }

        $score += (int) $manualEvents;

        return max(0, min(1000, $score));
    }

    public function riskLevel(int $score): string
    {
        return match (true) {
            $score >= 900 => 'excellent',
            $score >= 750 => 'very_good',
            $score >= 600 => 'medium',
            $score >= 400 => 'risky',
            default => 'blocked',
        };
    }

    public function loanLimit(ResellerPartner $partner): float
    {
        $metadata = $partner->metadata ?? [];
        if (isset($metadata['loan_limit_override'])) {
            return (float) $metadata['loan_limit_override'];
        }
        if ((int) ($partner->astral_score ?? 900) >= 900) {
            return 100;
        }
        if ($partner->created_at && $partner->created_at->gt(now()->subDays(30))) {
            return 20;
        }

        return 50;
    }

    public function nextLoanDueDate(): Carbon
    {
        $now = now();
        $date = $now->copy()->setTime(9, 0, 0);

        while ($date->dayOfWeek !== Carbon::SATURDAY || $date->lessThanOrEqualTo($now)) {
            $date->addDay()->setTime(9, 0, 0);
        }

        return $date;
    }

    public function addScoreAdjustment(ResellerPartner $partner, int $points, string $reason, ?int $adminId = null): void
    {
        ResellerPartnerScoreEvent::create([
            'reseller_partner_id' => $partner->id,
            'type' => $points >= 0 ? 'bonus' : 'malus',
            'points' => $points,
            'reason' => $reason,
            'admin_id' => $adminId,
        ]);
        $this->log($partner, 'score_adjustment', $reason, ['points' => $points]);
        $this->refreshScore($partner);
    }

    public function recordTransaction(ResellerPartner $partner, ResellerWallet $wallet, string $type, float $amount, string $direction, string $reference, string $description, array $metadata = []): ResellerWalletTransaction
    {
        return ResellerWalletTransaction::create([
            'reseller_partner_id' => $partner->id,
            'reseller_wallet_id' => $wallet->id,
            'type' => $type,
            'amount' => $amount,
            'direction' => $direction,
            'status' => 'completed',
            'balance_after' => (float) $wallet->available_balance,
            'currency' => $wallet->currency,
            'reference' => $reference,
            'description' => $description,
            'metadata' => $metadata,
        ]);
    }

    public function log(ResellerPartner $partner, string $type, string $description, array $metadata = []): void
    {
        ResellerPartnerLog::create([
            'reseller_partner_id' => $partner->id,
            'type' => $type,
            'description' => $description,
            'metadata' => $metadata,
        ]);
    }

    public function reference(string $prefix): string
    {
        return $prefix.'-'.now()->format('YmdHis').'-'.Str::upper(Str::random(6));
    }

    private function creditWalletLocked(ResellerPartner $partner, ResellerWallet $wallet, float $amount, string $type, string $reference, string $description, array $metadata = []): float
    {
        $credited = round($amount, 2);

        if ($credited > 0) {
            $wallet->available_balance = round((float) $wallet->available_balance + $credited, 2);
            $wallet->balance = $wallet->available_balance;
            $wallet->save();
        }

        $this->recordTransaction($partner, $wallet, $type, $credited, 'credit', $reference, $description, $metadata + ['auto_repaid' => 0]);

        return $credited;
    }

    private function restoreAfterRepayment(ResellerPartner $partner): void
    {
        if ($partner->status !== 'suspended') {
            return;
        }

        $hasDefaultedDebt = ResellerLoan::query()
            ->where('reseller_partner_id', $partner->id)
            ->whereIn('status', ['defaulted', 'grace_period', 'overdue'])
            ->where('remaining_due', '>', 0)
            ->exists();

        if (! $hasDefaultedDebt) {
            $this->reactivatePartner($partner, 'Réactivation automatique après remboursement complet.');
        }
    }
}
