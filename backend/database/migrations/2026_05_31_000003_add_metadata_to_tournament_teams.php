<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('tournament_teams', 'metadata')) {
            Schema::table('tournament_teams', function (Blueprint $table) {
                $table->json('metadata')->nullable()->after('kills');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('tournament_teams', 'metadata')) {
            Schema::table('tournament_teams', function (Blueprint $table) {
                $table->dropColumn('metadata');
            });
        }
    }
};
