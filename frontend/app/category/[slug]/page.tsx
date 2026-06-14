"use client";

import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { type SyntheticEvent, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { getCatalogProducts, type CatalogProduct } from "@/lib/api";

const fallbackImages = {
  neutral: "/icon.svg",
  apple: "https://cdn.simpleicons.org/apple/111111",
  amazon: "https://cdn.simpleicons.org/amazon/FF9900",
  discord: "https://cdn.simpleicons.org/discord/5865F2",
  googlePlay: "https://cdn.simpleicons.org/googleplay/34A853",
  netflix: "https://cdn.simpleicons.org/netflix/E50914",
  nintendo: "https://cdn.simpleicons.org/nintendo/E60012",
  playstation: "https://cdn.simpleicons.org/playstation/003791",
  razer: "https://cdn.simpleicons.org/razer/00FF00",
  steam: "https://cdn.simpleicons.org/steam/171A21",
  xbox: "https://cdn.simpleicons.org/xbox/107C10"
};

const categoryConfig: Record<string, { title: string; type: string; description: string }> = {
  "top-up": { title: "Top Up", type: "top-up", description: "Recharges de jeux et crédits digitaux disponibles sur Astral4Gamer." },
  "game-credits": { title: "Game Credits", type: "top-up", description: "Recharges de jeux et crédits digitaux disponibles sur Astral4Gamer." },
  "carte-cadeau": { title: "Gift Cards", type: "gift-card", description: "Cartes cadeaux disponibles avec livraison rapide." },
  "gift-cards": { title: "Gift Cards", type: "gift-card", description: "Cartes cadeaux disponibles avec livraison rapide." },
  "game-keys": { title: "Game Keys", type: "game-key", description: "Clés de jeux disponibles sur Astral4Gamer." },
  "manual-services": { title: "Manual Services", type: "manual-service", description: "Services digitaux disponibles sur Astral4Gamer." }
};

type SortKey = "popular" | "newest" | "price_asc" | "price_desc";
const productsPerPage = 240;

function identity(product: Pick<CatalogProduct, "name" | "game" | "category">) {
  return `${product.name} ${product.game} ${product.category ?? ""}`.toLowerCase();
}

function fallbackImage(product: CatalogProduct) {
  const text = identity(product);

  if (text.includes("apple") || text.includes("itunes")) return fallbackImages.apple;
  if (text.includes("amazon")) return fallbackImages.amazon;
  if (text.includes("discord") || text.includes("nitro")) return fallbackImages.discord;
  if (text.includes("google play")) return fallbackImages.googlePlay;
  if (text.includes("netflix")) return fallbackImages.netflix;
  if (text.includes("nintendo")) return fallbackImages.nintendo;
  if (text.includes("playstation") || text.includes("psn")) return fallbackImages.playstation;
  if (text.includes("razer")) return fallbackImages.razer;
  if (text.includes("steam")) return fallbackImages.steam;
  if (text.includes("xbox")) return fallbackImages.xbox;

  return fallbackImages.neutral;
}

function productImage(product: CatalogProduct) {
  const image = product.image_url?.trim();
  const isPubgProduct = identity(product).includes("pubg");

  if (image && (!image.toLowerCase().includes("pubg") || isPubgProduct)) {
    return image;
  }

  return fallbackImage(product);
}

function preventBrokenImage(event: SyntheticEvent<HTMLImageElement>, fallback: string) {
  const image = event.currentTarget;

  if (image.dataset.fallbackApplied === "true") {
    return;
  }

  image.dataset.fallbackApplied = "true";
  image.src = fallback;
}

function productPrice(product: CatalogProduct) {
  const variationPrices = (product.variations ?? [])
    .map((variation) => Number(variation.price))
    .filter((price) => price > 0);
  const price = Number(product.price) > 0 ? Number(product.price) : Math.min(...variationPrices);

  if (!Number.isFinite(price) || price <= 0) {
    return "Prix indisponible";
  }

  const hasRange = variationPrices.length > 1 || Boolean(product.price_range?.min && product.price_range?.max && product.price_range.min !== product.price_range.max);

  return `${hasRange ? "Dès " : ""}${new Intl.NumberFormat("fr-FR").format(price)} ${product.currency}`;
}

function numericPrice(product: CatalogProduct) {
  const prices = [
    Number(product.price),
    ...(product.variations ?? []).map((variation) => Number(variation.price))
  ].filter((price) => price > 0);

  return prices.length ? Math.min(...prices) : Number.MAX_SAFE_INTEGER;
}

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const config = categoryConfig[params.slug] ?? { title: "Catalogue", type: params.slug, description: "Produits disponibles sur Astral4Gamer." };
  const initialQuery = searchParams.get("q") ?? "";
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>("popular");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setQuery(initialQuery);
    setPage(1);
  }, [initialQuery, params.slug]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      getCatalogProducts(productsPerPage, { category: config.type, q: query.trim() || undefined, page })
        .then((payload) => {
          if (!cancelled) {
            setProducts(payload.data);
            setLastPage(payload.meta?.last_page ?? 1);
            setTotal(payload.meta?.total ?? payload.data.length);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setProducts([]);
            setLastPage(1);
            setTotal(0);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [config.type, page, query]);

  const sortedProducts = useMemo(() => {
    const items = [...products];

    if (sort === "price_asc") {
      items.sort((a, b) => numericPrice(a) - numericPrice(b));
    } else if (sort === "price_desc") {
      items.sort((a, b) => numericPrice(b) - numericPrice(a));
    } else if (sort === "newest") {
      items.sort((a, b) => b.id - a.id);
    }

    return items;
  }, [products, sort]);

  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: "popular", label: "Popularité" },
    { key: "newest", label: "Plus récent" },
    { key: "price_asc", label: "Moins cher" },
    { key: "price_desc", label: "Plus cher" }
  ];

  return (
    <main className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="mx-auto max-w-[1400px] px-3 py-5 sm:px-5 md:px-6 md:py-10">
        <p className="text-xs text-[#697081] md:text-sm">Accueil / Boutique / {config.title}</p>
        <div className="mt-3 flex flex-col gap-3 md:mt-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-black md:text-3xl">{config.title}</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#697081] md:mt-2 md:text-sm md:leading-6">{config.description}</p>
          </div>
          <label className="flex h-10 w-full items-center rounded-lg border border-[#e5e7eb] px-3 md:h-11 md:min-w-[320px] md:w-auto">
            <Search className="mr-2 h-4 w-4 text-[#0b55d9]" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Rechercher un produit"
            />
          </label>
        </div>

        <div className="mt-4 flex h-10 items-center gap-2 overflow-x-auto rounded-lg bg-[#f4f4f5] px-3 text-xs md:mt-6 md:h-12 md:gap-4 md:px-5 md:text-sm">
          <b className="shrink-0">Trier par :</b>
          {sortOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => setSort(option.key)}
              className={`h-full shrink-0 px-2 font-bold ${sort === option.key ? "border-b-2 border-black text-black" : "text-[#697081]"}`}
            >
              {option.label}
            </button>
          ))}
          <span className="ml-auto hidden shrink-0 text-xs font-bold text-[#697081] md:block">{total} produits</span>
        </div>

        {loading ? (
          <div className="mt-5 grid grid-cols-3 gap-x-2 gap-y-4 sm:gap-x-3 sm:gap-y-5 md:mt-9 md:grid-cols-4 md:gap-x-5 md:gap-y-8 xl:grid-cols-6">
            {Array.from({ length: 18 }).map((_, index) => (
              <div key={index} className="min-w-0 rounded-lg bg-white p-1.5 shadow-[0_6px_18px_rgba(17,24,39,.05)] md:rounded-xl md:p-3">
                <div className="aspect-square animate-pulse rounded-md bg-[#eef1f5] md:rounded-lg" />
                <div className="mt-2 h-8 animate-pulse rounded bg-[#eef1f5] md:mt-3 md:h-10" />
                <div className="ml-auto mt-2 h-3 w-16 animate-pulse rounded bg-[#eef1f5]" />
              </div>
            ))}
          </div>
        ) : sortedProducts.length ? (
          <div className="mt-5 grid grid-cols-3 gap-x-2 gap-y-4 sm:gap-x-3 sm:gap-y-5 md:mt-9 md:grid-cols-4 md:gap-x-5 md:gap-y-8 xl:grid-cols-6">
            {sortedProducts.map((product) => {
              const fallback = fallbackImage(product);

              return (
                <a href={`/product/${product.id}`} key={product.id} className="min-w-0 rounded-lg bg-white p-1.5 shadow-[0_6px_18px_rgba(17,24,39,.05)] transition hover:-translate-y-1 md:rounded-xl md:p-3 md:shadow-[0_8px_24px_rgba(17,24,39,.05)]">
                  <div className="relative aspect-square overflow-hidden rounded-md bg-[#f8fafc] md:rounded-lg">
                    <img src={productImage(product)} alt={product.name} onError={(event) => preventBrokenImage(event, fallback)} className="h-full w-full object-contain p-2" />
                  </div>
                  <h2 className="mt-2 line-clamp-2 min-h-[32px] text-[11px] font-black leading-4 text-[#004bd6] md:mt-3 md:min-h-[44px] md:text-sm md:leading-5">{product.name}</h2>
                  <p className="mt-1 truncate text-right text-[10px] font-medium md:mt-2 md:text-sm">{productPrice(product)}</p>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 grid min-h-48 place-items-center rounded-lg border border-dashed border-[#d0d5dd] bg-[#fbfbfd] p-6 text-center">
            <div>
              <Loader2 className="mx-auto mb-3 hidden h-6 w-6 animate-spin text-[#0b55d9]" />
              <p className="text-sm font-black text-[#111827]">Aucun produit trouvé.</p>
              <p className="mt-1 text-xs font-semibold text-[#697081]">Essaie une autre recherche ou une autre catégorie.</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 md:mt-12">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-[#e5e7eb] px-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </button>
          <span className="grid h-10 min-w-10 place-items-center rounded-lg bg-[#0b55d9] px-3 text-sm font-black text-white">{page}</span>
          <button
            onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
            disabled={page >= lastPage || loading}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-[#e5e7eb] px-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45"
          >
            Page suivante
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </main>
  );
}
