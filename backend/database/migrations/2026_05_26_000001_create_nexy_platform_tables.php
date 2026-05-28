<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('game');
            $table->string('sku')->unique();
            $table->decimal('price', 12, 2);
            $table->string('currency', 8)->default('XOF');
            $table->boolean('active')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('base_url');
            $table->boolean('active')->default(true);
            $table->unsignedTinyInteger('priority')->default(10);
            $table->text('credentials')->nullable();
            $table->timestamps();
        });

        Schema::create('supplier_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('external_sku');
            $table->decimal('cost', 12, 2);
            $table->boolean('active')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->index();
            $table->foreignId('product_id')->constrained();
            $table->string('game_uid');
            $table->string('nickname');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 8)->default('XOF');
            $table->string('status')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->index();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider');
            $table->string('reference')->unique();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 8)->default('XOF');
            $table->string('status')->index();
            $table->json('payload')->nullable();
            $table->timestamps();
        });

        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique();
            $table->decimal('balance', 12, 2)->default(0);
            $table->decimal('reward_balance', 12, 2)->default(0);
            $table->decimal('cashback_balance', 12, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('guilds', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('logo_url')->nullable();
            $table->foreignId('leader_user_id')->nullable()->index();
            $table->unsignedInteger('points')->default(0);
            $table->unsignedInteger('wins')->default(0);
            $table->unsignedInteger('kills')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('tournaments', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('mode');
            $table->string('status')->index();
            $table->dateTime('starts_at');
            $table->decimal('prize_pool', 12, 2);
            $table->string('room_id')->nullable();
            $table->json('rules')->nullable();
            $table->timestamps();
        });

        Schema::create('tournament_teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->foreignId('guild_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->foreignId('captain_user_id')->nullable()->index();
            $table->string('status')->default('validated');
            $table->unsignedInteger('points')->default(0);
            $table->unsignedInteger('kills')->default(0);
            $table->timestamps();
        });

        Schema::create('tournament_round_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tournament_team_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('round');
            $table->unsignedTinyInteger('placement');
            $table->unsignedInteger('kills')->default(0);
            $table->unsignedInteger('points')->default(0);
            $table->foreignId('mvp_user_id')->nullable()->index();
            $table->timestamps();
            $table->unique(['tournament_id', 'tournament_team_id', 'round'], 'round_result_unique');
        });

        Schema::create('missions', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('type');
            $table->string('reward_type');
            $table->unsignedInteger('reward_amount');
            $table->unsignedInteger('cooldown_minutes')->default(1440);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('lucky_spin_rewards', function (Blueprint $table) {
            $table->id();
            $table->string('label');
            $table->string('reward_type');
            $table->unsignedInteger('amount');
            $table->unsignedInteger('weight')->default(1);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('ambassador_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique();
            $table->string('code')->unique();
            $table->decimal('commission_rate', 5, 2)->default(5);
            $table->decimal('earnings', 12, 2)->default(0);
            $table->json('stats')->nullable();
            $table->timestamps();
        });

        Schema::create('live_streams', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('youtube_video_id')->nullable();
            $table->string('status')->index();
            $table->dateTime('starts_at');
            $table->unsignedInteger('viewers')->default(0);
            $table->string('sponsor')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('api_logs', function (Blueprint $table) {
            $table->id();
            $table->string('service')->index();
            $table->string('direction');
            $table->string('endpoint');
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->json('payload')->nullable();
            $table->json('response')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->timestamps();
        });

        Schema::create('supplier_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->string('external_id')->nullable();
            $table->string('status')->index();
            $table->json('payload')->nullable();
            $table->json('response')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach ([
            'supplier_orders', 'api_logs', 'live_streams', 'ambassador_profiles', 'lucky_spin_rewards',
            'missions', 'tournament_round_results', 'tournament_teams', 'tournaments', 'guilds',
            'wallets', 'payments', 'orders', 'supplier_products', 'suppliers', 'products',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
