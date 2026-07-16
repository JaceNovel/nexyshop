<?php

namespace App\Console\Commands;

use App\Services\GoogleMerchantSyncService;
use Illuminate\Console\Command;
use Throwable;

class SyncGoogleMerchantCatalog extends Command
{
    protected $signature = 'google:merchant-sync {--dry-run : Build payloads without sending them to Google} {--limit= : Maximum number of products to sync} {--offset=0 : Number of matching products to skip before syncing} {--ids= : Comma-separated product IDs to sync}';

    protected $description = 'Synchronize the Astral4Gamer product catalog with Google Merchant Center.';

    public function handle(GoogleMerchantSyncService $sync): int
    {
        $limit = $this->option('limit') !== null ? max(1, (int) $this->option('limit')) : null;
        $offset = max(0, (int) $this->option('offset'));
        $productIds = collect(explode(',', (string) $this->option('ids')))
            ->map(fn (string $id): int => (int) trim($id))
            ->filter(fn (int $id): bool => $id > 0)
            ->values()
            ->all();

        try {
            $result = $sync->sync((bool) $this->option('dry-run'), $limit, $offset, function (array $progress): void {
                $status = $progress['success'] ? 'OK' : 'ERREUR';
                $this->line("[{$progress['processed']}/{$progress['total']}] {$status} produit #{$progress['product_id']} - {$progress['name']} ({$progress['synced']} OK, {$progress['failed']} échec)");
            }, $productIds);
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $mode = $result['dry_run'] ? 'DRY RUN' : 'SYNC';
        $this->info("Google Merchant {$mode}: {$result['synced']} produit(s) prêt(s), {$result['failed']} échec(s), {$result['total']} lu(s), offset {$result['offset']}.");

        foreach (array_slice($result['errors'], 0, 10) as $error) {
            $this->warn("Produit #{$error['product_id']} ({$error['status']}): {$error['message']}");
        }

        if ($result['dry_run'] && $result['samples']) {
            $this->line(json_encode($result['samples'][0], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        }

        return $result['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}