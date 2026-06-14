<?php

namespace App\Console\Commands;

use App\Services\Suppliers\FazerCardsCatalogSyncService;
use Illuminate\Console\Command;

class SyncFazerCardsCatalog extends Command
{
    protected $signature = 'nexy:sync-fazercards';

    protected $description = 'Synchronize FazerCards catalog products and orderable offers into the local shop catalog.';

    public function handle(FazerCardsCatalogSyncService $sync): int
    {
        $result = $sync->sync();

        $this->info("Synced {$result['products']} FazerCards products and {$result['variations']} offers.");
        $this->line("Top-ups: {$result['topups']} | Gift cards: {$result['giftcards']} | Game keys: {$result['gamekeys']} | Manual services: {$result['manual_services']}");

        return self::SUCCESS;
    }
}
