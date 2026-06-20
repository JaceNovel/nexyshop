<?php

use App\Models\Product;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Product::query()
            ->where('metadata->supplier', 'item4gamer')
            ->where('currency', 'XOF')
            ->lazyById()
            ->each(function (Product $product): void {
                $product->forceFill(['currency' => 'USD'])->save();
            });

        $supplierId = Supplier::query()
            ->where('slug', 'item4gamer')
            ->value('id');

        if (! $supplierId) {
            return;
        }

        SupplierProduct::query()
            ->where('supplier_id', $supplierId)
            ->where('metadata->currency', 'XOF')
            ->lazyById()
            ->each(function (SupplierProduct $supplierProduct): void {
                $metadata = $supplierProduct->metadata ?? [];
                $metadata['currency'] = 'USD';

                $supplierProduct->forceFill(['metadata' => $metadata])->save();
            });
    }

    public function down(): void
    {
    }
};