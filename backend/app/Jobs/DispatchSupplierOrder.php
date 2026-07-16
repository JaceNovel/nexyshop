<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\ResellerOrder;
use App\Models\Supplier;
use App\Models\SupplierOrder;
use App\Services\CustomerWalletRefundService;
use App\Services\Reseller\ResellerWalletService;
use App\Services\Suppliers\SupplierManager;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Throwable;

class DispatchSupplierOrder implements ShouldQueue
{
    use Queueable;

    public function __construct(public Order $order)
    {
    }

    public function handle(SupplierManager $manager): void
    {
        if (! empty($this->order->metadata['manual_fulfillment'])) {
            return;
        }

        $supplierSlug = $this->order->metadata['supplier'] ?? null;
        $supplier = Supplier::query()
            ->whereActive(true)
            ->when($supplierSlug, fn ($query) => $query->where('slug', $supplierSlug))
            ->orderBy('priority')
            ->firstOrFail();
        $gateway = $manager->gateway($supplier);
        $payload = [
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
        ];

        try {
            $response = $gateway->createOrder($payload);
        } catch (Throwable $exception) {
            $this->markSupplierFailure($supplier, $payload, ['error' => $exception->getMessage()]);

            return;
        }
        $responseData = $response['data'] ?? $response['order'] ?? $response;
        $externalId = $responseData['order_id'] ?? $responseData['id'] ?? data_get($response, 'order.id');
        $fullResponse = $response;

        if ($externalId) {
            try {
                $fullResponse = [
                    'create' => $response,
                    'order' => $gateway->getOrder($externalId),
                ];
            } catch (\Throwable) {
                $fullResponse = $response;
            }
        }

        $supplierOrder = SupplierOrder::create([
            'order_id' => $this->order->id,
            'supplier_id' => $supplier->id,
            'external_id' => $externalId,
            'status' => $this->supplierStatus($responseData, $fullResponse),
            'payload' => $this->order->toArray(),
            'response' => $fullResponse,
        ]);

        $metadata = $this->order->metadata ?? [];
        $metadata['fulfillment_status'] = $supplierOrder->status;
        $metadata['supplier_order_id'] = $supplierOrder->id;
        $metadata['supplier_external_id'] = $supplierOrder->external_id;
        $metadata['supplier_dispatched_at'] = now()->toIso8601String();
        $metadata['delivery_codes'] = $this->extractDeliveryCodes($fullResponse);

        $this->order->forceFill(['metadata' => $metadata])->save();

        if (in_array($supplierOrder->status, ['failed', 'cancelled', 'refund'], true)) {
            $this->markSupplierFailure($supplier, $payload, $fullResponse, $supplierOrder);
        }

        $this->emailDeliveryCodes($metadata['delivery_codes']);
    }

    private function supplierStatus(array $responseData, array $fullResponse): string
    {
        $status = $responseData['status']
            ?? data_get($fullResponse, 'order.status')
            ?? data_get($fullResponse, 'order.order.status')
            ?? data_get($fullResponse, 'create.order.status')
            ?? 'processing';

        return is_numeric($status) ? 'processing' : (string) $status;
    }

    private function markSupplierFailure(Supplier $supplier, array $payload, array $response, ?SupplierOrder $supplierOrder = null): void
    {
        $metadata = $this->order->metadata ?? [];
        $metadata['fulfillment_status'] = 'failed';
        $metadata['supplier_error'] = $this->supplierFailureReason($response);
        $metadata['supplier_failed_at'] = now()->toIso8601String();

        $supplierOrder ??= SupplierOrder::create([
            'order_id' => $this->order->id,
            'supplier_id' => $supplier->id,
            'external_id' => data_get($response, 'order.id') ?? data_get($response, 'create.order.id'),
            'status' => 'failed',
            'payload' => $payload,
            'response' => $response,
        ]);

        $metadata['supplier_order_id'] = $supplierOrder->id;
        $metadata['supplier_external_id'] = $supplierOrder->external_id;

        $this->order->forceFill([
            'status' => 'supplier_failed',
            'metadata' => $metadata,
        ])->save();

        $reason = $metadata['supplier_error'] ?: 'Supplier order failed.';
        app(CustomerWalletRefundService::class)->refundSupplierFailure($this->order->fresh(), $reason);
        $this->refundResellerOrder($reason);
    }

