<?php

namespace App\Console\Commands;

use App\Services\GoogleMerchantSyncService;
use Illuminate\Console\Command;
use Throwable;

class RegisterGoogleMerchantDeveloper extends Command
{
    protected $signature = 'google:merchant-register {developer_email : Google account email to receive Merchant API developer notifications}';

    protected $description = 'Register the authenticated Google Cloud project with Google Merchant API.';

    public function handle(GoogleMerchantSyncService $merchant): int
    {
        try {
            $payload = $merchant->registerDeveloper((string) $this->argument('developer_email'));
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info('Projet Google Cloud enregistré pour Merchant API.');
        $this->line(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        return self::SUCCESS;
    }
}