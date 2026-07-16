<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ResellerLoan;
use App\Models\ResellerPartner;
use App\Models\ResellerPartnerLog;
use App\Models\ResellerPartnerScoreEvent;
use App\Models\ResellerRecharge;
use App\Models\ResellerWalletTransaction;
use App\Services\Reseller\AdvancedResellerWalletService;
use App\Services\Reseller\ResellerWalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminPartnerFinanceController extends Controller
{
    public function wallets(AdvancedResellerWalletService $wallets)
    {
        return [
            'data' => ResellerPartner::query()
                ->with(['wallet', 'loans' => fn ($query) => $query->latest()->limit(1), 'recharges' => fn ($query) => $query->latest()->limit(1)])
                ->latest()
                ->paginate(60)
                ->through(fn (ResellerPartner $partner) => $this->partnerPayload($partner, $wallets)),
            'summary' => $this->summary(),
        ];
    }

    public function recharges()
    {
        return ResellerRecharge::query()
            ->with('partner:id,name,company_name,email')
            ->latest()
            ->paginate(80);
    }

    public function loans()
    {
        return ResellerLoan::query()
            ->with('partner:id,name,company_name,email,status,api_status,risk_level,astral_score')
            ->latest()
            ->paginate(80);
    }

    public function scores(AdvancedResellerWalletService $wallets)
    {
        return [
            'data' => ResellerPartner::query()
                ->with(['wallet', 'scoreEvents' => fn ($query) => $query->latest()->limit(8)])
                ->latest('astral_score')
                ->paginate(80)
                ->through(fn (ResellerPartner $partner) => $this->partnerPayload($partner, $wallets) + [
                    'score_events' => $partner->scoreEvents->map(fn (ResellerPartnerScoreEvent $event) => [
                        'id' => $event->id,
                        'type' => $event->type,
                        'points' => $event->points,
                        'reason' => $event->reason,
                        'created_at' => optional($event->created_at)?->toIso8601String(),
                    ])->values(),
                ]),
        ];
    }

    public function suspended(AdvancedResellerWalletService $wallets)
    {
        return [
            'data' => ResellerPartner::query()
                ->with(['wallet', 'loans' => fn ($query) => $query->latest()->limit(1), 'logs' => fn ($query) => $query->latest()->limit(6)])
                ->where(function ($query) {
                    $query->where('status', 'suspended')
                        ->orWhere('api_status', 'suspended')
                        ->orWhere('risk_level', 'blocked');
                })
                ->latest()
                ->paginate(80)
                ->through(fn (ResellerPartner $partner) => $this->partnerPayload($partner, $wallets) + [
                    'logs' => $partner->logs->map(fn (ResellerPartnerLog $log) => [
                        'id' => $log->id,
                        'type' => $log->type,
                        'description' => $log->description,
                        'created_at' => optional($log->created_at)?->toIso8601String(),
                    ])->values(),
                ]),
        ];
    }

    public function adjustWallet(Request $request, ResellerPartner $partner, ResellerWalletService $wallets, AdvancedResellerWalletService $advancedWallets)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'not_in:0'],
            'reason' => ['required', 'string', 'min:6', 'max:600'],
        ]);

        $amount = round((float) $data['amount'], 2);
        $reference = $advancedWallets->reference('A4G-ADMIN');
        $metadata = ['type' => 'admin_adjustment', 'description' => $data['reason'], 'admin_id' => optional($request->user())->id];

        if ($amount > 0) {
            $wallets->credit($partner, $amount, $reference, null, $metadata);
        } else {
            $wallets->debit($partner, abs($amount), $reference, $metadata);
        }

        $advancedWallets->log($partner, 'admin_adjustment', $data['reason'], ['amount' => $amount, 'admin_id' => optional($request->user())->id]);

        return ['message' => 'Wallet partenaire ajusté.', 'partner' => $this->partnerPayload($partner->fresh('wallet'), $advancedWallets)];
    }

    public function walletStatus(Request $request, ResellerPartner $partner, AdvancedResellerWalletService $wallets)
    {
        $data = $request->validate([
            'status' => ['required', 'in:active,frozen,suspended'],
            'reason' => ['required', 'string', 'min:6', 'max:600'],
        ]);

        $wallet = $wallets->ensureWallet($partner);
        $wallet->forceFill(['wallet_status' => $data['status']])->save();
        $wallets->log($partner, 'wallet_status', $data['reason'], ['wallet_status' => $data['status']]);

        return ['message' => 'Statut wallet mis à jour.', 'partner' => $this->partnerPayload($partner->fresh('wallet'), $wallets)];
    }

    public function approveLoan(Request $request, ResellerLoan $loan, AdvancedResellerWalletService $wallets)
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:6', 'max:600']]);

        return ['loan' => $wallets->approveLoan($loan, $data['reason'])];
    }

    public function rejectLoan(Request $request, ResellerLoan $loan, AdvancedResellerWalletService $wallets)
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:6', 'max:600']]);
        $loan->forceFill(['status' => 'rejected', 'admin_note' => $data['reason']])->save();
        $wallets->log($loan->partner, 'loan_rejected', $data['reason'], ['loan_id' => $loan->id]);

        return ['loan' => $loan->fresh()];
    }

    public function markLoanRepaid(Request $request, ResellerLoan $loan, AdvancedResellerWalletService $wallets)
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:6', 'max:600']]);
        $loan->forceFill([
            'status' => 'repaid',
            'amount_repaid' => $loan->total_due,
            'remaining_due' => 0,
            'repaid_at' => now(),
            'admin_note' => $data['reason'],
        ])->save();
        $wallets->log($loan->partner, 'loan_repaid_admin', $data['reason'], ['loan_id' => $loan->id]);
        $wallets->refreshScore($loan->partner);

        return ['loan' => $loan->fresh()];
    }

    public function extendLoan(Request $request, ResellerLoan $loan, AdvancedResellerWalletService $wallets)
    {
        $data = $request->validate([
            'due_date' => ['required', 'date'],
            'reason' => ['required', 'string', 'min:6', 'max:600'],
        ]);
        $loan->forceFill([
            'due_date' => $data['due_date'],
            'grace_until' => Carbon::parse($data['due_date'])->addDays(2),
            'admin_note' => $data['reason'],
        ])->save();
        $wallets->log($loan->partner, 'loan_extended', $data['reason'], ['loan_id' => $loan->id, 'due_date' => $data['due_date']]);

        return ['loan' => $loan->fresh()];
    }

    public function scoreAdjustment(Request $request, ResellerPartner $partner, AdvancedResellerWalletService $wallets)
    {
        $data = $request->validate([
            'points' => ['required', 'integer', 'min:-500', 'max:500', 'not_in:0'],
            'reason' => ['required', 'string', 'min:6', 'max:600'],
        ]);

        $wallets->addScoreAdjustment($partner, (int) $data['points'], $data['reason'], optional($request->user())->id);

        return ['partner' => $this->partnerPayload($partner->fresh('wallet'), $wallets)];
    }

    public function reactivate(Request $request, ResellerPartner $partner, AdvancedResellerWalletService $wallets)
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:6', 'max:600']]);
        $wallets->reactivatePartner($partner, $data['reason']);

        return ['partner' => $this->partnerPayload($partner->fresh('wallet'), $wallets)];
    }

    public function finalSuspend(Request $request, ResellerPartner $partner, AdvancedResellerWalletService $wallets)
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:6', 'max:600']]);
        $wallets->suspendPartner($partner, 'Suspension définitive jusqu’à décision admin: '.$data['reason']);

        return ['partner' => $this->partnerPayload($partner->fresh('wallet'), $wallets)];
    }

    public function logs(ResellerPartner $partner)
    {
        return ResellerPartnerLog::query()
            ->where('reseller_partner_id', $partner->id)
            ->latest()
            ->paginate(80);
    }

    private function summary(): array
    {
        return [
            'wallets' => ResellerPartner::count(),
            'available_balance' => (float) \App\Models\ResellerWallet::sum('available_balance'),
            'pending_balance' => (float) \App\Models\ResellerWallet::sum('pending_balance'),
            'active_debt' => (float) ResellerLoan::whereIn('status', ['active', 'overdue', 'grace_period', 'defaulted'])->sum('remaining_due'),
            'express_fees' => (float) ResellerRecharge::where('is_express', true)->sum('fee'),
        ];
    }

    private function partnerPayload(ResellerPartner $partner, AdvancedResellerWalletService $wallets): array
    {
        $wallet = $wallets->ensureWallet($partner);
        $loan = $partner->loans->first() ?? ResellerLoan::where('reseller_partner_id', $partner->id)->latest()->first();
        $lastRecharge = $partner->recharges->first() ?? ResellerRecharge::where('reseller_partner_id', $partner->id)->latest()->first();

        return [
            'id' => $partner->id,
            'name' => $partner->name,
            'company_name' => $partner->company_name,
            'email' => $partner->email,
            'status' => $partner->status,
            'api_status' => $partner->api_status ?? 'active',
            'risk_level' => $partner->risk_level ?? 'excellent',
            'astral_score' => (int) ($partner->astral_score ?? 900),
            'order_creation_allowed' => (bool) ($partner->order_creation_allowed ?? true),
            'minimum_topup' => (float) $partner->minimum_topup,
            'wallet' => [
                'balance' => (float) $wallet->balance,
                'available_balance' => (float) $wallet->available_balance,
                'pending_balance' => (float) $wallet->pending_balance,
                'credit_balance' => (float) $wallet->credit_balance,
                'total_recharged' => (float) $wallet->total_recharged,
                'total_spent' => (float) $wallet->total_spent,
                'total_borrowed' => (float) $wallet->total_borrowed,
                'total_repaid' => (float) $wallet->total_repaid,
                'total_fees_paid' => (float) $wallet->total_fees_paid,
                'currency' => $wallet->currency,
                'wallet_status' => $wallet->wallet_status,
            ],
            'loan' => $loan ? [
                'id' => $loan->id,
                'reference' => $loan->reference,
                'principal_amount' => (float) $loan->principal_amount,
                'total_due' => (float) $loan->total_due,
                'remaining_due' => (float) $loan->remaining_due,
                'status' => $loan->status,
                'due_date' => optional($loan->due_date)?->toIso8601String(),
                'grace_until' => optional($loan->grace_until)?->toIso8601String(),
            ] : null,
            'last_recharge' => $lastRecharge ? [
                'id' => $lastRecharge->id,
                'type' => $lastRecharge->recharge_type,
                'amount' => (float) $lastRecharge->amount,
                'fee' => (float) $lastRecharge->fee,
                'status' => $lastRecharge->status,
                'created_at' => optional($lastRecharge->created_at)?->toIso8601String(),
            ] : null,
        ];
    }
}