    private function refundResellerOrder(string $reason): void
    {
        $metadata = $this->order->metadata ?? [];

        if (! empty($metadata['reseller_refunded_at'])) {
            return;
        }

        $resellerOrder = ResellerOrder::query()
            ->with('partner')
            ->where('order_id', $this->order->id)
            ->first();

        if (! $resellerOrder || ! $resellerOrder->partner) {
            return;
        }

        app(ResellerWalletService::class)->refundDebit($resellerOrder->partner, (float) $resellerOrder->amount, $resellerOrder->external_reference.'-REFUND', [
            'type' => 'reseller_order_refund',
            'description' => 'Remboursement commande reseller échouée fournisseur.',
            'order_id' => $this->order->id,
            'reseller_order_id' => $resellerOrder->id,
            'reason' => $reason,
        ]);

        $metadata['reseller_refunded_at'] = now()->toIso8601String();
        $metadata['reseller_refund_reason'] = $reason;
        $this->order->forceFill(['metadata' => $metadata])->save();
        $resellerOrder->forceFill(['status' => 'failed'])->save();
    }

    private function supplierFailureReason(array $response): ?string
    {
        return data_get($response, 'error')
            ?? data_get($response, 'order.fail_reason')
            ?? data_get($response, 'order.order.fail_reason')
            ?? data_get($response, 'create.order.fail_reason')
            ?? data_get($response, 'fazercards_webhook.remote.order.fail_reason');
    }

    private function emailDeliveryCodes(array $codes): void
    {
        $email = trim((string) ($this->order->metadata['customer']['email'] ?? ''));

        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL) || empty($codes)) {
            return;
        }

        try {
            $lines = collect($codes)
                ->map(fn (array $item) => '- '.($item['label'] ?? 'Code').' : '.($item['value'] ?? ''))
                ->implode("\n");

            Mail::raw(
                "Bonjour,\n\nTa commande Astral4Gamer #{$this->order->id} est livrée.\n\n{$lines}\n\nGarde ces informations privées.\n\nAstral4Gamer",
                function ($message) use ($email) {
                    $message->to($email)->subject('Ta commande Astral4Gamer est livrée');
                }
            );

            $metadata = $this->order->metadata ?? [];
            $metadata['delivery_email_sent_at'] = now()->toIso8601String();
            $this->order->forceFill(['metadata' => $metadata])->save();
        } catch (\Throwable $exception) {
            report($exception);

            $metadata = $this->order->metadata ?? [];
            $metadata['delivery_email_failed_at'] = now()->toIso8601String();
            $this->order->forceFill(['metadata' => $metadata])->save();
        }
    }

    private function extractDeliveryCodes(array $payload): array
    {
        $codes = [];
        $acceptedKeys = [
            'activation_code',
            'card_code',
            'card_number',
            'cards',
            'claim_code',
            'code',
            'codes',
            'gift_code',
            'license_key',
            'pin',
            'pins',
            'redeem_code',
            'serial',
            'serial_number',
            'serials',
            'voucher',
            'voucher_code',
        ];

        $walk = function (mixed $value, ?string $key = null) use (&$walk, &$codes, $acceptedKeys): void {
            $normalizedKey = strtolower((string) $key);

            if (is_array($value)) {
                foreach ($value as $childKey => $childValue) {
                    $walk($childValue, is_string($childKey) ? $childKey : $key);
                }

                return;
            }

            if (! in_array($normalizedKey, $acceptedKeys, true)) {
                return;
            }

            $code = trim((string) $value);

            if ($code === '' || strlen($code) < 4) {
                return;
            }

            $codes[] = [
                'label' => str_replace('_', ' ', $normalizedKey),
                'value' => $code,
            ];
        };

        $walk($payload);

        return collect($codes)
            ->unique(fn (array $item) => $item['label'].'|'.$item['value'])
            ->values()
            ->all();
    }
}
