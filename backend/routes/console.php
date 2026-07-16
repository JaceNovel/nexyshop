<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('nexy:status', function () {
    $this->info('NEXY backend ready.');
});

if (config('services.google.merchant.sync_enabled')) {
    Schedule::command('google:merchant-sync')
        ->dailyAt((string) config('services.google.merchant.sync_schedule', '03:20'))
        ->withoutOverlapping();
}

Schedule::command('reseller:process-wallet-finance')
    ->hourly()
    ->withoutOverlapping();

Schedule::command('kucoin:sync-deposits')
    ->everyFiveMinutes()
    ->withoutOverlapping();
