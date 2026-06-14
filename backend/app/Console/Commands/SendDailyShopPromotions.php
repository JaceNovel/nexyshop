<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\Discord\DiscordNotificationService;
use App\Services\Shop\PricingService;
use Illuminate\Console\Command;

class SendDailyShopPromotions extends Command
{
    protected $signature = 'nexy:daily-shop-promotions {--discount=5} {--count=2} {--force}';

    protected $description = 'Select daily shop promotions, apply a real discount and announce them on Discord.';

    public function handle(DiscordNotificationService $discord, PricingService $pricing): int
    {
        $discount = min(50, max(1, (int) $this->option('discount')));
        $count = min(6, max(1, (int) $this->option('count')));
        $now = now();
        $expiresAt = $now->copy()->addDay();

        $this->clearExpiredPromotions();

        if (! $this->option('force') && $this->promotionsAlreadyPreparedToday()) {
            $this->info('Daily promotions already prepared today.');

            return self::SUCCESS;
        }

        $products = Product::query()
            ->whereActive(true)
            ->where('price', '>', 0)
            ->where(function ($query) {
                $query->whereIn('metadata->type', ['top-up', 'gift-card', 'gift-cards'])
                    ->orWhereIn('metadata->category', ['Game Credits', 'Gift Cards'])
                    ->orWhere('game', 'like', '%gift%')
                    ->orWhere('game', 'like', '%credit%');
            })
            ->inRandomOrder()
            ->limit($count)
            ->get();

        if ($products->isEmpty()) {
            $this->warn('No eligible products found for daily promotions.');

            return self::SUCCESS;
        }

        foreach ($products as $product) {
            $regularPrice = $pricing->retailPrice($product->price);
            $promoPrice = round($regularPrice * (1 - ($discount / 100)), (int) config('services.shop.price_decimals', 2));
            $metadata = $product->metadata ?? [];
            $metadata['promo'] = [
                'active' => true,
                'label' => 'Promotion 24h',
                'discount_percent' => $discount,
                'regular_price' => $regularPrice,
                'price' => $promoPrice,
                'starts_at' => $now->toIso8601String(),
                'expires_at' => $expiresAt->toIso8601String(),
                'announced_at' => $now->toIso8601String(),
            ];

            $product->update(['metadata' => $metadata]);
            $this->line("Promo -{$discount}%: {$product->name}");
        }

        $discord->dailyPromotion($products->all(), $discount, $expiresAt->timezone(config('app.timezone'))->format('d/m/Y H:i'));
        $this->info("Prepared {$products->count()} daily promotion(s).");

        return self::SUCCESS;
    }

    private function clearExpiredPromotions(): void
    {
        Product::query()
            ->where('metadata->promo->active', true)
            ->get()
            ->each(function (Product $product) {
                $promo = $product->metadata['promo'] ?? [];

                if (! empty($promo['expires_at']) && now()->greaterThan($promo['expires_at'])) {
                    $metadata = $product->metadata ?? [];
                    $metadata['promo']['active'] = false;
                    $product->update(['metadata' => $metadata]);
                }
            });
    }

    private function promotionsAlreadyPreparedToday(): bool
    {
        return Product::query()
            ->where('metadata->promo->active', true)
            ->where('metadata->promo->announced_at', '>=', now()->startOfDay()->toIso8601String())
            ->exists();
    }
}
