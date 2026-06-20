"use client";

import {
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { SiteHeader } from "@/components/site-header";
import { type CatalogProduct, getCatalogProducts } from "@/lib/api";

const gameImages = {
  astral: "/icon.svg",
  freefire: "/unnamed.png",
  pubg: "/pubg-1920x1080-wallpaper-md5gr1zzjd6ic2va.jpg",
  codm: "https://media.rawg.io/media/resize/640/-/screenshots/b59/b59e44204d8af92133ea0b67af45a04c_hS4tgMe.jpg",
  mobileLegends: "https://media.rawg.io/media/resize/640/-/screenshots/ca8/ca8a011899a0743ee717c0a2f056f0af.jpg",
  fortnite: "/the-death-star-sabotage-event-for-fortnite-begins-on-july-7-cover684382a44e794.jpg",
  brawl: "https://media.rawg.io/media/resize/640/-/screenshots/ffa/ffa1cac1582ab3a81cf77e98435101ac.jpg",
  valorant: "https://media.rawg.io/media/resize/640/-/screenshots/4e2/4e2b6b1e7f0f3d3d3b5573d0ab826d6e.jpg",
  genshin: "https://media.rawg.io/media/resize/640/-/screenshots/3b7/3b7f00f2f47ed0f8c3c31ef3dbd4adc6.jpg",
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

const bannerSlides = [
  {
    key: "free-fire",
    title: "Free Fire Diamonds",
    text: "Recharge tes diamants en quelques secondes et prepare ton prochain rush.",
    cta: "Acheter maintenant",
    fallbackHref: "/category/top-up?q=free%20fire",
    searchTerms: ["free fire", "garena free fire", "diamonds free fire"],
    image: "https://wallpapercave.com/wp/wp7536967.jpg",
    gradient: "from-[#0f5132]/25 via-[#1f8f75]/18 to-[#38bdf8]/12"
  },
  {
    key: "call-of-duty",
    title: "CODM CP Instant",
    text: "Achete tes CP Call of Duty Mobile et debloque skins, passes et armes premium.",
    cta: "Acheter maintenant",
    fallbackHref: "/category/top-up?q=call%20of%20duty",
    searchTerms: ["call of duty mobile", "cod mobile", "codm", "cp call of duty"],
    image: "https://www.theloadout.com/wp-content/sites/theloadout/2022/09/call-of-duty-next-start-time-how-to-watch.jpg",
    gradient: "from-[#111827]/18 via-[#0f766e]/14 to-[#0ea5e9]/10"
  },
  {
    key: "netflix",
    title: "Netflix Gift Card",
    text: "Recharge ton divertissement avec des cartes cadeaux Netflix pretes a utiliser.",
    cta: "Acheter maintenant",
    fallbackHref: "/category/gift-cards?q=netflix",
    searchTerms: ["netflix", "netflix gift card", "netflix card"],
    image: "https://www.logoai.com/uploads/articles/2025/04/23/banner-1712644978-1745388914.jpg",
    gradient: "from-[#141414]/18 via-[#b91c1c]/16 to-[#ef4444]/10"
  },
  {
    key: "pubg",
    title: "PUBG Mobile UC",
    text: "Obtiens tes UC PUBG Mobile rapidement pour skins, crates et royale pass.",
    cta: "Acheter maintenant",
    fallbackHref: "/category/top-up?q=pubg",
    searchTerms: ["pubg mobile", "pubg mobile uc", "pubg"],
    image: "https://wallpapers.com/images/hd/pubg-2020-store-battle-wix5bktrn0oawyvj.jpg",
    gradient: "from-[#134e4a]/20 via-[#0f766e]/16 to-[#f59e0b]/12"
  }
];

const catalogShortcuts = [
  {
    key: "codm",
    label: "Call of Duty Mobile",
    fallbackHref: "/category/top-up?q=call%20of%20duty",
    searchTerms: ["call of duty mobile", "cod mobile", "codm", "cp call of duty"],
    image: "https://media.rawg.io/media/resize/640/-/screenshots/b59/b59e44204d8af92133ea0b67af45a04c_hS4tgMe.jpg"
  },
  {
    key: "free-fire",
    label: "Free Fire",
    fallbackHref: "/category/top-up?q=free%20fire",
    searchTerms: ["free fire", "garena free fire", "diamonds free fire"],
    image: gameImages.freefire
  },
  {
    key: "pubg",
    label: "PUBG Mobile",
    fallbackHref: "/category/top-up?q=pubg",
    searchTerms: ["pubg mobile", "pubg mobile uc", "pubg"],
    image: gameImages.pubg
  },
  {
    key: "genshin",
    label: "Genshin Impact",
    fallbackHref: "/category/top-up?q=genshin",
    searchTerms: ["genshin impact", "genesis crystals genshin", "genshin"],
    image: gameImages.genshin
  },
  {
    key: "honkai",
    label: "Honkai: Star Rail",
    fallbackHref: "/category/top-up?q=honkai",
    searchTerms: ["honkai star rail", "honkai"],
    image: "https://media.rawg.io/media/resize/640/-/screenshots/55d/55d3c9f5ddf77405c182621b929956ea.jpg"
  },
  {
    key: "mobile-legends",
    label: "Mobile Legends",
    fallbackHref: "/category/top-up?q=mobile%20legends",
    searchTerms: ["mobile legends", "mobile legends diamonds"],
    image: gameImages.mobileLegends
  },
  {
    key: "love-and-deepspace",
    label: "Love and Deepspace",
    fallbackHref: "/category/top-up?q=love%20and%20deepspace",
    searchTerms: ["love and deepspace", "love deepspace"],
    image: "https://media.rawg.io/media/resize/640/-/screenshots/4b9/4b91d51a67ca20d0c7645467c5977200.jpg"
  },
  {
    key: "honor-of-kings",
    label: "Honor of Kings",
    fallbackHref: "/category/top-up?q=honor%20of%20kings",
    searchTerms: ["honor of kings"],
    image: "https://media.rawg.io/media/resize/640/-/screenshots/826/826da47d8e91bfaf1fa8d40ebb90e40c.jpg"
  },
  {
    key: "zenless-zone-zero",
    label: "Zenless Zone Zero",
    fallbackHref: "/category/top-up?q=zenless",
    searchTerms: ["zenless zone zero", "zenless"],
    image: "https://media.rawg.io/media/resize/640/-/screenshots/b2a/b2a11a759dc222a112276b0ce69d08cc.jpg"
  },
  {
    key: "gearup",
    label: "GearUp Booster",
    fallbackHref: "/category/top-up?q=gearup",
    searchTerms: ["gearup booster", "gearup"],
    image: "https://www.gearupbooster.com/favicon.ico"
  },
  {
    key: "exitlag",
    label: "Exitlag",
    fallbackHref: "/category/top-up?q=exitlag",
    searchTerms: ["exitlag"],
    image: "https://www.exitlag.com/favicon.ico"
  },
  {
    key: "valorant",
    label: "Valorant",
    fallbackHref: "/category/top-up?q=valorant",
    searchTerms: ["valorant points", "valorant"],
    image: gameImages.valorant
  },
  {
    key: "playstation",
    label: "PlayStation",
    fallbackHref: "/category/gift-cards?q=playstation",
    searchTerms: ["playstation network", "playstation", "psn"],
    image: gameImages.playstation
  }
];

function productIdentity(product: Pick<CatalogProduct, "name" | "game" | "category">) {
  return `${product.name} ${product.game} ${product.category ?? ""}`.toLowerCase();
}

function fallbackImageForProduct(product: Pick<CatalogProduct, "name" | "game" | "category">) {
  const text = productIdentity(product);

  if (text.includes("apple") || text.includes("itunes")) return gameImages.apple;
  if (text.includes("amazon")) return gameImages.amazon;
  if (text.includes("discord") || text.includes("nitro")) return gameImages.discord;
  if (text.includes("google play")) return gameImages.googlePlay;
  if (text.includes("netflix")) return gameImages.netflix;
  if (text.includes("nintendo")) return gameImages.nintendo;
  if (text.includes("playstation") || text.includes("psn")) return gameImages.playstation;
  if (text.includes("razer")) return gameImages.razer;
  if (text.includes("steam")) return gameImages.steam;
  if (text.includes("xbox")) return gameImages.xbox;
  if (text.includes("free fire") || text.includes("garena")) return gameImages.freefire;
  if (text.includes("call of duty") || text.includes("cod")) return gameImages.codm;
  if (text.includes("mobile legend")) return gameImages.mobileLegends;
  if (text.includes("fortnite")) return gameImages.fortnite;
  if (text.includes("brawl")) return gameImages.brawl;
  if (text.includes("valorant")) return gameImages.valorant;
  if (text.includes("genshin")) return gameImages.genshin;
  if (text.includes("pubg")) return gameImages.pubg;
  if (text.includes("exitlag") || text.includes("gearup") || text.includes("wtfast") || text.includes("ping")) return gameImages.astral;
  if (text.includes("gift") || text.includes("card")) return gameImages.astral;

  return gameImages.astral;
}

function bestProductImage(product: Pick<CatalogProduct, "name" | "game" | "category" | "image_url">) {
  const imageUrl = product.image_url?.trim();
  const isPubgProduct = productIdentity(product).includes("pubg");

  if (imageUrl && (!imageUrl.toLowerCase().includes("pubg") || isPubgProduct)) {
    return imageUrl;
  }

  return fallbackImageForProduct(product);
}

function hasRealCatalogImage(product: Pick<CatalogProduct, "image_url">) {
  const imageUrl = product.image_url?.trim().toLowerCase();

  return Boolean(
    imageUrl &&
    !imageUrl.endsWith("/icon.svg") &&
    !imageUrl.includes("placeholder") &&
    !imageUrl.includes("not-found") &&
    !imageUrl.includes("not%20found")
  );
}

function preventBrokenImage(event: SyntheticEvent<HTMLImageElement>, fallback = gameImages.astral) {
  const image = event.currentTarget;

  if (image.dataset.fallbackApplied === "true") {
    return;
  }

  image.dataset.fallbackApplied = "true";
  image.src = fallback;
}

function bestProductPrice(
  product: CatalogProduct,
  language: "fr" | "en",
  formatMoney: (value: number, sourceCurrency?: string, options?: { unavailableLabel?: string; prefix?: string }) => string
) {
  const variationPrices = (product.variations ?? [])
    .map((variation) => Number(variation.price))
    .filter((price) => price > 0);
  const price = Number(product.price) > 0 ? Number(product.price) : Math.min(...variationPrices);

  if (!Number.isFinite(price) || price <= 0) {
    return language === "fr" ? "Prix bientôt" : "Price soon";
  }

  const prefix = variationPrices.length > 1 || (product.price_range?.min && product.price_range?.max && product.price_range.min !== product.price_range.max)
    ? (language === "fr" ? "Dès " : "From ")
    : "";

  return formatMoney(price, product.currency, {
    prefix,
    unavailableLabel: language === "fr" ? "Prix bientôt" : "Price soon"
  });
}

function productMatchesTerms(product: CatalogProduct, terms: string[]) {
  const text = productIdentity(product);

  return terms.some((term) => text.includes(term.toLowerCase()));
}

function findBestHeroProduct(products: CatalogProduct[], terms: string[]) {
  const matches = products.filter((product) => productMatchesTerms(product, terms));

  return matches.find((product) => product.variations?.length)
    ?? matches.find((product) => Number(product.price) > 0 || Number(product.price_range?.min) > 0)
    ?? matches[0];
}

const homeProductCount = 16;
const homeProductFetchCount = 240;
const homeProductRotationMs = 2 * 60 * 1000;
const homeProductPageKey = "astral_home_product_page";
const homeProductOffsetKey = "astral_home_product_offset";

function preferredHomeProducts(
  products: CatalogProduct[],
  formatMoney: (value: number, sourceCurrency?: string, options?: { unavailableLabel?: string; prefix?: string }) => string
) {
  const seenNames = new Set<string>();
  const visibleProducts = products.filter((product) => {
    const name = product.name.trim().toLowerCase();
    const hasPrice = bestProductPrice(product, "fr", formatMoney) !== "Prix bientôt";

    if (!name || seenNames.has(name) || !hasPrice) {
      return false;
    }

    seenNames.add(name);
    return true;
  });

  return visibleProducts;
}

export default function Home() {
  const { language, formatMoney } = useLanguage();
  const isFrench = language === "fr";
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [bannerLinks, setBannerLinks] = useState<Record<string, string>>({});
  const [shortcutProducts, setShortcutProducts] = useState<Record<string, CatalogProduct>>({});
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadRotatingProducts() {
      try {
        const storedPage = Number(window.sessionStorage.getItem(homeProductPageKey) ?? 1);
        const storedOffset = Number(window.sessionStorage.getItem(homeProductOffsetKey) ?? 0);
        let selectedPage = Number.isFinite(storedPage) && storedPage > 0 ? storedPage : 1;
        let offset = Number.isFinite(storedOffset) && storedOffset >= 0 ? storedOffset : 0;
        let response = await getCatalogProducts(homeProductFetchCount, { page: selectedPage, refresh: Date.now() });
        let lastPage = Math.max(1, Number(response.meta?.last_page ?? 1));

        if (!response.data.length && selectedPage > 1) {
          selectedPage = 1;
          offset = 0;
          response = await getCatalogProducts(homeProductFetchCount, { page: selectedPage, refresh: Date.now() + 1 });
          lastPage = Math.max(1, Number(response.meta?.last_page ?? 1));
        }

        const currentProducts = preferredHomeProducts(response.data, formatMoney);
        let selection = currentProducts.slice(offset, offset + homeProductCount);
        let nextPage = selectedPage;
        let nextOffset = offset + homeProductCount;
        let nextPageProductCount = currentProducts.length;

        if (selection.length < homeProductCount && lastPage > 1) {
          const neededProducts = homeProductCount - selection.length;
          const followingPage = selectedPage >= lastPage ? 1 : selectedPage + 1;
          const followingResponse = await getCatalogProducts(homeProductFetchCount, { page: followingPage, refresh: Date.now() + 2 });
          const followingProducts = preferredHomeProducts(followingResponse.data, formatMoney);

          selection = [...selection, ...followingProducts.slice(0, neededProducts)];
          nextPage = followingPage;
          nextOffset = neededProducts;
          nextPageProductCount = followingProducts.length;
        }

        if (nextOffset >= nextPageProductCount) {
          nextPage = nextPage >= lastPage ? 1 : nextPage + 1;
          nextOffset = 0;
        }

        if (cancelled) return;

        window.sessionStorage.setItem(homeProductPageKey, String(nextPage));
        window.sessionStorage.setItem(homeProductOffsetKey, String(Math.max(0, nextOffset)));
        setProducts(selection);
        setCatalogStatus(selection.length ? "ready" : "empty");
      } catch {
        if (!cancelled) setCatalogStatus("error");
      }
    }

    void loadRotatingProducts();
    const timer = window.setInterval(loadRotatingProducts, homeProductRotationMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [formatMoney]);

  useEffect(() => {
    let cancelled = false;

    const bannerRequests = Promise.all(
      bannerSlides.map(async (slide) => {
        for (const term of slide.searchTerms) {
          try {
            const response = await getCatalogProducts(12, { q: term });
            const product = findBestHeroProduct(response.data, slide.searchTerms);

            if (product) {
              return [slide.key, `/product/${product.id}`] as const;
            }
          } catch {
            // Keep the static fallback if the catalog search is unavailable.
          }
        }

        return [slide.key, slide.fallbackHref] as const;
      })
    ).then((entries) => {
      if (!cancelled) setBannerLinks(Object.fromEntries(entries));
    });

    const shortcutRequests = Promise.all(
      catalogShortcuts.map(async (shortcut) => {
        for (const term of shortcut.searchTerms) {
          try {
            const response = await getCatalogProducts(12, { q: term });
            const product = findBestHeroProduct(response.data, shortcut.searchTerms);

            if (product) {
              return [shortcut.key, product] as const;
            }
          } catch {
            // Keep the static shortcut if the catalog search is unavailable.
          }
        }

        return [shortcut.key, null] as const;
      })
    ).then((entries) => {
      if (cancelled) return;

      setShortcutProducts(Object.fromEntries(entries.filter((entry): entry is readonly [string, CatalogProduct] => Boolean(entry[1]))));
    });

    void bannerRequests;
    void shortcutRequests;

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % bannerSlides.length);
    }, 2000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-white text-[#06101f]">
      <SiteHeader />

      <section className="mx-auto max-w-[1586px] px-3 pt-3 sm:px-6 md:pt-10 lg:pt-16">
        <div className="relative h-[210px] overflow-hidden rounded-lg bg-[#145d3f] text-white shadow-[0_1px_2px_rgba(16,24,40,.08)] sm:h-[260px] md:h-[336px] md:rounded-[18px]">
          {bannerSlides.map((slide, index) => (
            <div
              key={slide.title}
              className={`absolute inset-0 transition-opacity duration-700 ${index === activeSlide ? "opacity-100" : "opacity-0"}`}
              aria-hidden={index !== activeSlide}
            >
              <img src={slide.image} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/0 to-transparent" />
              <div className="relative z-10 flex h-full max-w-[760px] flex-col justify-center px-5 sm:px-8 md:pl-[96px] lg:pl-[156px]">
                <p className="mb-2 hidden text-xs font-black uppercase tracking-[.14em] text-white/80 sm:block md:mb-3 md:text-sm md:tracking-[.18em]">{isFrench ? "Recharge officielle Astral4Gamer" : "Official Astral4Gamer top-up"}</p>
                <h1 className="max-w-[260px] text-[26px] font-black leading-[1.05] tracking-normal sm:max-w-[430px] sm:text-[34px] md:text-[44px]">{homeSlideCopy(slide.key, language).title}</h1>
                <p className="mt-2 line-clamp-2 max-w-[290px] text-[13px] font-medium leading-5 text-white/88 sm:max-w-[420px] sm:text-base md:mt-4 md:max-w-[470px] md:text-[21px] md:leading-7">{homeSlideCopy(slide.key, language).text}</p>
                <a href={bannerLinks[slide.key] ?? slide.fallbackHref} className="interactive-button mt-4 inline-flex h-10 w-[156px] items-center justify-center gap-1 rounded bg-white text-[12px] font-black text-[#111827] shadow-sm md:mt-7 md:h-11 md:w-[188px] md:gap-2 md:text-[14px]">
                  {homeSlideCopy(slide.key, language).cta} <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
          <button onClick={() => setActiveSlide((activeSlide - 1 + bannerSlides.length) % bannerSlides.length)} className="absolute left-2 top-1/2 z-20 -translate-y-1/2 text-white/90 sm:left-4 md:left-8">
            <ChevronLeft className="h-7 w-7 stroke-[1.6] md:h-9 md:w-9" />
          </button>
          <button onClick={() => setActiveSlide((activeSlide + 1) % bannerSlides.length)} className="absolute right-2 top-1/2 z-20 -translate-y-1/2 text-white/90 sm:right-4 md:right-8">
            <ChevronRight className="h-7 w-7 stroke-[1.6] md:h-9 md:w-9" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 md:bottom-5 md:gap-2">
            {bannerSlides.map((slide, index) => (
              <button
                key={slide.title}
                onClick={() => setActiveSlide(index)}
                className={`h-2 rounded-full transition-all ${index === activeSlide ? "w-8 bg-white" : "w-2 bg-white/45"}`}
                aria-label={`Afficher ${slide.title}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1586px] px-3 pt-4 sm:px-6 md:pt-8">
        <div className="overflow-hidden rounded-xl bg-[#f6f6f7] px-3 py-3 shadow-[inset_0_0_0_1px_rgba(17,24,39,.02)] md:px-5 md:py-4">
          <div className="grid grid-cols-4 gap-2 md:grid-cols-12 md:gap-3">
            {catalogShortcuts.slice(0, 12).map((shortcut, index) => {
              const product = shortcutProducts[shortcut.key];
              const href = product ? `/product/${product.id}` : shortcut.fallbackHref;
              const image = product ? bestProductImage(product) : shortcut.image;
              const fallback = product ? fallbackImageForProduct(product) : gameImages.astral;

              return (
                <a
                  key={shortcut.key}
                  href={href}
                  className={`group min-w-0 flex-col items-center justify-start border-r border-[#d9d9dc] px-1 last:border-r-0 md:flex md:px-2 ${index >= 4 ? "hidden" : "flex"}`}
                >
                  <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 md:h-16 md:w-16 md:rounded-xl">
                    <img
                      src={image}
                      alt={shortcut.label}
                      onError={(event) => preventBrokenImage(event, fallback)}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </span>
                  <span className="mt-2 line-clamp-2 w-full text-center text-[10.5px] leading-4 text-black md:text-[12px] md:leading-5">
                    {shortcut.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-[1586px] px-3 py-5 sm:px-6 md:py-9">
        <div className="mb-4 flex items-center justify-between md:mb-7">
          <h2 className="text-[17px] font-black md:text-[21px]">{isFrench ? "Produits les plus vendus" : "Best-selling products"}</h2>
          <a className="flex items-center gap-1 text-[13px] text-[#0057d9] md:text-[16px]" href="/category/top-up">{isFrench ? "Voir plus" : "See more"} <ChevronRight className="h-4 w-4 md:h-5 md:w-5" /></a>
        </div>

        {catalogStatus === "loading" && <p className="rounded-lg bg-[#f6f6f7] p-3 text-xs text-[#4b5563] md:p-5 md:text-sm">{isFrench ? "Chargement du catalogue..." : "Loading catalog..."}</p>}
        {catalogStatus === "empty" && <p className="rounded-lg bg-[#fff7ed] p-3 text-xs text-[#9a3412] md:p-5 md:text-sm">{isFrench ? "Catalogue en attente de synchronisation sur le serveur." : "Catalog is waiting for server synchronization."}</p>}
        {catalogStatus === "error" && <p className="rounded-lg bg-[#fef2f2] p-3 text-xs text-[#991b1b] md:p-5 md:text-sm">{isFrench ? "Impossible de charger le catalogue Astral4Gamer pour le moment." : "Unable to load the Astral4Gamer catalog right now."}</p>}

        {catalogStatus === "ready" ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 md:gap-x-6 md:gap-y-10 xl:grid-cols-8">
            {products.map((product, index) => (
              <a href={`/product/${product.id}`} key={product.id} className={`soft-pop min-w-0 rounded-lg p-1.5 md:rounded-xl md:p-3 ${index === 3 ? "bg-[#f3f3f3]" : "bg-white"}`}>
                <div className="relative aspect-square overflow-hidden rounded-md bg-[#f4f4f5] md:rounded-lg">
                  <img src={bestProductImage(product)} alt={product.name} onError={(event) => preventBrokenImage(event, fallbackImageForProduct(product))} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
                </div>
                <div className="px-0.5 py-1.5 md:px-1 md:py-3">
                  <h3 className="line-clamp-2 min-h-[30px] text-[10.5px] font-semibold leading-[15px] text-[#004bd6] md:min-h-[42px] md:text-[14px] md:leading-5">{product.name}</h3>
                  <p className="mt-1 truncate text-right text-[10px] font-medium text-black md:mt-5 md:text-[14px]">{bestProductPrice(product, language, formatMoney)}</p>
                </div>
              </a>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function homeSlideCopy(key: string, language: "fr" | "en") {
  const copy = {
    "free-fire": {
      fr: { title: "Free Fire Diamonds", text: "Recharge tes diamants en quelques secondes et prépare ton prochain rush.", cta: "Acheter maintenant" },
      en: { title: "Free Fire Diamonds", text: "Top up your diamonds in seconds and get ready for your next rush.", cta: "Buy now" }
    },
    "call-of-duty": {
      fr: { title: "CODM CP Instant", text: "Achète tes CP Call of Duty Mobile et débloque skins, passes et armes premium.", cta: "Acheter maintenant" },
      en: { title: "CODM Instant CP", text: "Buy your Call of Duty Mobile CP and unlock skins, passes, and premium weapons.", cta: "Buy now" }
    },
    netflix: {
      fr: { title: "Netflix Gift Card", text: "Recharge ton divertissement avec des cartes cadeaux Netflix prêtes à utiliser.", cta: "Acheter maintenant" },
      en: { title: "Netflix Gift Card", text: "Top up your entertainment with Netflix gift cards ready to use.", cta: "Buy now" }
    },
    pubg: {
      fr: { title: "PUBG Mobile UC", text: "Obtiens tes UC PUBG Mobile rapidement pour skins, caisses et royale pass.", cta: "Acheter maintenant" },
      en: { title: "PUBG Mobile UC", text: "Get your PUBG Mobile UC quickly for skins, crates, and the royale pass.", cta: "Buy now" }
    }
  } as const;

  return copy[key as keyof typeof copy]?.[language] ?? { title: "Astral4Gamer", text: "", cta: language === "fr" ? "Acheter maintenant" : "Buy now" };
}
