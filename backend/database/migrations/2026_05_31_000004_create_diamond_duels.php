<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diamond_duels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_user_id')->nullable()->index();
            $table->foreignId('opponent_user_id')->nullable()->index();
            $table->foreignId('winner_user_id')->nullable()->index();
            $table->string('creator_name');
            $table->string('creator_avatar')->nullable();
            $table->string('creator_rank')->default('Diamant');
            $table->string('opponent_name')->nullable();
            $table->string('opponent_avatar')->nullable();
            $table->string('opponent_rank')->nullable();
            $table->unsignedInteger('stake');
            $table->unsignedInteger('prize_pool');
            $table->string('mode')->default('1v1 Classique');
            $table->string('map')->default('Bermuda');
            $table->string('status')->default('open')->index();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diamond_duels');
    }
};
