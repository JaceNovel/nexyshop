<?php

namespace App\Console\Commands;

use App\Jobs\DispatchSupplierOrder;
use App\Models\Order;
use App\Models\SupplierOrder;
use Illuminate\Console\Command;
use Illuminate\Contracts\Bus\Dispatcher as BusDispatcher;
use Throwable;

class FulfillPaidSupplierOrders extends Command
{
    protected $signature = 'nexy:fulfill-paid-orders {--limit=50}';

    protected $description = 'Send paid shop orders that have not yet been dispatched to the supplier.';

    public function handle(BusDispatcher $bus): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $processed = 0;
        $failed = 0;

        $orders = Order::query()
            ->where('status', 'paid')
            ->whereNotIn('id', SupplierOrder::query()->select('order_id'))
            ->latest()
            ->limit($limit)
            ->get();

        if ($orders->isEmpty()) {
            $this->info('No paid supplier orders waiting for fulfillment.');
            return self::SUCCESS;
        }

        foreach ($orders as $order) {
            if (! empty($order->metadata['manual_fulfillment'])) {
                continue;
            }

            try {
                $bus->dispatchSync(new DispatchSupplierOrder($order));
                $processed++;
                $this->info("Dispatched order #{$order->id} to supplier.");
            } catch (Throwable $exception) {
                $failed++;
                report($exception);
                $this->error("Order #{$order->id} failed: {$exception->getMessage()}");
            }
        }

        $this->line("Processed: {$processed} | Failed: {$failed}");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
