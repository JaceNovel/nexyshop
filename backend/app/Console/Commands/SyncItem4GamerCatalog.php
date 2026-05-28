<?php

namespace App\Console\Commands;

use App\Services\Suppliers\Item4GamerCatalogSyncService;
use Illuminate\Console\Command;

class SyncItem4GamerCatalog extends Command
{
    protected $signature = 'nexy:sync-item4gamer {--keep-demo : Keep existing demo products active}';
    protected $description = 'Synchronize real Item4Gamer products and variations into the local catalog.';

    public function handle(Item4GamerCatalogSyncService $sync): int
    {
        if (! config('services.suppliers.item4gamer.key')) {
            $this->error('ITEM4GAMER_KEY is missing in .env.');

            return self::FAILURE;
        }

        $result = $sync->sync(replaceDemoProducts: ! $this->option('keep-demo'));

        $this->info("Synced {$result['products']} products and {$result['variations']} variations from Item4Gamer.");

        return self::SUCCESS;
    }
}
