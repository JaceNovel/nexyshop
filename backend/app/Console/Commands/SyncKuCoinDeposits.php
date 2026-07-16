<?php

namespace App\Console\Commands;

use App\Services\Payments\CryptoPaymentService;
use Illuminate\Console\Command;

class SyncKuCoinDeposits extends Command
{
    protected $signature = 'kucoin:sync-deposits';
    protected $description = 'Synchronise KuCoin deposits and credits matching Astral4Gamer crypto payment intents.';

    public function handle(CryptoPaymentService $crypto): int
    {
        $credited = $crypto->syncDeposits();
        $this->info("KuCoin deposits synced. Credited intents: {$credited}");

        return self::SUCCESS;
    }
}