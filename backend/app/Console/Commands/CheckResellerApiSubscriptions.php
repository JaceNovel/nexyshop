<?php

namespace App\Console\Commands;

use App\Models\ResellerPartner;
use App\Services\Reseller\ResellerApiSubscriptionService;
use Illuminate\Console\Command;

class CheckResellerApiSubscriptions extends Command
{
    protected $signature = 'reseller:check-api-subscriptions {--partner= : Check a specific partner id}';

    protected $description = 'Check reseller API subscription grace periods and reactivate or suspend partners.';

    public function handle(ResellerApiSubscriptionService $subscriptions): int
    {
        $query = ResellerPartner::query()->with('wallet')->whereIn('status', ['active', 'suspended']);

        if ($partnerId = $this->option('partner')) {
            $query->whereKey($partnerId);
        }

        $checked = 0;

        $query->each(function (ResellerPartner $partner) use ($subscriptions, &$checked) {
            if ($subscriptions->isExempt($partner)) {
                return;
            }

            $subscription = $subscriptions->ensureCurrentMonth($partner);
            $subscription = $subscriptions->refreshStatus($partner, $subscription);
            $checked++;
            $this->line('Checked '.$partner->company_name.' (#'.$partner->id.'): '.($subscription?->status ?? 'none'));
        });

        $this->info("Checked {$checked} partner subscription(s).");

        return self::SUCCESS;
    }
}
