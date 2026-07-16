<?php

namespace App\Console\Commands;

use App\Models\ResellerPartner;
use App\Services\Reseller\ResellerApiSubscriptionService;
use Illuminate\Console\Command;

class ChargeResellerApiSubscriptions extends Command
{
    protected $signature = 'reseller:charge-api-subscriptions {--partner= : Charge a specific partner id}';

    protected $description = 'Charge monthly Astral API subscription fees for reseller partners.';

    public function handle(ResellerApiSubscriptionService $subscriptions): int
    {
        $query = ResellerPartner::query()->with('wallet')->where('status', 'active');

        if ($partnerId = $this->option('partner')) {
            $query->whereKey($partnerId);
        }

        $charged = 0;
        $skipped = 0;

        $query->each(function (ResellerPartner $partner) use ($subscriptions, &$charged, &$skipped) {
            if ($subscriptions->isExempt($partner)) {
                $skipped++;
                $this->line('Exempt: '.$partner->company_name.' (#'.$partner->id.')');

                return;
            }

            $subscription = $subscriptions->ensureCurrentMonth($partner);
            $charged++;
            $this->line('Subscription '.$subscription?->status.': '.$partner->company_name.' (#'.$partner->id.')');
        });

        $this->info("Processed {$charged} partner(s), skipped {$skipped} exempt partner(s).");

        return self::SUCCESS;
    }
}
