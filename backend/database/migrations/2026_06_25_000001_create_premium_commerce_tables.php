<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('wallets') && ! Schema::hasColumn('wallets', 'currency')) {
            Schema::table('wallets', function (Blueprint $table) {
                $table->string('currency', 8)->default('USD')->after('cashback_balance');
            });
        }

        if (! Schema::hasTable('product_reviews')) {
            Schema::create('product_reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->index();
                $table->unsignedTinyInteger('rating');
                $table->text('comment');
                $table->string('proof_url')->nullable();
                $table->boolean('verified_purchase')->default(false);
                $table->string('status', 24)->default('pending')->index();
                $table->text('admin_reply')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->timestamp('hidden_at')->nullable();
                $table->timestamp('deleted_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('order_events')) {
            Schema::create('order_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->constrained()->cascadeOnDelete();
                $table->string('status', 40)->index();
                $table->string('title');
                $table->text('message')->nullable();
                $table->boolean('visible_to_customer')->default(true);
                $table->foreignId('admin_user_id')->nullable()->index();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('wallet_transactions')) {
            Schema::create('wallet_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->index();
                $table->foreignId('wallet_id')->nullable()->index();
                $table->string('type', 40)->index();
                $table->decimal('amount', 12, 2);
                $table->decimal('balance_after', 12, 2)->default(0);
                $table->string('currency', 8)->default('USD');
                $table->string('reason');
                $table->foreignId('order_id')->nullable()->index();
                $table->foreignId('payment_id')->nullable()->index();
                $table->foreignId('admin_user_id')->nullable()->index();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('vip_levels')) {
            Schema::create('vip_levels', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->unsignedInteger('min_orders')->default(0);
                $table->decimal('min_spend', 12, 2)->default(0);
                $table->decimal('cashback_percent', 5, 2)->default(0);
                $table->decimal('discount_percent', 5, 2)->default(0);
                $table->json('perks')->nullable();
                $table->timestamps();
            });
        }

        $levels = [
            ['Bronze', 1, 0, 1, 0, ['Cashback de depart', 'Badge profil']],
            ['Silver', 8, 75, 2, 1, ['Promotions privees', 'Cashback ameliore']],
            ['Gold', 20, 220, 3, 2, ['Support prioritaire', 'Acces ventes flash']],
            ['Diamond', 45, 650, 5, 3, ['Coupons exclusifs', 'Priorite livraison']],
            ['Elite', 100, 1500, 7, 5, ['Gestionnaire prioritaire', 'Offres VIP']],
        ];

        foreach ($levels as [$name, $orders, $spend, $cashback, $discount, $perks]) {
            DB::table('vip_levels')->updateOrInsert(['name' => $name], [
                'min_orders' => $orders,
                'min_spend' => $spend,
                'cashback_percent' => $cashback,
                'discount_percent' => $discount,
                'perks' => json_encode($perks),
                'updated_at' => now(),
                'created_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('vip_levels');
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('order_events');
        Schema::dropIfExists('product_reviews');
        if (Schema::hasTable('wallets') && Schema::hasColumn('wallets', 'currency')) {
            Schema::table('wallets', function (Blueprint $table) {
                $table->dropColumn('currency');
            });
        }
    }
};