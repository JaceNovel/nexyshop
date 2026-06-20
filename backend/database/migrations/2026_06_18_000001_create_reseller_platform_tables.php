<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partnership_requests', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->string('name');
            $table->string('company_name')->nullable();
            $table->string('email');
            $table->string('discord')->nullable();
            $table->string('discord_user_id')->nullable()->index();
            $table->string('discord_username')->nullable();
            $table->string('country')->nullable();
            $table->string('type')->index();
            $table->string('audience')->nullable();
            $table->string('network_url')->nullable();
            $table->text('message');
            $table->string('expected_earning')->nullable();
            $table->string('status')->default('pending')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('reseller_partners', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('company_name')->nullable();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('discord')->nullable();
            $table->string('status')->default('active')->index();
            $table->string('allowed_scope')->default('free_fire');
            $table->decimal('margin_percent', 5, 2)->default(10);
            $table->decimal('minimum_topup', 12, 2)->default(10);
            $table->decimal('low_balance_threshold', 12, 2)->default(10);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('reseller_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reseller_partner_id')->unique()->constrained()->cascadeOnDelete();
            $table->decimal('balance', 12, 2)->default(0);
            $table->string('currency', 8)->default('USD');
            $table->timestamps();
        });

        Schema::create('reseller_api_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reseller_partner_id')->constrained()->cascadeOnDelete();
            $table->string('name')->default('Default key');
            $table->string('prefix', 16)->index();
            $table->string('key_hash', 80)->unique();
            $table->string('type')->default('api')->index();
            $table->boolean('active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('reseller_wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reseller_partner_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reseller_wallet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type')->index();
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_after', 12, 2);
            $table->string('currency', 8)->default('USD');
            $table->string('reference')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('reseller_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reseller_partner_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('external_reference')->unique();
            $table->string('partner_reference')->nullable()->index();
            $table->decimal('supplier_cost', 12, 2)->default(0);
            $table->decimal('amount', 12, 2);
            $table->decimal('margin_amount', 12, 2)->default(0);
            $table->string('currency', 8)->default('USD');
            $table->string('status')->default('accepted')->index();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reseller_orders');
        Schema::dropIfExists('reseller_wallet_transactions');
        Schema::dropIfExists('reseller_api_keys');
        Schema::dropIfExists('reseller_wallets');
        Schema::dropIfExists('reseller_partners');
        Schema::dropIfExists('partnership_requests');
    }
};
