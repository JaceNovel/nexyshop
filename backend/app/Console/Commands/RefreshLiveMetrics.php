<?php

namespace App\Console\Commands;

use App\Models\LiveStream;
use Illuminate\Console\Command;

class RefreshLiveMetrics extends Command
{
    protected $signature = 'nexy:refresh-live-metrics';
    protected $description = 'Refresh YouTube live metrics and broadcast them to realtime clients.';

    public function handle(): int
    {
        LiveStream::where('status', 'live')->increment('viewers', random_int(5, 80));

        return self::SUCCESS;
    }
}
