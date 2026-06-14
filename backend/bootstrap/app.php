<?php

use App\Http\Middleware\VerifySignedWebhook;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        __DIR__.'/../app/Console/Commands',
    ])
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'signed.webhook' => VerifySignedWebhook::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule) {
        $schedule->command('nexy:refresh-live-metrics')->everyMinute();
        $schedule->command('nexy:sync-item4gamer')->everySixHours()->withoutOverlapping();
        $schedule->command('nexy:daily-shop-promotions')->dailyAt('10:00')->withoutOverlapping();
        $schedule->command('nexy:discord-community-calendar')->weeklyOn(1, '09:00')->withoutOverlapping();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->create();
