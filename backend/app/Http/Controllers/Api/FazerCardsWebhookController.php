<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\ResellerOrder;
use App\Models\Supplier;
use App\Models\SupplierOrder;
use App\Services\CustomerWalletRefundService;
use App\Services\Reseller\ResellerWalletService;
use App\Services\Suppliers\SupplierManager;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class FazerCardsWebhookController extends Controller
{
    public function __invoke(Request $request, SupplierManager $manager)
    {
        $this->authorizeWebhook($request);

        $payload = $request->all();
        $externalId = $this->externalId($payload);
        $supplierOrder = $this->findSupplierOrder($payload, $externalId);

        if (! $supplierOrder) {
            Log::info('FazerCards webhook received without local order match.', [
                'external_id' => $externalId,
                'payload' => $payload,
            ]);

            return response()->json(['received' => true, 'matched' => false], 202);
        }

        $remote = $this->fetchRemoteOrder($manager, $externalId ?: $supplierOrder->external_id);
        $canonical = $remote ?: $payload;
        $status = $this->normalizeStatus($canonical, $payload);
        $codes = $this->extractDeliveryCodes(['webhook' => $payload, 'remote' => $remote]);

        $supplierResponse = $supplierOrder->response ?? [];
        $supplierResponse['fazercards_webhook'] = [
            'received_at' => now()->toIso8601String(),
            'payload' => $payload,
            'remote' => $remote,
        ];

        $supplierOrder->forceFill([
            'external_id' => $supplierOrder->external_id ?: $externalId,
            'status' => $status,
            'response' => $supplierResponse,
        ])->save();

        $order = Order::find($supplierOrder->order_id);

        if ($order) {
            $metadata = $order->metadata ?? [];
            $metadata['fulfillment_status'] = $status;
            $metadata['supplier_external_id'] = $supplierOrder->external_id;
            $metadata['supplier_webhook_received_at'] = now()->toIso8601String();
            $metadata['supplier_error'] = $this->supplierFailureReason($canonical, $payload);

            if (! empty($codes)) {
                $metadata['delivery_codes'] = $codes;
                $metadata['delivered_at'] = now()->toIso8601String();
            }

            $orderStatus = match ($status) {
                'delivered' => 'completed',
                'failed', 'cancelled' => 'supplier_failed',
                default => $order->status,
            };

            $order->forceFill([
                'status' => $orderStatus,
                'metadata' => $metadata,
            ])->save();

            if (in_array($status, ['failed', 'cancelled'], true)) {
                $reason = $metadata['supplier_error'] ?: 'Supplier order failed.';
                app(CustomerWalletRefundService::class)->refundSupplierFailure($order->fresh(), $reason);
                $this->refundResellerOrder($order->fresh(), $reason);
            }

            if (! empty($codes)) {
                $this->emailDeliveryCodes($order, $codes);
            }
        }

        return response()->json(['received' => true, 'matched' => true]);
    }

    private function authorizeWebhook(Request $request): void
    {
        $signingSecret = trim((string) config('services.suppliers.fazercards.webhook_signing_secret'));

        if ($signingSecret !== '' && $this->hasValidSignature($request, $signingSecret)) {
            return;
        }

        $expected = trim((string) config('services.suppliers.fazercards.webhook_token'));

        if ($expected === '') {
            abort(503, 'Webhook authentication not configured.');
        }

        $given = trim((string) ($request->query('token') ?: $request->header('X-Webhook-Token')));

        abort_unless($given !== '' && hash_equals($expected, $given), 401);
    }

    private function hasValidSignature(Request $request, string $signingSecret): bool
    {
        $signature = trim((string) $request->header('X-Webhook-Signature'));

        if ($signature === '') {
            return false;
        }

        $given = Str::startsWith($signature, 'sha256=')
            ? substr($signature, 7)
            : $signature;

        if (! ctype_xdigit($given)) {
            return false;
        }

        $expected = hash_hmac('sha256', $request->getContent(), $signingSecret);

        return hash_equals($expected, strtolower($given));
    }

    private function findSupplierOrder(array $payload, ?string $externalId): ?SupplierOrder
    {
        $localOrderId = $this->localOrderId($payload);

        if ($localOrderId) {
            $supplierOrder = SupplierOrder::query()
                ->where('order_id', $localOrderId)
                ->latest()
                ->first();

            if ($supplierOrder) {
                return $supplierOrder;
            }
        }

        if (! $externalId) {
            return null;
        }

        return SupplierOrder::query()
            ->where('external_id', $externalId)
            ->latest()
            ->first();
    }

    private function localOrderId(array $payload): ?int
    {
        foreach ([
            'metadata.order_id',
            'data.metadata.order_id',
            'order.metadata.order_id',
            'merchant_reference',
            'reference',
            'idempotency_key',
            'data.reference',
            'order.reference',
        ] as $key) {
            $value = Arr::get($payload, $key);

            if (is_scalar($value) && preg_match('/astral-(\d+)/i', (string) $value, $match)) {
                return (int) $match[1];
            }

            if (is_numeric($value)) {
                return (int) $value;
            }
        }

        return null;
    }

    private function externalId(array $payload): ?string
    {
        foreach ([
            'order_id',
            'id',
            'external_id',
            'data.order_id',
            'data.id',
            'data.external_id',
            'order.order_id',
            'order.id',
            'payload.order_id',
        ] as $key) {
            $value = Arr::get($payload, $key);

            if (is_scalar($value) && trim((string) $value) !== '') {
                return trim((string) $value);
            }
        }

        return null;
    }

    private function fetchRemoteOrder(SupplierManager $manager, ?string $externalId): ?array
    {
        if (! $externalId) {
            return null;
        }

        try {
            $supplier = Supplier::query()->where('slug', 'fazercards')->first();

            if (! $supplier) {
                return null;
            }

            return $manager->gateway($supplier)->getOrder($externalId);
        } catch (Throwable $exception) {
            report($exception);

            return null;
        }
    }

    private function normalizeStatus(array $canonical, array $fallback): string
    {
        $raw = strtolower(trim((string) (
            Arr::get($canonical, 'status')
            ?? Arr::get($canonical, 'data.status')
            ?? Arr::get($canonical, 'order.status')
            ?? Arr::get($fallback, 'status')
            ?? Arr::get($fallback, 'data.status')
            ?? 'processing'
        )));

        if (Str::contains($raw, ['success', 'complete', 'completed', 'delivered', 'done', 'fulfilled'])) {
            return 'delivered';
        }

        if (Str::contains($raw, ['fail', 'failed', 'cancel', 'cancelled', 'canceled', 'reject', 'refund'])) {
            return Str::contains($raw, ['cancel', 'canceled']) ? 'cancelled' : 'failed';
        }

        return 'processing';
    }

    private function supplierFailureReason(array $canonical, array $payload): ?string
    {
        return Arr::get($canonical, 'fail_reason')
            ?? Arr::get($canonical, 'data.fail_reason')
            ?? Arr::get($canonical, 'order.fail_reason')
            ?? Arr::get($payload, 'fail_reason')
            ?? Arr::get($payload, 'data.fail_reason')
            ?? Arr::get($payload, 'reason')
            ?? Arr::get($payload, 'data.reason');
    }

    private function refundResellerOrder(Order $order, string $reason): void
    {
        $metadata = $order->metadata ?? [];

        if (! empty($metadata['reseller_refunded_at'])) {
            return;
        }

        $resellerOrder = ResellerOrder::query()
            ->with('partner')
            ->where('order_id', $order->id)
            ->first();

        if (! $resellerOrder || ! $resellerOrder->partner) {
            return;
        }

        app(ResellerWalletService::class)->refundDebit($resellerOrder->partner, (float) $resellerOrder->amount, $resellerOrder->external_reference.'-REFUND', [
            'type' => 'reseller_order_refund',
            'description' => 'Remboursement commande reseller échouée fournisseur.',
            'order_id' => $order->id,
            'reseller_order_id' => $resellerOrder->id,
            'reason' => $reason,
        ]);

        $metadata['reseller_refunded_at'] = now()->toIso8601String();
        $metadata['reseller_refund_reason'] = $reason;
        $order->forceFill(['metadata' => $metadata])->save();
        $resellerOrder->forceFill(['status' => 'failed'])->save();
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

    private function emailDeliveryCodes(Order $order, array $codes): void
    {
        $metadata = $order->metadata ?? [];
        $email = trim((string) ($metadata['customer']['email'] ?? ''));

        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL) || ! empty($metadata['delivery_email_sent_at'])) {
            return;
        }

        try {
            $lines = collect($codes)
                ->map(fn (array $item) => '- '.($item['label'] ?? 'Code').' : '.($item['value'] ?? ''))
                ->implode("\n");

            Mail::raw(
                "Bonjour,\n\nTa commande Astral4Gamer #{$order->id} est livree.\n\n{$lines}\n\nGarde ces informations privees.\n\nAstral4Gamer",
                function ($message) use ($email) {
                    $message->to($email)->subject('Ta commande Astral4Gamer est livree');
                }
            );

            $metadata['delivery_email_sent_at'] = now()->toIso8601String();
            $order->forceFill(['metadata' => $metadata])->save();
        } catch (Throwable $exception) {
            report($exception);

            $metadata['delivery_email_failed_at'] = now()->toIso8601String();
            $order->forceFill(['metadata' => $metadata])->save();
        }
    }
}
