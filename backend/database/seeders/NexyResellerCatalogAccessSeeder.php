<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ResellerPartner;
use Illuminate\Database\Seeder;

class NexyResellerCatalogAccessSeeder extends Seeder
{
    public function run(): void
    {
        Product::query()
            ->whereIn('sku', [
                'nexy-mobile-legends-diamonds',
                'nexy-farlight-84-diamonds',
                'nexy-playstation-network-gift-card',
            ])
            ->update(['active' => false]);

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

                $allowedGames = collect($currentGames)
                    ->merge([
                        'free_fire_mena',
                        'pubg_mobile_global',
                        'blood_strike_mena',
                        'call_of_duty_mobile',
                        'mobile_legends',
                        'farlight_84',
                        'playstation',
                        'gift_cards',
                    ])
                    ->filter(fn ($game) => is_string($game) && trim($game) !== '')
                    ->map(fn ($game) => trim((string) $game))
                    ->unique()
                    ->values()
                    ->all();

                $metadata['allowed_games'] = $allowedGames;
                $metadata['partner_code'] = $metadata['partner_code'] ?? 'nexy';

                $partner->forceFill([
                    'allowed_scope' => count($allowedGames) === 1 ? $allowedGames[0] : 'multi_game',
                    'metadata' => $metadata,
                ])->save();
            });
    }
}
