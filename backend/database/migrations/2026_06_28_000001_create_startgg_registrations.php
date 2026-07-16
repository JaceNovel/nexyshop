<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('startgg_registrations')) {
            return;
        }

        Schema::create('startgg_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('tournament_id')->nullable();
            $table->string('tournament_slug', 191);
            $table->string('tournament_name');
            $table->string('event_id')->nullable();
            $table->string('event_name')->nullable();
            $table->string('team_name');
            $table->string('team_tag', 20)->nullable();
            $table->string('captain_name')->nullable();
            $table->string('contact_whatsapp', 60)->nullable();
            $table->string('discord', 160)->nullable();
            $table->string('country', 80)->nullable();
            $table->string('status')->default('pending_validation');
            $table->json('members')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'tournament_slug']);
            $table->index(['tournament_slug', 'event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('startgg_registrations');
    }
};