<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reseller_partners', function (Blueprint $table) {
            if (! Schema::hasColumn('reseller_partners', 'api_status')) {
                $table->string('api_status')->default('active')->index()->after('status');
            }
            if (! Schema::hasColumn('reseller_partners', 'risk_level')) {
                $table->string('risk_level')->default('excellent')->index()->after('api_status');
            }
            if (! Schema::hasColumn('reseller_partners', 'astral_score')) {
                $table->unsignedSmallInteger('astral_score')->default(900)->after('risk_level');
            }
            if (! Schema::hasColumn('reseller_partners', 'order_creation_allowed')) {
                $table->boolean('order_creation_allowed')->default(true)->after('astral_score');
            }
        });

        Schema::table('reseller_wallets', function (Blueprint $table) {
            if (! Schema::hasColumn('reseller_wallets', 'available_balance')) {
                $table->decimal('available_balance', 12, 2)->default(0)->after('currency');
            }
            if (! Schema::hasColumn('reseller_wallets', 'pending_balance')) {
                $table->decimal('pending_balance', 12, 2)->default(0)->after('available_balance');
            }
            if (! Schema::hasColumn('reseller_wallets', 'credit_balance')) {
                $table->decimal('credit_balance', 12, 2)->default(0)->after('pending_balance');
            }
            if (! Schema::hasColumn('reseller_wallets', 'total_recharged')) {
                $table->decimal('total_recharged', 12, 2)->default(0)->after('credit_balance');
            }
            if (! Schema::hasColumn('reseller_wallets', 'total_spent')) {
                $table->decimal('total_spent', 12, 2)->default(0)->after('total_recharged');
            }
            if (! Schema::hasColumn('reseller_wallets', 'total_borrowed')) {
                $table->decimal('total_borrowed', 12, 2)->default(0)->after('total_spent');
            }
            if (! Schema::hasColumn('reseller_wallets', 'total_repaid')) {
                $table->decimal('total_repaid', 12, 2)->default(0)->after('total_borrowed');
            }
            if (! Schema::hasColumn('reseller_wallets', 'total_fees_paid')) {
                $table->decimal('total_fees_paid', 12, 2)->default(0)->after('total_repaid');
            }
            if (! Schema::hasColumn('reseller_wallets', 'wallet_status')) {
                $table->string('wallet_status')->default('active')->index()->after('total_fees_paid');
            }
        });

        Schema::table('reseller_wallet_transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('reseller_wallet_transactions', 'direction')) {
                $table->string('direction')->nullable()->after('amount');
            }
            if (! Schema::hasColumn('reseller_wallet_transactions', 'status')) {
                $table->string('status')->default('completed')->index()->after('direction');
            }
            if (! Schema::hasColumn('reseller_wallet_transactions', 'description')) {
                $table->text('description')->nullable()->after('reference');
            }
        });

        if (! Schema::hasTable('reseller_recharges')) {
            Schema::create('reseller_recharges', function (Blueprint $table) {
                $table->id();
                $table->foreignId('reseller_partner_id')->constrained()->cascadeOnDelete();
                $table->foreignId('reseller_wallet_id')->constrained()->cascadeOnDelete();
                $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
                $table->string('reference')->unique();
                $table->string('recharge_type')->default('standard')->index();
                $table->decimal('amount', 12, 2);
                $table->decimal('fee', 12, 2)->default(0);
                $table->decimal('total_to_pay', 12, 2);
                $table->decimal('credited_amount', 12, 2)->default(0);
                $table->string('currency', 8)->default('USD');
                $table->string('status')->default('pending_payment')->index();
                $table->boolean('is_express')->default(false)->index();
                $table->timestamp('paid_at')->nullable();
                $table->timestamp('credited_at')->nullable();
                $table->timestamp('due_credit_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('reseller_loans')) {
            Schema::create('reseller_loans', function (Blueprint $table) {
                $table->id();
                $table->foreignId('reseller_partner_id')->constrained()->cascadeOnDelete();
                $table->string('reference')->unique();
                $table->decimal('principal_amount', 12, 2);
                $table->decimal('margin_rate', 5, 2)->default(10);
                $table->decimal('margin_amount', 12, 2)->default(0);
                $table->decimal('total_due', 12, 2);
                $table->decimal('amount_repaid', 12, 2)->default(0);
                $table->decimal('remaining_due', 12, 2);
                $table->string('currency', 8)->default('USD');
                $table->string('status')->default('requested')->index();
                $table->timestamp('requested_at')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->timestamp('due_date')->nullable();
                $table->timestamp('grace_until')->nullable();
                $table->timestamp('repaid_at')->nullable();
                $table->text('admin_note')->nullable();
                $table->text('partner_note')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('reseller_partner_score_events')) {
            Schema::create('reseller_partner_score_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('reseller_partner_id')->constrained()->cascadeOnDelete();
                $table->string('type')->index();
                $table->integer('points')->default(0);
                $table->string('reason');
                $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('reseller_partner_logs')) {
            Schema::create('reseller_partner_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('reseller_partner_id')->constrained()->cascadeOnDelete();
                $table->string('type')->index();
                $table->text('description');
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('reseller_partner_logs');
        Schema::dropIfExists('reseller_partner_score_events');
        Schema::dropIfExists('reseller_loans');
        Schema::dropIfExists('reseller_recharges');
    }
};
