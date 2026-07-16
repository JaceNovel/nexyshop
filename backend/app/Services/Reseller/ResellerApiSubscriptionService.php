<?php

namespace App\Services\Reseller;

use App\Models\ResellerApiSubscription;
use App\Models\ResellerPartner;
use App\Models\ResellerWallet;
use App\Models\ResellerWalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ResellerApiSubscriptionService
{
    public function isExempt(ResellerPartner $partner): bool
    {
        $metadata = $partner->metadata ?? [];

        if ((bool) Arr::get($metadata, 'api_subscription_exempt')) {
            return true;
        }

        if (strtolower((string) Arr::get($metadata, 'partner_code')) === 'nexy') {
            return true;
        }

        $identity = Str::lower(trim($partner->name.' '.$partner->company_name.' '.$partner->email));

        return str_contains($identity, 'nexy');
    }

    public function ensureCurrentMonth(ResellerPartner $partner, ?Carbon $date = null): ?ResellerApiSubscription
    {
        $date ??= now();

        if ($this->isExempt($partner)) {
            return null;
        }

        if (! $this->billingEnabled($date)) {
            return null;
        }

        $period = $date->copy()->startOfMonth()->toDateString();
        $existing = ResellerApiSubscription::query()
            ->where('reseller_partner_id', $partner->id)
            ->whereDate('period', $period)
            ->first();

        if ($existing) {
            $this->refreshStatus($partner, $existing, $date);

            return $existing->fresh();
        }

        return DB::transaction(function () use ($partner, $date, $period) {
            $partner = ResellerPartner::query()->lockForUpdate()->findOrFail($partner->id);
            $wallet = ResellerWallet::query()->where('reseller_partner_id', $partner->id)->lockForUpdate()->first()
                ?: app(AdvancedResellerWalletService::class)->ensureWallet($partner);
            $wallet->refresh();

            $currency = strtoupper((string) ($wallet->currency ?: 'USD'));
            $amount = $this->amountForCurrency($currency);
            $reference = 'A4G-API-SUB-'.$date->format('Ym').'-P'.$partner->id;
            $newBalance = round((float) $wallet->available_balance - $amount, 2);
            $paid = $newBalance >= 0;
            $graceUntil = $paid ? null : $date->copy()->addDays($this->graceDays());

            $wallet->available_balance = $newBalance;
            $wallet->balance = $newBalance;
            $wallet->total_spent = round((float) $wallet->total_spent + $amount, 2);
            $wallet->save();

            $subscription = ResellerApiSubscription::create([
                'reseller_partner_id' => $partner->id,
                'period' => $period,
                'amount' => $amount,
                'base_amount_xof' => $this->baseAmountXof(),
                'currency' => $currency,
                'status' => $paid ? 'paid' : 'grace',
                'reference' => $reference,
                'charged_at' => $date,
                'due_at' => $date,
                'grace_until' => $graceUntil,
                'paid_at' => $paid ? $date : null,
                'metadata' => [
                    'label' => 'Abonnement API Astral mensuel',
                    'equivalents' => $this->feeEquivalents(),
                    'grace_days' => $this->graceDays(),
                ],
            ]);

            ResellerWalletTransaction::create([
                'reseller_partner_id' => $partner->id,
                'reseller_wallet_id' => $wallet->id,
                'type' => 'api_subscription_fee',
                'amount' => $amount * -1,
                'direction' => 'debit',
                'status' => $paid ? 'completed' : 'grace',
                'description' => 'Abonnement API Astral mensuel '.$date->translatedFormat('F Y').'.',
                'balance_after' => $wallet->available_balance,
                'currency' => $currency,
                'reference' => $reference,
                'metadata' => [
                    'subscription_id' => $subscription->id,
                    'base_amount_xof' => $this->baseAmountXof(),
                    'grace_until' => optional($graceUntil)?->toIso8601String(),
                ],
            ]);

            $metadata = is_array($partner->metadata) ? $partner->metadata : [];
            $metadata['api_subscription'] = $this->subscriptionSummary($subscription);
            $partner->forceFill([
                'metadata' => $metadata,
                'api_status' => $paid ? 'active' : ($partner->api_status ?: 'active'),
            ])->save();

            return $subscription;
        });
    }

    public function refreshStatus(ResellerPartner $partner, ?ResellerApiSubscription $subscription = null, ?Carbon $date = null): ?ResellerApiSubscription
    {
        $date ??= now();
        $subscription ??= $this->currentSubscription($partner, $date);

        if (! $subscription || $this->isExempt($partner)) {
            return $subscription;
        }

        return DB::transaction(function () use ($partner, $subscription, $date) {
            $partner = ResellerPartner::query()->lockForUpdate()->findOrFail($partner->id);
            $subscription = ResellerApiSubscription::query()->lockForUpdate()->findOrFail($subscription->id);
            $wallet = ResellerWallet::query()->where('reseller_partner_id', $partner->id)->lockForUpdate()->first();
            $balance = (float) ($wallet?->available_balance ?? 0);

            if (in_array($subscription->status, ['grace', 'overdue', 'suspended'], true) && $balance >= 0) {
                $subscription->forceFill([
                    'status' => 'paid',
                    'paid_at' => $date,
                    'metadata' => array_merge($subscription->metadata ?? [], ['settled_at' => $date->toIso8601String()]),
                ])->save();

                $partner->forceFill(['api_status' => 'active', 'order_creation_allowed' => true])->save();
            } elseif (in_array($subscription->status, ['grace', 'overdue'], true) && $subscription->grace_until && $date->greaterThan($subscription->grace_until)) {
                $subscription->forceFill([
                    'status' => 'suspended',
                    'suspended_at' => $subscription->suspended_at ?: $date,
                ])->save();

                $partner->forceFill(['api_status' => 'suspended', 'order_creation_allowed' => false])->save();
            } elseif ($subscription->status === 'grace' && $subscription->grace_until && $date->lessThanOrEqualTo($subscription->grace_until)) {
                $partner->forceFill(['api_status' => $partner->api_status === 'suspended' ? 'suspended' : 'active'])->save();
            }

            $metadata = is_array($partner->metadata) ? $partner->metadata : [];
            $metadata['api_subscription'] = $this->subscriptionSummary($subscription->fresh());
            $partner->forceFill(['metadata' => $metadata])->save();

            return $subscription->fresh();
        });
    }

    public function settleFromWallet(ResellerPartner $partner): ?ResellerApiSubscription
    {
        return $this->refreshStatus($partner, $this->currentSubscription($partner));
    }

    public function currentSubscription(ResellerPartner $partner, ?Carbon $date = null): ?ResellerApiSubscription
    {
        $date ??= now();

        return ResellerApiSubscription::query()
            ->where('reseller_partner_id', $partner->id)
            ->whereDate('period', $date->copy()->startOfMonth()->toDateString())
            ->first();
    }

    public function canUsePaidApi(ResellerPartner $partner, Request $request): bool
    {
        if ($this->isExempt($partner) || $this->isAllowedWhenSuspended($request)) {
            return true;
        }

        if (! $this->billingEnabled()) {
            return true;
        }

        $subscription = $this->ensureCurrentMonth($partner);

        return ! $subscription || ! in_array($subscription->status, ['suspended'], true);
    }

    public function isAllowedWhenSuspended(Request $request): bool
    {
        return $request->is('api/reseller/panel*')
            || $request->is('api/reseller/v1/get-balance');
    }

    public function subscriptionPayload(ResellerPartner $partner): array
    {
        if ($this->isExempt($partner)) {
            return [
                'exempt' => true,
                'status' => 'exempt',
                'monthly_fee' => $this->feeEquivalents(),
                'message_fr' => 'Nexy est exempté de l’abonnement API Astral.',
                'message_en' => 'Nexy is exempt from the Astral API subscription.',
            ];
        }

        $subscription = $this->currentSubscription($partner);
        $walletCurrency = strtoupper((string) ($partner->wallet?->currency ?: 'USD'));

        if (! $this->billingEnabled()) {
            return [
                'exempt' => false,
                'status' => 'scheduled',
                'starts_at' => $this->startDate()?->toDateString(),
                'amount' => $this->amountForCurrency($walletCurrency),
                'currency' => $walletCurrency,
                'base_amount_xof' => $this->baseAmountXof(),
                'monthly_fee' => $this->feeEquivalents(),
                'message_fr' => 'L’abonnement API Astral commencera le '.$this->startDate()?->format('d/m/Y').'.',
                'message_en' => 'The Astral API subscription starts on '.$this->startDate()?->toDateString().'.',
            ];
        }

        return [
            'exempt' => false,
            'status' => $subscription?->status ?? 'not_charged',
            'period' => optional($subscription?->period)->toDateString(),
            'amount' => $subscription ? (float) $subscription->amount : $this->amountForCurrency($walletCurrency),
            'currency' => $subscription?->currency ?? $walletCurrency,
            'base_amount_xof' => $this->baseAmountXof(),
            'monthly_fee' => $this->feeEquivalents(),
            'charged_at' => optional($subscription?->charged_at)?->toIso8601String(),
            'due_at' => optional($subscription?->due_at)?->toIso8601String(),
            'grace_until' => optional($subscription?->grace_until)?->toIso8601String(),
            'paid_at' => optional($subscription?->paid_at)?->toIso8601String(),
            'suspended_at' => optional($subscription?->suspended_at)?->toIso8601String(),
            'message_fr' => $this->message($subscription, 'fr'),
            'message_en' => $this->message($subscription, 'en'),
        ];
    }

    public function amountForCurrency(string $currency): float
    {
        return match (strtoupper($currency)) {
            'XOF', 'CFA', 'FCFA' => $this->baseAmountXof(),
            'XAF' => (float) config('services.reseller.api_subscription_fee_xaf', 8000),
            'EUR' => (float) config('services.reseller.api_subscription_fee_eur', 12.2),
            'USD' => (float) config('services.reseller.api_subscription_fee_usd', 13.1),
            default => (float) config('services.reseller.api_subscription_fee_usd', 13.1),
        };
    }

    public function feeEquivalents(): array
    {
        return [
            'XOF' => $this->baseAmountXof(),
            'XAF' => $this->baseAmountXof(),
            'EUR' => (float) config('services.reseller.api_subscription_fee_eur', 12.2),
            'USD' => (float) config('services.reseller.api_subscription_fee_usd', 13.1),
        ];
    }

    public function baseAmountXof(): float
    {
        return (float) config('services.reseller.api_subscription_fee_xof', 8000);
    }

    public function graceDays(): int
    {
        return (int) config('services.reseller.api_subscription_grace_days', 3);
    }

    public function billingEnabled(?Carbon $date = null): bool
    {
        $start = $this->startDate();

        $current = ($date ?? now())->copy()->startOfDay();

        return ! $start || $current->greaterThanOrEqualTo($start);
    }

    public function startDate(): ?Carbon
    {
        $value = config('services.reseller.api_subscription_start_date');

        return $value ? Carbon::parse((string) $value)->startOfDay() : null;
    }

    private function subscriptionSummary(ResellerApiSubscription $subscription): array
    {
        return [
            'id' => $subscription->id,
            'period' => optional($subscription->period)->toDateString(),
            'status' => $subscription->status,
            'amount' => (float) $subscription->amount,
            'currency' => $subscription->currency,
            'grace_until' => optional($subscription->grace_until)?->toIso8601String(),
            'paid_at' => optional($subscription->paid_at)?->toIso8601String(),
            'suspended_at' => optional($subscription->suspended_at)?->toIso8601String(),
        ];
    }

    private function message(?ResellerApiSubscription $subscription, string $language): ?string
    {
        if (! $subscription) {
            return $language === 'en'
                ? 'The Astral API subscription will be charged automatically at the start of the month.'
                : 'L’abonnement API Astral sera prélevé automatiquement au début du mois.';
        }

        if ($subscription->status === 'paid') {
            return $language === 'en'
                ? 'Your Astral API subscription is paid for this month.'
                : 'Votre abonnement API Astral est réglé pour ce mois.';
        }

        if ($subscription->status === 'suspended') {
            return $language === 'en'
                ? 'Your partner account is suspended because the monthly Astral API subscription was not settled. Top up your balance to reactivate access.'
                : 'Votre compte partenaire est suspendu car l’abonnement API Astral mensuel n’a pas été réglé. Rechargez votre solde pour réactiver l’accès.';
        }

        return $language === 'en'
            ? 'Your monthly Astral API subscription is unpaid. You have 3 days to settle it before suspension.'
            : 'Votre abonnement API Astral du mois est impayé. Vous avez 3 jours pour régulariser avant suspension.';
    }
}
