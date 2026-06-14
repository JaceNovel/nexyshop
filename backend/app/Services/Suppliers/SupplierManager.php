<?php

namespace App\Services\Suppliers;

use App\Models\Supplier;

class SupplierManager
{
    public function gateway(Supplier $supplier): SupplierGateway
    {
        return match ($supplier->slug) {
            'fazercards' => new FazerCardsGateway(config('services.suppliers.fazercards.base_url'), config('services.suppliers.fazercards.key')),
            'seagm' => new SeagmGateway($supplier->base_url, config('services.suppliers.seagm.key')),
            'unipin' => new UnipinGateway($supplier->base_url, config('services.suppliers.unipin.key')),
            default => new Item4GamerGateway(config('services.suppliers.item4gamer.base_url'), config('services.suppliers.item4gamer.key')),
        };
    }
}
