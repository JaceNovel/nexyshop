<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ResellerPartner;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use Illuminate\Database\Seeder;

class NexyFreeFireSubscriptionSeeder extends Seeder
{
    private const SKU = 'NEXY-FREE-FIRE-SUBSCRIPTION';
    private const XOF_PER_USD = 610;
    private const NEXY_MONTHLY_BENEFIT_XOF = 500;

    public function run(): void
    {
        $weeklyBaseXof = 1450;
        $booyahPassBaseXof = 2100;
        $weeklyNexySaleXof = 1650;
        $booyahPassNexySaleXof = 2500;
        $monthlyNexySaleXof = 6750;
        $monthlyBaseXof = $monthlyNexySaleXof - self::NEXY_MONTHLY_BENEFIT_XOF;
        $weeklyBenefitXof = max(0, $weeklyNexySaleXof - $weeklyBaseXof);
        $booyahPassBenefitXof = max(0, $booyahPassNexySaleXof - $booyahPassBaseXof);
        $monthlyBenefitXof = self::NEXY_MONTHLY_BENEFIT_XOF;
        $weeklyNexySaleUsd = $this->xofToUsd($weeklyNexySaleXof);
        $booyahPassNexySaleUsd = $this->xofToUsd($booyahPassNexySaleXof);
        $monthlyNexySaleUsd = $this->xofToUsd($monthlyNexySaleXof);

        $manualSupplier = Supplier::firstOrCreate(
            ['slug' => 'manual'],
            ['name' => 'Manual Fulfillment', 'base_url' => 'manual://astral4gamer', 'active' => true, 'priority' => 99]
        );

        $product = Product::updateOrCreate(
            ['sku' => self::SKU],
            [
                'name' => 'Abonnement Free Fire',
                'game' => 'Free Fire',
                'price' => $weeklyNexySaleXof,
                'currency' => 'XOF',
                'active' => true,
                'metadata' => [
                    'category' => 'Top-up',
                    'category_slug' => 'top-up',
                    'type' => 'top-up',
                    'tags' => ['free_fire', 'subscription'],
                    'name_fr' => 'Abonnement Free Fire',
                    'name_en' => 'Free Fire Subscription',
                    'description' => 'Abonnement Free Fire avec verification UID avant paiement. Livraison estimee 5-15 min apres paiement.',
                    'description_fr' => 'Abonnement Free Fire avec verification UID avant paiement. Livraison estimee 5-15 min apres paiement.',
                    'description_en' => 'Free Fire subscription with UID verification before payment. Estimated delivery 5-15 minutes after payment.',
                    'descriptions' => [
                        'fr' => 'Abonnement Free Fire avec verification UID avant paiement. Livraison estimee 5-15 min apres paiement.',
                        'en' => 'Free Fire subscription with UID verification before payment. Estimated delivery 5-15 minutes after payment.',
                    ],
                    'image_url' => '/product-assets/free-fire-subscription.png',
                    'delivery' => '5-15 min',
                    'delivery_fr' => 'Automatise 5-15 min',
                    'delivery_en' => 'Automated 5-15 min',
                    'delivery_note' => 'Automatise 5-15 min',
                    'requires_uid' => true,
                    'validation_provider' => 'free_fire',
                    'default_region' => 'me',
                    'manual_fulfillment' => true,
                    'client_site_enabled' => true,
                    'supplier' => 'manual',
                    'permalink' => 'abonnement-free-fire',
                    'public_reference' => 'Astral4gamer-topup-free_fire_subscription',
                    'reseller_partner_codes' => ['nexy'],
                    'reseller_pricing' => [
                        'nexy' => [
                            'mode' => 'net_cost',
                            'weekly_sale_xof' => $weeklyNexySaleXof,
                            'booyah_pass_sale_xof' => $booyahPassNexySaleXof,
                            'monthly_sale_xof' => $monthlyNexySaleXof,
                            'weekly_benefit_credit_xof' => $weeklyBenefitXof,
                            'booyah_pass_benefit_credit_xof' => $booyahPassBenefitXof,
                            'monthly_benefit_credit_xof' => $monthlyBenefitXof,
                            'xof_per_usd' => self::XOF_PER_USD,
                        ],
                    ],
                    'astral_base_prices_xof' => [
                        'ff-subscription-weekly' => $weeklyBaseXof,
                        'ff-subscription-booyah-pass' => $booyahPassBaseXof,
                        'ff-subscription-monthly' => $monthlyBaseXof,
                    ],
                    'nexy_display_prices_xof' => [
                        'ff-subscription-weekly' => $weeklyNexySaleXof,
                        'ff-subscription-booyah-pass' => $booyahPassNexySaleXof,
                        'ff-subscription-monthly' => $monthlyNexySaleXof,
                    ],
                    'required_fields' => [
                        ['key' => 'player_id', 'label' => 'ID Free Fire', 'label_en' => 'Free Fire ID', 'type' => 'text'],
                        [
                            'key' => 'region',
                            'label' => 'Region',
                            'label_en' => 'Region',
                            'type' => 'select',
                            'options' => [
                                ['label' => 'MENA / Middle East', 'value' => 'me'],
                                ['label' => 'Europe', 'value' => 'eu'],
                                ['label' => 'Singapore', 'value' => 'sg'],
                                ['label' => 'India', 'value' => 'ind'],
                                ['label' => 'Brazil', 'value' => 'br'],
                                ['label' => 'United States', 'value' => 'us'],
                            ],
                        ],
                    ],
                    'manual_variations' => [
                        [
                            'variation_id' => 'ff-subscription-weekly',
                            'name' => 'Abonnement semaine',
                            'name_fr' => 'Abonnement semaine',
                            'name_en' => 'Weekly subscription',
                            'price' => $weeklyNexySaleXof,
                            'currency' => 'XOF',
                            'price_usd' => $weeklyNexySaleUsd,
                            'astral_base_price' => $weeklyBaseXof,
                            'nexy_benefit_credit_xof' => $weeklyBenefitXof,
                        ],
                        [
                            'variation_id' => 'ff-subscription-monthly',
                            'name' => 'Abonnement mensuel',
                            'name_fr' => 'Abonnement mensuel',
                            'name_en' => 'Monthly subscription',
                            'price' => $monthlyNexySaleXof,
                            'currency' => 'XOF',
                            'price_usd' => $monthlyNexySaleUsd,
                            'astral_base_price' => $monthlyBaseXof,
                            'nexy_benefit_credit_xof' => $monthlyBenefitXof,
                        ],
                        [
                            'variation_id' => 'ff-subscription-booyah-pass',
                            'name' => 'BOOYAH PASS',
                            'name_fr' => 'BOOYAH PASS',
                            'name_en' => 'BOOYAH PASS',
                            'price' => $booyahPassNexySaleXof,
                            'currency' => 'XOF',
                            'price_usd' => $booyahPassNexySaleUsd,
                            'astral_base_price' => $booyahPassBaseXof,
                            'nexy_benefit_credit_xof' => $booyahPassBenefitXof,
                        ],
                    ],
                ],
            ]
        );

        $this->upsertVariation($manualSupplier, $product, 'ff-subscription-weekly', 'Weekly subscription', $weeklyNexySaleUsd, $weeklyBaseXof, $weeklyNexySaleXof, $weeklyBenefitXof);
        $this->upsertVariation($manualSupplier, $product, 'ff-subscription-monthly', 'Monthly subscription', $monthlyNexySaleUsd, $monthlyBaseXof, $monthlyNexySaleXof, $monthlyBenefitXof);
        $this->upsertVariation($manualSupplier, $product, 'ff-subscription-booyah-pass', 'BOOYAH PASS', $booyahPassNexySaleUsd, $booyahPassBaseXof, $booyahPassNexySaleXof, $booyahPassBenefitXof);

        ResellerPartner::query()
            ->where(function ($query) {
                $query->where('company_name', 'like', '%nexy%')
                    ->orWhere('name', 'like', '%nexy%')
                    ->orWhere('email', 'nexy.shop@partners.astral4gamer.com')
                    ->orWhere('metadata->partner_code', 'nexy');
            })
            ->get()
            ->each(function (ResellerPartner $partner) {
                $metadata = $partner->metadata ?? [];
                $currentGames = $metadata['allowed_games'] ?? [$partner->allowed_scope ?: 'free_fire_mena'];
                $currentGames = is_array($currentGames) ? $currentGames : [$currentGames];
                $metadata['allowed_games'] = collect($currentGames)
                    ->merge(['free_fire_mena', 'free_fire', 'garena_free_fire_global'])
                    ->filter(fn ($game) => is_string($game) && trim($game) !== '')
                    ->map(fn ($game) => trim((string) $game))
                    ->unique()
                    ->values()
                    ->all();
                $metadata['partner_code'] = $metadata['partner_code'] ?? 'nexy';

                $partner->forceFill([
                    'allowed_scope' => count($metadata['allowed_games']) === 1 ? $metadata['allowed_games'][0] : 'multi_game',
                    'metadata' => $metadata,
                ])->save();
            });
    }

