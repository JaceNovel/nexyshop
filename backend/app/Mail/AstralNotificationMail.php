<?php

namespace App\Mail;

use App\Models\MailMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AstralNotificationMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(public MailMessage $messageRecord)
    {
    }

    public function build(): self
    {
        return $this
            ->subject($this->messageRecord->subject)
            ->view('emails.astral-notification')
            ->with(['messageRecord' => $this->messageRecord]);
    }
}
