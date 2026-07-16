<?php

namespace App\Console\Commands;

use App\Services\GoogleMerchantSyncService;
use Illuminate\Console\Command;
use Throwable;

class GrantGoogleMerchantDeveloperAccess extends Command
{
    protected $signature = 'google:merchant-grant-developer {email : Verified Merchant Center user email}';

    protected $description = 'Grant ADMIN and API_DEVELOPER roles to a verified Merchant Center user.';

    public function handle(GoogleMerchantSyncService $merchant): int
    {
        try {
            $payload = $merchant->grantDeveloperAccess((string) $this->argument('email'));
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info('Rôle API_DEVELOPER attribué à l’utilisateur Merchant.');
        $this->line(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        return self::SUCCESS;
    }
}