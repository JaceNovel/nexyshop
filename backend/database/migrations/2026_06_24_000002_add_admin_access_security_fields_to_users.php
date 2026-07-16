<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'admin_access_blocked_until')) {
                $table->timestamp('admin_access_blocked_until')->nullable()->after('last_login_at');
            }
            if (! Schema::hasColumn('users', 'admin_access_suspended_at')) {
                $table->timestamp('admin_access_suspended_at')->nullable()->after('admin_access_blocked_until');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach (['admin_access_suspended_at', 'admin_access_blocked_until'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};