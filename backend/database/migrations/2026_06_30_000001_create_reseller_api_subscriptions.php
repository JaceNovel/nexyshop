<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('reseller_api_subscriptions')) {
            Schema::create('reseller_api_subscriptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('reseller_partner_id')->constrained()->cascadeOnDelete();
                $table->date('period');
                $table->decimal('amount', 12, 2);
                $table->decimal('base_amount_xof', 12, 2)->default(8000);
                $table->string('currency', 8)->default('XOF');
                $table->string('status')->default('grace')->index();
                $table->string('reference')->unique();
                $table->timestamp('charged_at')->nullable();
                $table->timestamp('due_at')->nullable();
                $table->timestamp('grace_until')->nullable();
                $table->timestamp('paid_at')->nullable();
                $table->timestamp('suspended_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->unique(['reseller_partner_id', 'period']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('reseller_api_subscriptions');
    }
};
