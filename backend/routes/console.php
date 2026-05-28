<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('nexy:status', function () {
    $this->info('NEXY backend ready.');
});
