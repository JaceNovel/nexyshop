<?php

namespace App\Console\Commands;

use App\Services\Reseller\AdvancedResellerWalletService;
use Illuminate\Console\Command;

class ProcessResellerWalletFinance extends Command
{
    protected $signature = 'reseller:process-wallet-finance';

    protected $description = 'Credit pending reseller recharges and process Astral loan deadlines.';

    public function handle(AdvancedResellerWalletService $wallets): int
    {
        $credited = $wallets->creditDuePendingRecharges();
        $deadlines = $wallets->processLoanDeadlines();

        $this->info("Pending recharges credited: {$credited}");
        $this->info("Loan deadline updates: {$deadlines}");

        return self::SUCCESS;
    }
}
