<?php

namespace App\Console\Commands;

use App\Models\Product;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ScrapeItem4GamerCatalog extends Command
{
    protected $signature = 'nexy:scrape-item4gamer-catalog
        {--prices : Update local prices from public Item4Gamer "From" prices}
        {--limit=0 : Maximum product pages to scrape, 0 for no explicit limit}
        {--delay=1 : Delay between product page requests in seconds}';

    protected $description = 'Enrich local Item4Gamer products with public product images, links, categories and optional public prices.';

    private string $siteUrl;

    public function handle(): int
    {
        $this->siteUrl = rtrim((string) config('services.suppliers.item4gamer.site_url', 'https://item4gamer.com'), '/');
        $updatePrices = (bool) $this->option('prices');
        $limit = max(0, (int) $this->option('limit'));
        $delay = max(0, (int) $this->option('delay'));

        $publicProducts = $this->discoverProducts($limit);

        if ($publicProducts === []) {
            $this->warn('No public Item4Gamer products discovered.');

            return self::FAILURE;
        }

        $this->info('Discovered '.count($publicProducts).' public product pages.');

        $updated = 0;
        $scraped = 0;

        foreach ($publicProducts as $url => $summary) {
            if ($limit > 0 && $scraped >= $limit) {
                break;
            }

            $details = $this->scrapeProduct($url, $summary);
            $scraped++;

            if (! $details['name']) {
                continue;
            }

            $product = $this->findLocalProduct($details);

            if (! $product) {
                $this->line("Skipped: {$details['name']}");
                $this->sleep($delay);
                continue;
            }

            $metadata = $product->metadata ?? [];
            $metadata['image_url'] = $this->utf8($details['image_url'] ?: ($metadata['image_url'] ?? null));
            $metadata['permalink'] = $this->utf8($details['url']);
            $metadata['public_category'] = $this->utf8($details['category'] ?: ($metadata['public_category'] ?? null));
            $metadata['public_brand'] = $this->utf8($details['brand'] ?: ($metadata['public_brand'] ?? null));
            $metadata['public_price'] = $details['price'] ?: ($metadata['public_price'] ?? null);
            $metadata['public_currency'] = $this->currencyCode($details['currency'] ?: ($metadata['public_currency'] ?? null));
            $metadata = $this->sanitizeForJson($metadata);

            $updates = ['metadata' => $metadata];

            if ($updatePrices && $details['price'] > 0) {
                $updates['price'] = $details['price'];
                $updates['currency'] = $this->currencyCode($details['currency'] ?: $product->currency);
            }

            $product->update($updates);
            $updated++;

            $this->line("Updated #{$product->id}: {$product->name}");
            $this->sleep($delay);
        }

        $deactivated = 0;

        if ($updatePrices && $limit === 0) {
            $deactivated = Product::where('metadata->supplier', 'item4gamer')
                ->where(function ($query) {
                    $query->where('price', '<=', 0)->orWhereNull('price');
                })
                ->update(['active' => false]);
        }

        $this->info("Scraped {$scraped} pages and updated {$updated} local products.");

        if ($deactivated > 0) {
            $this->info("Deactivated {$deactivated} Item4Gamer products without a usable price.");
        }

        return self::SUCCESS;
    }

    private function discoverProducts(int $limit): array
    {
        $products = [];
        $categoryUrls = [
            $this->siteUrl.'/',
            $this->siteUrl.'/category/game-credits/',
            $this->siteUrl.'/category/gift-cards/',
            $this->siteUrl.'/category/payment-services/',
            $this->siteUrl.'/category/ping-reducers/',
        ];

        foreach ($categoryUrls as $categoryUrl) {
            for ($page = 1; $page <= 20; $page++) {
                if ($limit > 0 && count($products) >= $limit) {
                    return array_slice($products, 0, $limit, true);
                }

                $url = $page === 1 ? $categoryUrl : rtrim($categoryUrl, '/').'/page/'.$page.'/';
                $html = $this->fetch($url);

                if (! $html) {
                    break;
                }

                $before = count($products);
                $xpath = $this->xpath($html);

                foreach ($xpath->query('//a[contains(@href, "/product/")]') as $node) {
                    if (! $node instanceof DOMElement) {
                        continue;
                    }

                    $href = $this->absoluteUrl((string) $node->getAttribute('href'));

                    if (! $href || ! str_contains($href, '/product/')) {
                        continue;
                    }

                    $name = trim($node->getAttribute('title') ?: $node->textContent);

                    $products[$href] = [
                        'url' => $href,
                        'name' => $this->cleanText($name),
                    ];
                }

                if (count($products) === $before || $page === 1 && $categoryUrl === $this->siteUrl.'/') {
                    break;
                }
            }
        }

        return $limit > 0 ? array_slice($products, 0, $limit, true) : $products;
    }

    private function scrapeProduct(string $url, array $summary): array
    {
        $html = $this->fetch($url);

        if (! $html) {
            return ['url' => $url, 'name' => $summary['name'] ?? null, 'image_url' => null, 'price' => 0, 'currency' => null, 'category' => null, 'brand' => null];
        }

        $xpath = $this->xpath($html);
        $name = $this->firstText($xpath, [
            '//*[contains(concat(" ", normalize-space(@class), " "), " product_title ")]',
            '//*[contains(concat(" ", normalize-space(@class), " "), " entry-title ")]',
            '//h1',
        ]) ?: ($summary['name'] ?? null);
        $image = $this->firstImage($xpath);
        $priceText = $this->firstText($xpath, [
            '//*[contains(concat(" ", normalize-space(@class), " "), " summary ")]//*[contains(concat(" ", normalize-space(@class), " "), " price ")]',
            '//*[contains(concat(" ", normalize-space(@class), " "), " entry-summary ")]//*[contains(concat(" ", normalize-space(@class), " "), " price ")]',
            '//*[contains(concat(" ", normalize-space(@class), " "), " price ")]',
            '//*[contains(@class, "price")]',
        ]);
        [$price, $currency] = $this->parsePrice($priceText);
        $category = $this->firstText($xpath, [
            '//*[contains(concat(" ", normalize-space(@class), " "), " posted_in ")]//a',
            '//a[@rel="tag"]',
        ]);
        $brand = $this->firstText($xpath, [
            '//*[contains(concat(" ", normalize-space(@class), " "), " tagged_as ")]//a',
            '//*[contains(concat(" ", normalize-space(@class), " "), " product_meta ")]//a[contains(@href, "brand")]',
        ]);

        return [
            'url' => $url,
            'name' => $this->cleanText($name),
            'image_url' => $image,
            'price' => $price,
            'currency' => $currency,
            'category' => $this->cleanText($category),
            'brand' => $this->cleanText($brand),
        ];
    }

    private function findLocalProduct(array $details): ?Product
    {
        $slug = $this->slugFromUrl($details['url']);
        $name = $details['name'];
        $normalizedName = $this->normalizeName($name);

        $product = Product::query()
            ->where('metadata->supplier', 'item4gamer')
            ->where(function ($query) use ($slug, $name) {
                $query->where('metadata->permalink', 'like', '%/'.$slug.'/%')
                    ->orWhere('name', $name)
                    ->orWhere('name', 'like', '%'.$name.'%');
            })
            ->first();

        if ($product) {
            return $product;
        }

        foreach (Product::where('metadata->supplier', 'item4gamer')->get(['id', 'name']) as $candidate) {
            if ($this->normalizeName($candidate->name) === $normalizedName) {
                return $candidate;
            }
        }

        return null;
    }

    private function fetch(string $url): ?string
    {
        try {
            $response = Http::withHeaders([
                'User-Agent' => 'Astral4Gamer catalog sync (+https://astral4gamer.com)',
                'Accept' => 'text/html,application/xhtml+xml',
            ])
                ->timeout(20)
                ->retry(2, 500)
                ->get($url);

            if (! $response->ok()) {
                return null;
            }

            return $response->body();
        } catch (\Throwable) {
            return null;
        }
    }

    private function firstText(DOMXPath $xpath, array $queries): ?string
    {
        foreach ($queries as $query) {
            $nodes = $xpath->query($query);

            if ($nodes && $nodes->length > 0) {
                $text = $this->cleanText($nodes->item(0)?->textContent);

                if ($text !== '') {
                    return $text;
                }
            }
        }

        return null;
    }

    private function firstImage(DOMXPath $xpath): ?string
    {
        foreach ([
            '//*[contains(concat(" ", normalize-space(@class), " "), " woocommerce-product-gallery ")]//img',
            '//*[contains(concat(" ", normalize-space(@class), " "), " product ")]//img',
            '//meta[@property="og:image"]',
            '//img[contains(concat(" ", normalize-space(@class), " "), " wp-post-image ")]',
            '//img',
        ] as $query) {
            $nodes = $xpath->query($query);

            if (! $nodes || $nodes->length === 0) {
                continue;
            }

            $node = $nodes->item(0);

            if (! $node instanceof DOMElement) {
                continue;
            }

            $src = $node->getAttribute('content') ?: $node->getAttribute('data-large_image') ?: $node->getAttribute('src') ?: $node->getAttribute('data-src');
            $src = $this->absoluteUrl((string) $src);

            if ($src) {
                return $src;
            }
        }

        return null;
    }

    private function xpath(string $html): DOMXPath
    {
        $document = new DOMDocument();
        libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="utf-8" ?>'.$html, LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();

        return new DOMXPath($document);
    }

    private function parsePrice(?string $text): array
    {
        $text = $this->cleanText($text);

        if ($text === '') {
            return [0, null];
        }

        preg_match_all('/[$€£¥₦₵₺₹]|USD|EUR|GBP|JPY|XOF|AED|CAD|AUD/i', $text, $currencyMatches);
        preg_match_all('/\d+(?:[.,]\d+)?/', $text, $numberMatches);
        $number = end($numberMatches[0]) ?: null;

        if (! $number) {
            return [0, null];
        }

        $currency = $this->currencyCode($currencyMatches[0][0] ?? 'USD');

        return [(float) str_replace(',', '.', $number), $currency];
    }

    private function currencyCode(mixed $value): string
    {
        $value = strtoupper($this->utf8($value) ?: '');

        return match (true) {
            str_contains($value, 'USD') || str_contains($value, '$') => 'USD',
            str_contains($value, 'EUR') || str_contains($value, '€') => 'EUR',
            str_contains($value, 'GBP') || str_contains($value, '£') => 'GBP',
            str_contains($value, 'JPY') || str_contains($value, '¥') => 'JPY',
            str_contains($value, 'XOF') || str_contains($value, 'FCFA') || str_contains($value, 'CFA') => 'XOF',
            str_contains($value, 'AED') => 'AED',
            str_contains($value, 'CAD') => 'CAD',
            str_contains($value, 'AUD') => 'AUD',
            preg_match('/^[A-Z]{3}$/', $value) === 1 => $value,
            default => 'USD',
        };
    }

    private function cleanText(?string $text): string
    {
        return trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($this->utf8($text)), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
    }

    private function sanitizeForJson(mixed $value): mixed
    {
        if (is_array($value)) {
            return collect($value)
                ->map(fn ($item) => $this->sanitizeForJson($item))
                ->all();
        }

        if (is_string($value)) {
            return $this->utf8($value);
        }

        return $value;
    }

    private function utf8(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = (string) $value;

        if (! mb_check_encoding($value, 'UTF-8')) {
            $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
        }

        return mb_convert_encoding($value, 'UTF-8', 'UTF-8');
    }

    private function normalizeName(?string $name): string
    {
        return Str::of($this->cleanText($name))
            ->lower()
            ->replaceMatches('/\b(instant|top\s*up|gift\s*card|cards|diamonds|coins|points|gems)\b/u', '')
            ->replaceMatches('/[^a-z0-9]+/u', '')
            ->toString();
    }

    private function slugFromUrl(string $url): string
    {
        return trim(Str::after(parse_url($url, PHP_URL_PATH) ?: '', '/product/'), '/');
    }

    private function absoluteUrl(string $url): ?string
    {
        $url = trim(html_entity_decode($url, ENT_QUOTES | ENT_HTML5, 'UTF-8'));

        if ($url === '' || str_starts_with($url, 'data:')) {
            return null;
        }

        if (str_starts_with($url, '//')) {
            return 'https:'.$url;
        }

        if (str_starts_with($url, '/')) {
            return $this->siteUrl.$url;
        }

        return preg_match('/^https?:\/\//i', $url) ? $url : null;
    }

    private function sleep(int $delay): void
    {
        if ($delay > 0) {
            sleep($delay);
        }
    }
}
