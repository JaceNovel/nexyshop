<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\Supplier;
use App\Models\SupplierOrder;
use App\Services\Suppliers\SupplierManager;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

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
        $response = $gateway->createOrder([
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
        $externalId = $responseData['order_id'] ?? $responseData['id'] ?? null;
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
            'status' => is_numeric($responseData['status'] ?? null) ? 'processing' : ($responseData['status'] ?? 'processing'),
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
        $this->emailDeliveryCodes($metadata['delivery_codes']);
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
