<?php

namespace App\Services\Shop;

class PricingService
{
    public function retailPrice(float|int|null $cost): float
    {
        $cost = max(0, (float) $cost);
        $percent = (float) config('services.shop.margin_percent', 0);
        $fixed = (float) config('services.shop.margin_fixed', 0);
        $minimum = (float) config('services.shop.margin_minimum', 0);
        $decimals = (int) config('services.shop.price_decimals', 2);

        $price = $cost + ($cost * ($percent / 100)) + $fixed;

        if ($minimum > 0) {
            $price = max($price, $cost + $minimum);
        }

        return round($price, $decimals);
    }

    public function retailRange(float|int|null $min, float|int|null $max): array
    {
        return [
            'min' => $this->retailPrice($min),
            'max' => $this->retailPrice($max),
        ];
    }
}
