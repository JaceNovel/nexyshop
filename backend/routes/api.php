<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminBlogPostController;
use App\Http\Controllers\Api\AdminIntegrationController;
use App\Http\Controllers\Api\AdminVideoController;
use App\Http\Controllers\Api\BlogPostController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\GuildController;
use App\Http\Controllers\Api\LiveController;
use App\Http\Controllers\Api\MissionController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PlayerController;
use App\Http\Controllers\Api\ReplayController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\TournamentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['api', 'throttle:api'])->group(function () {
    Route::get('/health', fn () => ['status' => 'ok', 'service' => 'nexy-api']);
    Route::get('/home', [ShopController::class, 'home']);
    Route::get('/products', [ShopController::class, 'products']);
    Route::get('/products/categories', [ShopController::class, 'categories']);
    Route::get('/products/{product}', [ShopController::class, 'product']);
    Route::post('/orders/guest', [ShopController::class, 'guestOrder']);
    Route::post('/payments/moneroo/initiate', [PaymentController::class, 'initiateGuest']);
    Route::get('/payments/moneroo/return', [PaymentController::class, 'monerooReturn']);
    Route::post('/payments/webhook/{provider}', [PaymentController::class, 'webhook'])->middleware('signed.webhook');
    Route::post('/player/verify', [PlayerController::class, 'verify'])->middleware('throttle:uid');
    Route::get('/tournaments', [TournamentController::class, 'index']);
    Route::get('/tournaments/{tournament}', [TournamentController::class, 'show']);
    Route::get('/lives/current', [LiveController::class, 'current']);
    Route::get('/streams/current', [ReplayController::class, 'currentStream']);
    Route::get('/replays', [ReplayController::class, 'index']);
    Route::get('/replays/{slug}', [ReplayController::class, 'show']);
    Route::get('/highlights', [ReplayController::class, 'highlights']);
    Route::get('/leaderboards', [PlayerController::class, 'leaderboards']);
    Route::get('/blog-posts', [BlogPostController::class, 'index']);
    Route::get('/blog-posts/{slug}', [BlogPostController::class, 'show']);
    Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect']);
    Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);
});

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('/orders', [ShopController::class, 'order']);
    Route::post('/payments/initiate', [PaymentController::class, 'initiate']);
    Route::post('/payments/{payment}/verify', [PaymentController::class, 'verify']);
    Route::post('/tournaments/{tournament}/register', [TournamentController::class, 'register']);
    Route::post('/guilds', [GuildController::class, 'store']);
    Route::post('/guilds/{guild}/join', [GuildController::class, 'join']);
    Route::post('/missions/{mission}/claim', [MissionController::class, 'claim']);
    Route::get('/user/google-profile', [GoogleAuthController::class, 'profile']);
    Route::delete('/user/google-disconnect', [GoogleAuthController::class, 'disconnect']);
});

Route::middleware(['auth:sanctum', 'can:admin'])->prefix('admin')->group(function () {
    Route::apiResource('tournaments', TournamentController::class)->except(['index', 'show']);
    Route::post('/tournaments/{tournament}/results', [TournamentController::class, 'submitResult']);
    Route::post('/suppliers/item4gamer/sync', [ShopController::class, 'syncItem4Gamer']);
    Route::get('/suppliers/item4gamer/balance', [ShopController::class, 'item4GamerBalance']);
    Route::get('/suppliers/item4gamer/orders', [ShopController::class, 'item4GamerOrder']);
    Route::get('/analytics', [AdminController::class, 'analytics']);
    Route::get('/logs', [AdminController::class, 'logs']);
    Route::get('/integrations/google', [AdminIntegrationController::class, 'google']);
    Route::get('/integrations/blog', [AdminIntegrationController::class, 'blog']);
    Route::apiResource('blog-posts', AdminBlogPostController::class);
    Route::post('/blog-posts/{blogPost}/publish-to-blogger', [AdminBlogPostController::class, 'publishToBlogger']);
    Route::post('/blog-posts/generate-from-tournament/{tournament}', [AdminBlogPostController::class, 'generateFromTournament']);
    Route::post('/blog-posts/generate-from-replay/{replay}', [AdminBlogPostController::class, 'generateFromReplay']);
    Route::post('/blog-posts/generate-weekly-summary', [AdminBlogPostController::class, 'generateWeeklySummary']);
    Route::get('/youtube/status', [AdminVideoController::class, 'youtubeStatus']);
    Route::get('/youtube/redirect', [AdminVideoController::class, 'youtubeRedirect']);
    Route::get('/youtube/callback', [AdminVideoController::class, 'youtubeCallback']);
    Route::post('/youtube/lives', [AdminVideoController::class, 'createLive']);
    Route::post('/youtube/videos/sync', [AdminVideoController::class, 'syncVideo']);
    Route::post('/replays/{replay}/analyze', [AdminVideoController::class, 'analyzeReplay']);
    Route::patch('/replay-moments/{moment}', [AdminVideoController::class, 'updateMoment']);
    Route::post('/replay-moments/{moment}/highlight', [AdminVideoController::class, 'generateHighlight']);
    Route::post('/streams/{stream}/markers', [AdminVideoController::class, 'markStreamMoment']);
    Route::get('/obs/status', [AdminVideoController::class, 'obsStatus']);
    Route::post('/obs/{command}', [AdminVideoController::class, 'obsCommand']);
});
