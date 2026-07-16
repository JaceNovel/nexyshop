<?php

namespace App\Console\Commands;

use App\Services\GoogleMerchantSyncService;
use Illuminate\Console\Command;
use Throwable;

class UnregisterGoogleMerchantDeveloper extends Command
{
    protected $signature = 'google:merchant-unregister';

    protected $description = 'Unregister the authenticated Google Cloud project from Google Merchant API.';

    public function handle(GoogleMerchantSyncService $merchant): int
    {
        try {
            $payload = $merchant->unregisterDeveloper();
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info('Projet Google Cloud désenregistré de Merchant API.');
        $this->line(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        return self::SUCCESS;
    }
}