<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournament_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('map')->nullable();
            $table->unsignedTinyInteger('round')->default(1);
            $table->string('status')->default('scheduled')->index();
            $table->dateTime('starts_at')->nullable();
            $table->json('stats')->nullable();
            $table->timestamps();
        });

        Schema::create('youtube_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('channel_id')->nullable()->index();
            $table->string('channel_title')->nullable();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->json('scopes')->nullable();
            $table->string('status')->default('connected')->index();
            $table->timestamps();
        });

        Schema::create('streams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->nullable()->constrained()->nullOnDelete();
            $table->string('youtube_video_id')->nullable()->index();
            $table->string('youtube_live_id')->nullable()->index();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default('scheduled')->index();
            $table->dateTime('scheduled_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('ended_at')->nullable();
            $table->string('embed_url')->nullable();
            $table->string('watch_url')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->unsignedInteger('viewer_count')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('replays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stream_id')->nullable()->constrained('streams')->nullOnDelete();
            $table->foreignId('tournament_id')->nullable()->constrained()->nullOnDelete();
            $table->string('youtube_video_id')->nullable()->index();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->unsignedInteger('views_count')->default(0);
            $table->string('category')->index();
            $table->dateTime('published_at')->nullable()->index();
            $table->json('teams')->nullable();
            $table->json('hashtags')->nullable();
            $table->json('stats')->nullable();
            $table->timestamps();
        });

        Schema::create('replay_moments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('replay_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedInteger('timestamp_seconds');
            $table->string('type')->index();
            $table->string('thumbnail_url')->nullable();
            $table->decimal('ai_confidence', 5, 2)->nullable();
            $table->string('status')->default('pending')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('highlights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('replay_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('moment_id')->nullable()->constrained('replay_moments')->nullOnDelete();
            $table->string('youtube_video_id')->nullable()->index();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('short_url')->nullable();
            $table->string('video_url')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->string('format')->default('vertical')->index();
            $table->string('status')->default('draft')->index();
            $table->unsignedInteger('views_count')->default(0);
            $table->json('hashtags')->nullable();
            $table->timestamps();
        });

        Schema::create('youtube_videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('youtube_account_id')->nullable()->constrained()->nullOnDelete();
            $table->string('youtube_video_id')->unique();
            $table->string('type')->default('replay')->index();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->unsignedInteger('views_count')->default(0);
            $table->dateTime('published_at')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();
        });

        Schema::create('obs_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stream_id')->nullable()->constrained('streams')->nullOnDelete();
            $table->string('status')->default('disconnected')->index();
            $table->boolean('is_streaming')->default(false);
            $table->boolean('is_recording')->default(false);
            $table->dateTime('connected_at')->nullable();
            $table->dateTime('last_seen_at')->nullable();
            $table->json('state')->nullable();
            $table->timestamps();
        });

        Schema::create('stream_markers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stream_id')->constrained('streams')->cascadeOnDelete();
            $table->unsignedInteger('timestamp_seconds');
            $table->string('type')->default('clutch')->index();
            $table->string('note')->nullable();
            $table->foreignId('created_by')->nullable()->index();
            $table->boolean('processed')->default(false);
            $table->timestamps();
        });

        Schema::create('ai_clip_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('replay_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('queued')->index();
            $table->string('provider')->default('openai');
            $table->string('audio_path')->nullable();
            $table->longText('transcript')->nullable();
            $table->json('detected_moments')->nullable();
            $table->text('error_message')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('finished_at')->nullable();
            $table->timestamps();
        });

        Schema::create('video_processing_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('highlight_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('replay_moment_id')->nullable()->constrained('replay_moments')->nullOnDelete();
            $table->string('status')->default('queued')->index();
            $table->string('source_url')->nullable();
            $table->string('output_path')->nullable();
            $table->unsignedInteger('start_seconds')->default(0);
            $table->unsignedInteger('duration_seconds')->default(60);
            $table->text('error_message')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('finished_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach ([
            'video_processing_jobs',
            'ai_clip_jobs',
            'stream_markers',
            'obs_sessions',
            'youtube_videos',
            'highlights',
            'replay_moments',
            'replays',
            'streams',
            'youtube_accounts',
            'tournament_matches',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
