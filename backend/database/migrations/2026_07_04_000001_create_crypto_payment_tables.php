<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('crypto_payment_intents')) {
            Schema::create('crypto_payment_intents', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->index();
                $table->foreignId('reseller_partner_id')->nullable()->index();
                $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
                $table->string('purpose')->index();
                $table->string('reference')->unique();
                $table->decimal('fiat_amount', 14, 2);
                $table->string('fiat_currency', 8)->default('XOF');
                $table->string('crypto_currency', 16)->default('USDT');
                $table->string('network', 40)->nullable();
                $table->decimal('expected_crypto_amount', 24, 10);
                $table->decimal('received_crypto_amount', 24, 10)->default(0);
                $table->string('deposit_address')->nullable();
                $table->string('deposit_memo')->nullable();
                $table->string('status')->default('pending')->index();
                $table->timestamp('expires_at')->nullable();
                $table->timestamp('paid_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('crypto_deposits')) {
            Schema::create('crypto_deposits', function (Blueprint $table) {
                $table->id();
                $table->foreignId('crypto_payment_intent_id')->nullable()->constrained()->nullOnDelete();
                $table->string('provider')->default('kucoin');
                $table->string('provider_deposit_id')->nullable();
                $table->string('tx_hash')->nullable();
                $table->string('currency', 16)->index();
                $table->string('network', 40)->nullable();
                $table->decimal('amount', 24, 10);
                $table->string('address')->nullable();
                $table->string('memo')->nullable();
                $table->string('status')->index();
                $table->timestamp('observed_at')->nullable();
                $table->timestamp('credited_at')->nullable();
                $table->json('raw_payload')->nullable();
                $table->timestamps();
                $table->unique(['provider', 'provider_deposit_id']);
                $table->index(['currency', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('crypto_deposits');
        Schema::dropIfExists('crypto_payment_intents');
    }
};