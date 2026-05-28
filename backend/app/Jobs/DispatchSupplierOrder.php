<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\Supplier;
use App\Models\SupplierOrder;
use App\Services\Suppliers\SupplierManager;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class DispatchSupplierOrder implements ShouldQueue
{
    use Queueable;

    public function __construct(public Order $order)
    {
    }

    public function handle(SupplierManager $manager): void
    {
        $supplier = Supplier::whereActive(true)->orderBy('priority')->firstOrFail();
        $response = $manager->gateway($supplier)->createOrder([
            'order_id' => $this->order->id,
            'product_id' => $this->order->product_id,
            'variation_id' => $this->order->metadata['variation_id'] ?? null,
            'uid' => $this->order->game_uid,
            'nickname' => $this->order->nickname,
        ]);

        SupplierOrder::create([
            'order_id' => $this->order->id,
            'supplier_id' => $supplier->id,
            'external_id' => $response['id'] ?? null,
            'status' => $response['status'] ?? 'processing',
            'payload' => $this->order->toArray(),
            'response' => $response,
        ]);
    }
}
