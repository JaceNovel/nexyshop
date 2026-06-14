<?php

namespace App\Services;

use App\Mail\AstralNotificationMail;
use App\Models\MailMessage;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AstralNotificationService
{
    public function notifyUser(User $user, array $payload): MailMessage
    {
        $notification = UserNotification::create([
            'user_id' => $user->id,
            'channel' => $payload['channel'] ?? 'mail',
            'type' => $payload['type'],
            'title' => $payload['title'],
            'body' => $payload['body'] ?? $payload['preview'] ?? null,
            'url' => $payload['url'] ?? $payload['action_url'] ?? null,
            'data' => $payload['data'] ?? null,
        ]);

        $message = MailMessage::create([
            'user_id' => $user->id,
            'type' => $payload['type'],
            'subject' => $payload['subject'] ?? $payload['title'],
            'preview' => $payload['preview'] ?? $payload['body'] ?? null,
            'action_label' => $payload['action_label'] ?? 'Voir le message',
            'action_url' => $payload['action_url'] ?? $payload['url'] ?? null,
            'data' => ['notification_id' => $notification->id, ...($payload['data'] ?? [])],
        ]);

        $this->sendMail($user, $message);

        return $message;
    }

    public function broadcast(array $payload, bool $emailUsers = false): void
    {
        UserNotification::create([
            'channel' => $payload['channel'] ?? 'bell',
            'type' => $payload['type'],
            'title' => $payload['title'],
            'body' => $payload['body'] ?? $payload['preview'] ?? null,
            'url' => $payload['url'] ?? $payload['action_url'] ?? null,
            'data' => $payload['data'] ?? null,
        ]);

        if (! $emailUsers) {
            return;
        }

        $this->eligibleUsers()->chunk(100, function (Collection $users) use ($payload) {
            foreach ($users as $user) {
                $this->notifyUser($user, [
                    ...$payload,
                    'channel' => 'mail',
                    'action_label' => $payload['action_label'] ?? 'Voir sur Astral4Gamer',
                ]);
            }
        });
    }

    private function eligibleUsers()
    {
        return User::query()
            ->whereNotNull('email')
            ->where('email', '!=', '');
    }

    private function sendMail(User $user, MailMessage $message): void
    {
        try {
            Mail::to($user->email)->send(new AstralNotificationMail($message));
            $message->update(['sent_at' => now()]);
        } catch (\Throwable $exception) {
            Log::warning('Astral notification mail failed', [
                'user_id' => $user->id,
                'mail_message_id' => $message->id,
                'message' => $exception->getMessage(),
            ]);
        }
    }
}
