<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Product::query()->updateOrCreate(
            ['sku' => 'CODM-MOBILE-GLOBAL-MANUAL'],
            [
                'name' => 'Codm mobile (Global)',
                'game' => 'Call of Duty Mobile',
                'price' => 3000,
                'currency' => 'XOF',
                'active' => true,
                'metadata' => [
                    'category' => 'Services manuels',
                    'category_slug' => 'manual-services',
                    'type' => 'manual-service',
                    'description' => 'Recharge manuelle CODM Global. Après paiement, Astral4Gamer reçoit tes identifiants en privé puis traite la recharge avant confirmation.',
                    'image_url' => 'https://media.rawg.io/media/resize/900/-/screenshots/b59/b59e44204d8af92133ea0b67af45a04c_hS4tgMe.jpg',
                    'delivery' => 'manual',
                    'requires_uid' => true,
                    'manual_fulfillment' => true,
                    'permalink' => 'codm',
                    'required_fields' => [
                        ['key' => 'email', 'label' => 'Email', 'type' => 'email'],
                        ['key' => 'password', 'label' => 'Password', 'type' => 'password'],
                        ['key' => 'player_name', 'label' => 'Player Name', 'type' => 'text'],
                        [
                            'key' => 'platform',
                            'label' => 'Platform',
                            'type' => 'select',
                            'options' => [
                                ['label' => 'Activision', 'value' => 'activision'],
                                ['label' => 'Facebook', 'value' => 'facebook'],
                                ['label' => 'Google', 'value' => 'google'],
                                ['label' => 'Apple', 'value' => 'apple'],
                            ],
                        ],
                    ],
                ],
            ]
        );
    }

    public function down(): void
    {
        Product::query()->where('sku', 'CODM-MOBILE-GLOBAL-MANUAL')->delete();
    }
};