    private function upsertVariation(Supplier $supplier, Product $product, string $sku, string $name, float $nexyPriceUsd, int $basePriceXof, int $nexySaleXof, int $benefitCreditXof): void
    {
        SupplierProduct::updateOrCreate(
            ['supplier_id' => $supplier->id, 'external_sku' => $sku],
            [
                'product_id' => $product->id,
                'cost' => $nexyPriceUsd,
                'active' => true,
                'metadata' => [
                    'name' => $name,
                    'currency' => 'USD',
                    'kind' => 'manual_free_fire_subscription',
                    'retail_price' => $nexyPriceUsd,
                    'retail_price_xof' => $nexySaleXof,
                    'astral_base_price_xof' => $basePriceXof,
                    'astral_base_price_usd' => $this->xofToUsd($basePriceXof),
                    'nexy_sale_price_xof' => $nexySaleXof,
                    'nexy_sale_price_usd' => $nexyPriceUsd,
                    'nexy_benefit_credit_xof' => $benefitCreditXof,
                    'nexy_benefit_credit_usd' => $benefitCreditXof > 0 ? $this->xofToUsd($benefitCreditXof) : 0,
                    'manual_fulfillment' => true,
                ],
            ]
        );
    }

    private function xofToUsd(int $amount): float
    {
        return round($amount / self::XOF_PER_USD, 2);
    }
}
