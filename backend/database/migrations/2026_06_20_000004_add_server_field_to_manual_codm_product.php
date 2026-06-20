<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Product::query()
            ->where('sku', 'CODM-MOBILE-GLOBAL-MANUAL')
            ->lazyById()
            ->each(function (Product $product): void {
                $metadata = $product->metadata ?? [];
                $existingFields = collect($metadata['required_fields'] ?? [])
                    ->reject(fn ($field) => ($field['key'] ?? null) === 'server')
                    ->values();

                $serverField = [
                    'key' => 'server',
                    'label' => 'Server',
                    'type' => 'select',
                    'options' => [
                        ['label' => 'Global', 'value' => 'global'],
                        ['label' => 'Garena', 'value' => 'garena'],
                        ['label' => 'Vietnam', 'value' => 'vietnam'],
                        ['label' => 'Taiwan / Korea', 'value' => 'taiwan-korea'],
                    ],
                ];

                $fields = [];
                $serverInserted = false;

                foreach ($existingFields as $field) {
                    if (! $serverInserted && ($field['key'] ?? null) === 'player_name') {
                        $fields[] = $serverField;
                        $serverInserted = true;
                    }

                    $fields[] = $field;
                }

                if (! $serverInserted) {
                    $fields[] = $serverField;
                }

                $metadata['required_fields'] = $fields;
                $metadata['description'] = 'Recharge manuelle CODM. Choisis ton pack, ton serveur, renseigne tes identifiants puis finalise le paiement sur Astral4Gamer.';

                $product->forceFill(['metadata' => $metadata])->save();
            });
    }

    public function down(): void
    {
        Product::query()
            ->where('sku', 'CODM-MOBILE-GLOBAL-MANUAL')
            ->lazyById()
            ->each(function (Product $product): void {
                $metadata = $product->metadata ?? [];
                $metadata['required_fields'] = collect($metadata['required_fields'] ?? [])
                    ->reject(fn ($field) => ($field['key'] ?? null) === 'server')
                    ->values()
                    ->all();

                $product->forceFill(['metadata' => $metadata])->save();
            });
    }
};