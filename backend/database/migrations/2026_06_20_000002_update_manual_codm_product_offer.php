<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $product = Product::query()->where('sku', 'CODM-MOBILE-GLOBAL-MANUAL')->first();

        if (! $product) {
            return;
        }

        $metadata = $product->metadata ?? [];
        $metadata['image_url'] = 'https://wallpaperaccess.com/full/1470805.jpg';
        $metadata['manual_variations'] = [
            ['variation_id' => 'codm-80cp', 'name' => '80 CP', 'price' => 0.84, 'currency' => 'USD'],
            ['variation_id' => 'codm-160cp', 'name' => '160 CP', 'price' => 1.68, 'currency' => 'USD'],
            ['variation_id' => 'codm-240cp', 'name' => '240 CP', 'price' => 2.52, 'currency' => 'USD'],
            ['variation_id' => 'codm-320cp', 'name' => '320 CP', 'price' => 3.37, 'currency' => 'USD'],
            ['variation_id' => 'codm-420cp', 'name' => '420 CP', 'price' => 4.02, 'currency' => 'USD'],
            ['variation_id' => 'codm-880cp', 'name' => '880 CP', 'price' => 8.05, 'currency' => 'USD'],
            ['variation_id' => 'codm-2400cp', 'name' => '2400 CP', 'price' => 21.00, 'currency' => 'USD'],
            ['variation_id' => 'codm-5000cp', 'name' => '5000 CP', 'price' => 41.00, 'currency' => 'USD'],
            ['variation_id' => 'codm-10800cp', 'name' => '10800 CP', 'price' => 85.05, 'currency' => 'USD'],
        ];

        $product->update([
            'price' => 0.84,
            'currency' => 'USD',
            'metadata' => $metadata,
        ]);
    }

    public function down(): void
    {
        $product = Product::query()->where('sku', 'CODM-MOBILE-GLOBAL-MANUAL')->first();

        if (! $product) {
            return;
        }

        $metadata = $product->metadata ?? [];
        unset($metadata['manual_variations']);
        $metadata['image_url'] = 'https://media.rawg.io/media/resize/900/-/screenshots/b59/b59e44204d8af92133ea0b67af45a04c_hS4tgMe.jpg';

        $product->update([
            'price' => 3000,
            'currency' => 'XOF',
            'metadata' => $metadata,
        ]);
    }
};