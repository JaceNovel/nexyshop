<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'username')) {
                $table->string('username')->nullable()->unique()->after('name');
            }
            if (! Schema::hasColumn('users', 'avatar_url')) {
                $table->string('avatar_url')->nullable()->after('google_avatar_url');
            }
            if (! Schema::hasColumn('users', 'country')) {
                $table->string('country', 2)->nullable()->after('avatar_url');
            }
            if (! Schema::hasColumn('users', 'public_profile')) {
                $table->boolean('public_profile')->default(false)->after('country');
            }
            if (! Schema::hasColumn('users', 'game')) {
                $table->string('game')->nullable()->after('public_profile');
            }
            if (! Schema::hasColumn('users', 'player_uid')) {
                $table->string('player_uid')->nullable()->after('game');
            }
            if (! Schema::hasColumn('users', 'rank')) {
                $table->string('rank')->nullable()->after('player_uid');
            }
            if (! Schema::hasColumn('users', 'points')) {
                $table->unsignedInteger('points')->default(0)->after('rank');
            }
            if (! Schema::hasColumn('users', 'guild')) {
                $table->string('guild')->nullable()->after('points');
            }
            if (! Schema::hasColumn('users', 'wins')) {
                $table->unsignedInteger('wins')->default(0)->after('guild');
            }
            if (! Schema::hasColumn('users', 'tournaments_won')) {
                $table->unsignedInteger('tournaments_won')->default(0)->after('wins');
            }
            if (! Schema::hasColumn('users', 'kd_ratio')) {
                $table->decimal('kd_ratio', 6, 2)->nullable()->after('tournaments_won');
            }
            if (! Schema::hasColumn('users', 'badges')) {
                $table->json('badges')->nullable()->after('kd_ratio');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach ([
                'badges',
                'kd_ratio',
                'tournaments_won',
                'wins',
                'guild',
                'points',
                'rank',
                'player_uid',
                'game',
                'public_profile',
                'country',
                'avatar_url',
                'username',
            ] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

