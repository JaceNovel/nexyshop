<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
    use Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'is_admin', 'google_id', 'google_avatar_url',
        'steam_id', 'steam_persona_name', 'steam_avatar_url', 'steam_connected_at',
        'google_connected_at', 'last_login_at',
        'username', 'avatar_url', 'country', 'public_profile', 'game', 'player_uid',
        'rank', 'points', 'guild', 'wins', 'tournaments_won', 'kd_ratio', 'badges',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'google_connected_at' => 'datetime',
        'last_login_at' => 'datetime',
        'is_admin' => 'boolean',
        'public_profile' => 'boolean',
        'badges' => 'array',
    ];

    public function googleAccounts()
    {
        return $this->hasMany(GoogleAccount::class);
    }

    public function notifications()
    {
        return $this->hasMany(UserNotification::class);
    }

    public function mailMessages()
    {
        return $this->hasMany(MailMessage::class);
    }
}
