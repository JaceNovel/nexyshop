<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MailMessage;
use Illuminate\Http\Request;

class UserMailboxController extends Controller
{
    public function index(Request $request)
    {
        $messages = MailMessage::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->take(10)
            ->get()
            ->map(fn (MailMessage $message) => [
                'id' => 'mail-'.$message->id,
                'mail_id' => $message->id,
                'source' => 'astral4gamer',
                'type' => $this->typeGroup($message->type),
                'title' => $message->subject,
                'description' => $message->preview,
                'date' => optional($message->created_at)->toIso8601String(),
                'unread' => $message->read_at === null,
                'status' => $message->type,
                'action_url' => $message->action_url,
                'action_label' => $message->action_label,
            ])
            ->all();

        return response()->json([
            'connected' => true,
            'needs_reconnect' => false,
            'unread_count' => collect($messages)->where('unread', true)->count(),
            'messages' => $messages,
        ]);
    }

    public function markRead(Request $request, MailMessage $message)
    {
        abort_unless($message->user_id === $request->user()->id, 403);

        $message->update(['read_at' => now()]);

        return response()->json(['message' => 'Message marque comme lu.']);
    }

    private function typeGroup(string $type): string
    {
        return str_contains($type, 'payment') ? 'payment' : (str_contains($type, 'order') ? 'order' : 'mail');
    }
}
