<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('admin_access_blocks')) {
            Schema::create('admin_access_blocks', function (Blueprint $table) {
                $table->id();
                $table->string('identifier')->unique();
                $table->string('type', 20);
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 80)->nullable()->index();
                $table->unsignedTinyInteger('attempts')->default(0);
                $table->timestamp('blocked_until')->nullable();
                $table->timestamp('suspended_at')->nullable();
                $table->string('last_path')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_access_blocks');
    }
};