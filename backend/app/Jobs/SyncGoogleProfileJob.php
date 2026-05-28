<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\GooglePeopleService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncGoogleProfileJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public function __construct(private readonly int $userId)
    {
    }

    public function handle(GooglePeopleService $google): void
    {
        $user = User::findOrFail($this->userId);
        $token = $google->refreshTokenIfNeeded($user);

        if (! $token) {
            return;
        }

        $profile = $google->getUserProfile($token);
        $google->createOrUpdateUser($profile);
    }
}
