<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AstralNotificationService;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    public function promotion(Request $request, AstralNotificationService $notifications)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'message' => ['required', 'string', 'max:1000'],
            'url' => ['nullable', 'string', 'max:500'],
            'email_users' => ['nullable', 'boolean'],
            'discount_code' => ['nullable', 'string', 'max:80'],
            'image_url' => ['nullable', 'url'],
        ]);

        $url = $data['url'] ?? '/category/top-up';

        $notifications->broadcast([
            'channel' => 'bell',
            'type' => 'announcement',
            'title' => $data['title'],
            'body' => $data['message'],
            'url' => $url,
            'action_label' => 'Voir l offre',
            'action_url' => str_starts_with($url, 'http') ? $url : rtrim((string) config('services.google.frontend_url'), '/').$url,
            'data' => [
                'discount_code' => $data['discount_code'] ?? null,
                'image_url' => $data['image_url'] ?? null,
            ],
        ], (bool) ($data['email_users'] ?? true));

        return response()->json(['message' => 'Promotion envoyee.']);
    }
}
