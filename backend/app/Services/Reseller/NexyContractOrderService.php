<?php

namespace App\Services\Reseller;

use App\Models\Order;
use App\Models\ResellerOrder;
use App\Models\ResellerPartner;
use App\Models\SupplierProduct;
use App\Services\Shop\PricingService;
use App\Services\Suppliers\FazerCardsGateway;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NexyContractOrderService
{
    public function __construct(
        private readonly PricingService $pricing,
        private readonly ResellerWalletService $wallets,
    ) {
    }

    public function attachPaidSiteOrder(Order $order): array
    {
        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()->with('product.supplierProducts')->lockForUpdate()->find($order->id);

            if (! $lockedOrder || ! $this->isFreeFireMenaOrder($lockedOrder)) {
                return ['applies' => false, 'ready' => true];
            }

            $metadata = $lockedOrder->metadata ?? [];

            $existing = ResellerOrder::query()->where('order_id', $lockedOrder->id)->first();

            if ($existing) {
                $metadata['nexy_contract']['reseller_order_id'] = $existing->id;
                $metadata['nexy_contract']['reseller_reference'] = $existing->external_reference;
                $metadata['nexy_contract']['wallet_debited'] = true;
                $lockedOrder->forceFill(['metadata' => $metadata])->save();

                return ['applies' => true, 'ready' => true, 'reseller_order_id' => $existing->id];
            }

            $partner = $this->nexyPartner();

            if (! $partner) {
                $metadata['fulfillment_status'] = 'nexy_partner_missing';
                $metadata['nexy_contract'] = array_merge($metadata['nexy_contract'] ?? [], [
                    'enabled' => true,
                    'error' => 'Nexy partner introuvable.',
                    'failed_at' => now()->toIso8601String(),
                ]);
                $lockedOrder->forceFill(['metadata' => $metadata])->save();

                return ['applies' => true, 'ready' => false, 'reason' => 'missing_partner'];
            }

            $quantity = max(1, (int) ($metadata['quantity'] ?? 1));
            $supplierProduct = $this->supplierProduct($lockedOrder);
            $displayUnitPrice = round((float) ($metadata['display_unit_price'] ?? ($quantity > 0 ? ((float) $lockedOrder->amount / $quantity) : $lockedOrder->amount)), 2);
            $partner->loadMissing('wallet');
            $walletCurrency = strtoupper((string) ($partner->wallet?->currency ?? 'USD'));
            $displayCurrency = strtoupper((string) $lockedOrder->currency);
            $walletUnitPrice = $this->walletUnitPrice($lockedOrder, $supplierProduct, $displayUnitPrice);
            $baseDisplayUnitPrice = $this->baseDisplayUnitPrice($lockedOrder, $displayUnitPrice, $walletUnitPrice, $walletCurrency);
            $walletDebitAmount = round($walletUnitPrice * $quantity, 2);
            $benefitAmount = max(0, round(($displayUnitPrice - $baseDisplayUnitPrice) * $quantity, 2));
            $reference = 'NEXY-SITE-'.$lockedOrder->id;

            try {
                $this->wallets->debit($partner, $walletDebitAmount, $reference, [
                    'type' => 'site_nexy_contract_debit',
                    'description' => 'Commande site Free Fire MENA sous contrat Nexy.',
                    'order_id' => $lockedOrder->id,
                    'product_id' => $lockedOrder->product_id,
                    'variation_id' => $metadata['variation_id'] ?? null,
                    'display_unit_price' => $displayUnitPrice,
                    'display_currency' => $displayCurrency,
                    'wallet_unit_price' => $walletUnitPrice,
                    'wallet_currency' => $walletCurrency,
                    'base_display_unit_price' => $baseDisplayUnitPrice,
                    'nexy_benefit_amount' => $benefitAmount,
                    'benefit_currency' => $displayCurrency,
                ]);
            } catch (\Throwable $exception) {
                report($exception);

                $metadata['fulfillment_status'] = 'nexy_wallet_failed';
                $metadata['nexy_contract'] = array_merge($metadata['nexy_contract'] ?? [], [
                    'enabled' => true,
                    'partner_id' => $partner->id,
                    'wallet_debited' => false,
                    'error' => Str::limit($exception->getMessage(), 500),
                    'failed_at' => now()->toIso8601String(),
                ]);
                $lockedOrder->forceFill(['metadata' => $metadata])->save();

                return ['applies' => true, 'ready' => false, 'reason' => 'wallet_debit_failed'];
            }

            $contractPayload = [
                'enabled' => true,
                'source' => 'site_nexy_contract',
                'partner_id' => $partner->id,
                'display_unit_price' => $displayUnitPrice,
                'display_currency' => $displayCurrency,
                'wallet_unit_price' => $walletUnitPrice,
                'wallet_currency' => $walletCurrency,
                'base_display_unit_price' => $baseDisplayUnitPrice,
                'quantity' => $quantity,
                'wallet_debit_amount' => $walletDebitAmount,
                'benefit_amount' => $benefitAmount,
                'benefit_currency' => $displayCurrency,
                'currency' => $displayCurrency,
                'wallet_debited' => true,
                'debited_at' => now()->toIso8601String(),
            ];

            $metadata['source'] = $metadata['source'] ?? 'site_checkout';
            $metadata['reseller_partner_id'] = $partner->id;
            $metadata['reseller_reference'] = $reference;
            $metadata['nexy_contract'] = array_merge($metadata['nexy_contract'] ?? [], $contractPayload);
            $lockedOrder->forceFill(['metadata' => $metadata])->save();

            $resellerOrder = ResellerOrder::create([
                'reseller_partner_id' => $partner->id,
                'order_id' => $lockedOrder->id,
                'product_id' => $lockedOrder->product_id,
                'supplier_product_id' => $supplierProduct?->id,
                'external_reference' => $reference,
                'partner_reference' => 'SITE-'.$lockedOrder->id,
                'supplier_cost' => round((float) ($metadata['supplier_cost'] ?? $supplierProduct?->cost ?? 0) * $quantity, 2),
                'amount' => $walletDebitAmount,
                'margin_amount' => $benefitAmount,
                'currency' => $walletCurrency,
                'status' => 'accepted',
                'request_payload' => [
                    'source' => 'site_nexy_contract',
                    'order_id' => $lockedOrder->id,
                    'game_uid' => $lockedOrder->game_uid,
                    'nickname' => $lockedOrder->nickname,
                    'variation_id' => $metadata['variation_id'] ?? null,
                    'supplier_fields' => $metadata['supplier_fields'] ?? [],
                    'nexy_contract' => $contractPayload,
                ],
                'response_payload' => [
                    'order_id' => $lockedOrder->id,
                    'nexy_contract' => $contractPayload,
                ],
            ]);

            $metadata = $lockedOrder->metadata ?? [];
            $metadata['nexy_contract']['reseller_order_id'] = $resellerOrder->id;
            $lockedOrder->forceFill(['metadata' => $metadata])->save();

            return ['applies' => true, 'ready' => true, 'reseller_order_id' => $resellerOrder->id];
        });
    }

    private function isFreeFireMenaOrder(Order $order): bool
    {
        $variationId = (string) ($order->metadata['variation_id'] ?? '');
        $sku = FazerCardsGateway::decodeSku($variationId);

        if (($sku['kind'] ?? null) === 'topup' && ($sku['category_id'] ?? null) === 'free_fire_mena') {
            return true;
        }

        $product = $order->product;
        $values = [
            $product?->game,
            $product?->sku,
            $product?->name,
            $product?->metadata['category'] ?? null,
            $product?->metadata['game_slug'] ?? null,
        ];

        return collect($values)
            ->filter()
            ->map(fn ($value) => Str::of((string) $value)->ascii()->lower()->replaceMatches('/[^a-z0-9]+/', '_')->trim('_')->toString())
            ->contains(fn ($value) => str_contains($value, 'free_fire_mena'));
    }

    private function nexyPartner(): ?ResellerPartner
    {
        return ResellerPartner::query()
            ->where('metadata->partner_code', 'nexy')
            ->orWhere('company_name', 'like', '%NEXY%')
            ->orWhere('email', 'nexy.shop@partners.astral4gamer.com')
            ->orderBy('id')
            ->first();
    }

    private function supplierProduct(Order $order): ?SupplierProduct
    {
        $variationId = (string) ($order->metadata['variation_id'] ?? '');
        $supplierProducts = $order->product?->supplierProducts ?? collect();

        return $supplierProducts->firstWhere('external_sku', $variationId)
            ?: $supplierProducts->where('active', true)->sortBy('cost')->first();
    }

    private function walletUnitPrice(Order $order, ?SupplierProduct $supplierProduct, float $displayUnitPrice): float
    {
        $variationId = (string) ($order->metadata['variation_id'] ?? '');
        $productMetadata = $order->product?->metadata ?? [];
        $maps = [
            $productMetadata['nexy_contract_base_prices'] ?? null,
            $productMetadata['astral_base_prices'] ?? null,
            $productMetadata['previous_prices'] ?? null,
        ];

        foreach ($maps as $map) {
            if (is_array($map) && isset($map[$variationId]) && is_numeric($map[$variationId])) {
                return round((float) $map[$variationId], 2);
            }
        }

        $manualVariations = collect($productMetadata['manual_variations'] ?? []);
        $manualBase = $manualVariations
            ->first(fn ($variation) => is_array($variation)
                && (string) ($variation['variation_id'] ?? '') === $variationId
                && isset($variation['astral_base_price'])
                && is_numeric($variation['astral_base_price']));

        if ($manualBase) {
            return round((float) $manualBase['astral_base_price'], 2);
        }

        $cost = (float) ($supplierProduct?->cost ?? ($order->metadata['supplier_cost'] ?? 0));

        if ($cost > 0) {
            return round($this->pricing->retailPrice($cost), 2);
        }

        return $displayUnitPrice;
    }

    private function baseDisplayUnitPrice(Order $order, float $displayUnitPrice, float $walletUnitPrice, string $walletCurrency): float
    {
        $variationId = (string) ($order->metadata['variation_id'] ?? '');
        $displayCurrency = strtoupper((string) $order->currency);
        $productMetadata = $order->product?->metadata ?? [];
        $currencyMaps = $productMetadata['nexy_contract_base_prices_by_currency'] ?? [];

        if (is_array($currencyMaps)) {
            $map = $currencyMaps[$displayCurrency] ?? $currencyMaps[strtolower($displayCurrency)] ?? null;

            if (is_array($map) && isset($map[$variationId]) && is_numeric($map[$variationId])) {
                return round((float) $map[$variationId], 2);
            }
        }

        $displayMap = $productMetadata['nexy_contract_base_display_prices'] ?? null;

        if (is_array($displayMap) && isset($displayMap[$variationId]) && is_numeric($displayMap[$variationId])) {
            return round((float) $displayMap[$variationId], 2);
        }

        if ($displayCurrency === strtoupper($walletCurrency)) {
            return $walletUnitPrice;
        }

        return $displayUnitPrice;
    }
}