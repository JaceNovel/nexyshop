<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'steam_id')) {
                $table->string('steam_id', 32)->nullable()->unique()->after('google_connected_at');
            }
            if (! Schema::hasColumn('users', 'steam_persona_name')) {
                $table->string('steam_persona_name')->nullable()->after('steam_id');
            }
            if (! Schema::hasColumn('users', 'steam_avatar_url')) {
                $table->string('steam_avatar_url')->nullable()->after('steam_persona_name');
            }
            if (! Schema::hasColumn('users', 'steam_connected_at')) {
                $table->timestamp('steam_connected_at')->nullable()->after('steam_avatar_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach (['steam_connected_at', 'steam_avatar_url', 'steam_persona_name', 'steam_id'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
