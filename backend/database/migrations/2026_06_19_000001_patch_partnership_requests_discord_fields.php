<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('partnership_requests')) {
            return;
        }

        Schema::table('partnership_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('partnership_requests', 'company_name')) {
                $table->string('company_name')->nullable()->after('name');
            }

            if (! Schema::hasColumn('partnership_requests', 'discord_user_id')) {
                $table->string('discord_user_id')->nullable()->after('discord')->index();
            }

            if (! Schema::hasColumn('partnership_requests', 'discord_username')) {
                $table->string('discord_username')->nullable()->after('discord_user_id');
            }

            if (! Schema::hasColumn('partnership_requests', 'metadata')) {
                $table->json('metadata')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('partnership_requests')) {
            return;
        }

        Schema::table('partnership_requests', function (Blueprint $table) {
            if (Schema::hasColumn('partnership_requests', 'discord_username')) {
                $table->dropColumn('discord_username');
            }

            if (Schema::hasColumn('partnership_requests', 'discord_user_id')) {
                $table->dropColumn('discord_user_id');
            }
        });
    }
};
