<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $adminEmail = (string) env('ADMIN_PANEL_EMAIL', 'adminpanel@astral.com');
        $adminPassword = (string) env('ADMIN_PANEL_PASSWORD');

        if (! $adminPassword) {
            throw ValidationException::withMessages([
                'email' => ['ADMIN_PANEL_PASSWORD n est pas configure dans le .env serveur.'],
            ]);
        }

        if (
            strtolower($data['email']) !== strtolower($adminEmail)
            || ! hash_equals($adminPassword, $data['password'])
        ) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants admin incorrects.'],
            ]);
        }

        $admin = User::query()->updateOrCreate(
            ['email' => $adminEmail],
            [
                'name' => 'Admin Astral',
                'username' => 'admin-astral',
                'password' => Hash::make($adminPassword),
                'is_admin' => true,
                'last_login_at' => now(),
            ]
        );

        $admin->tokens()->where('name', 'admin-panel')->delete();

        return response()->json([
            'token' => $admin->createToken('admin-panel')->plainTextToken,
            'user' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'is_admin' => $admin->is_admin,
            ],
        ]);
    }
}
