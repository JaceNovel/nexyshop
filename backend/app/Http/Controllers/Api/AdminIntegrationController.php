<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiLog;
use App\Models\BlogPost;
use App\Models\GoogleAccount;
use Illuminate\Support\Facades\Schema;

class AdminIntegrationController extends Controller
{
    public function google()
    {
        $googleAccount = GoogleAccount::query()->latest()->first();
        $lastError = ApiLog::query()
            ->whereIn('service', ['google', 'blogger'])
            ->where('status_code', '>=', 400)
            ->latest()
            ->first();

        return response()->json([
            'google_people_connected' => (bool) $googleAccount,
            'blogger_connected' => (bool) ($googleAccount && in_array('https://www.googleapis.com/auth/blogger', $googleAccount->scopes ?? [], true)),
            'blog_id_configured' => filled(config('services.blogger.blog_id')),
            'blog_id' => config('services.blogger.blog_id'),
            'last_sync_at' => $googleAccount?->updated_at,
            'last_error' => $lastError,
        ]);
    }

    public function blog()
    {
        return response()->json([
            'drafts' => BlogPost::where('status', 'draft')->count(),
            'published' => BlogPost::where('status', 'published')->count(),
            'failed' => BlogPost::where('status', 'failed')->count(),
            'blog_table_ready' => Schema::hasTable('blog_posts'),
        ]);
    }
}
