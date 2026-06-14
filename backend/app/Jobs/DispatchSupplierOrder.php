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
        $supplierSlug = $this->order->metadata['supplier'] ?? null;
        $supplier = Supplier::query()
            ->whereActive(true)
            ->when($supplierSlug, fn ($query) => $query->where('slug', $supplierSlug))
            ->orderBy('priority')
            ->firstOrFail();
        $response = $manager->gateway($supplier)->createOrder([
            'order_id' => $this->order->id,
            'product_id' => $this->order->product_id,
            'variation_id' => $this->order->metadata['variation_id'] ?? null,
            'quantity' => $this->order->metadata['quantity'] ?? 1,
            'uid' => $this->order->game_uid,
            'nickname' => $this->order->nickname,
            'customer' => $this->order->metadata['customer'] ?? null,
            'supplier_fields' => $this->order->metadata['supplier_fields'] ?? [],
            'data' => [
                'user_id' => $this->order->game_uid,
                'player_id' => $this->order->game_uid,
                'player_name' => $this->order->nickname,
                'nickname' => $this->order->nickname,
                'email' => $this->order->metadata['customer']['email'] ?? null,
            ],
        ]);
        $responseData = $response['data'] ?? $response;

        SupplierOrder::create([
            'order_id' => $this->order->id,
            'supplier_id' => $supplier->id,
            'external_id' => $responseData['order_id'] ?? $responseData['id'] ?? null,
            'status' => is_numeric($responseData['status'] ?? null) ? 'processing' : ($responseData['status'] ?? 'processing'),
            'payload' => $this->order->toArray(),
            'response' => $response,
        ]);
    }
}
