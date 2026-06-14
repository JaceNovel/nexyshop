<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('community_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 60);
            $table->string('target_type', 80)->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->string('youtube_video_id', 80)->nullable();
            $table->string('status', 60)->default('sent');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['type', 'status']);
            $table->index(['target_type', 'target_id']);
            $table->index('youtube_video_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_actions');
    }
};
