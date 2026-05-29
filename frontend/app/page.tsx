"use client";

import {
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { type CatalogProduct, getCatalogProducts } from "@/lib/api";

const gameImages = {
  freefire: "https://media.rawg.io/media/resize/640/-/screenshots/96a/96ab17437e722c8e22240923dfdfcdd0_ftUmkIh.jpg",
  pubg: "https://media.rawg.io/media/resize/640/-/screenshots/a83/a830c3a3f3f4c9b6cc74924cd42b89a0.jpg",
  codm: "https://media.rawg.io/media/resize/640/-/screenshots/b59/b59e44204d8af92133ea0b67af45a04c_hS4tgMe.jpg",
  mobileLegends: "https://media.rawg.io/media/resize/640/-/screenshots/ca8/ca8a011899a0743ee717c0a2f056f0af.jpg",
  fortnite: "https://media.rawg.io/media/resize/640/-/screenshots/c28/c286227823231c426a88aa873cf1b8d6.jpg",
  brawl: "https://media.rawg.io/media/resize/640/-/screenshots/ffa/ffa1cac1582ab3a81cf77e98435101ac.jpg",
  valorant: "https://media.rawg.io/media/resize/640/-/screenshots/4e2/4e2b6b1e7f0f3d3d3b5573d0ab826d6e.jpg",
  genshin: "https://media.rawg.io/media/resize/640/-/screenshots/3b7/3b7f00f2f47ed0f8c3c31ef3dbd4adc6.jpg"
};

const brandLogos = {
  freefire: "https://www.logo.wine/a/logo/Garena_Free_Fire/Garena_Free_Fire-Logo.wine.svg",
  pubg: "https://commons.wikimedia.org/wiki/Special:FilePath/PUBG%20Mobile%20simple%20logo%20black.svg",
  codm: "https://commons.wikimedia.org/wiki/Special:FilePath/Call%20of%20Duty%20Mobile%202023%20logo.svg",
  genshin: "https://commons.wikimedia.org/wiki/Special:FilePath/Genshin%20Impact%20wordmark.svg",
  honkai: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Honkai_Star_Rail_logo.png",
  mobileLegends: "https://commons.wikimedia.org/wiki/Special:FilePath/Mobile%20Legends%20Logo.webp",
  valorant: "https://commons.wikimedia.org/wiki/Special:FilePath/Valorant%20logo.svg",
  playstation: "https://commons.wikimedia.org/wiki/Special:FilePath/Playstation%20logo%20colour.svg",
  exitlag: "https://www.exitlag.com/favicon.ico",
  gearup: "https://www.gearupbooster.com/favicon.ico"
};

const bannerSlides = [
  {
    title: "Free Fire Diamonds",
    text: "Recharge tes diamants en quelques secondes et prepare ton prochain rush.",
    cta: "Acheter maintenant",
    href: "/product/free-fire",
    image: "https://wallpapercave.com/wp/wp7536967.jpg",
    gradient: "from-[#0f5132]/25 via-[#1f8f75]/18 to-[#38bdf8]/12"
  },
  {
    title: "CODM CP Instant",
    text: "Achete tes CP Call of Duty Mobile et debloque skins, passes et armes premium.",
    cta: "Acheter maintenant",
    href: "/product/codm",
    image: "https://images.wallpapersden.com/image/download/call-of-duty-warzone-mobile-season-3_bmdqbW6UmZqaraWkpJRmbmdlrWZlbWU.jpg",
    gradient: "from-[#111827]/18 via-[#0f766e]/14 to-[#0ea5e9]/10"
  },
  {
    title: "Netflix Gift Card",
    text: "Recharge ton divertissement avec des cartes cadeaux Netflix pretes a utiliser.",
    cta: "Acheter maintenant",
    href: "/product/netflix",
    image: "https://m.media-amazon.com/images/I/B1cqB8zl+NS.jpg",
    gradient: "from-[#141414]/18 via-[#b91c1c]/16 to-[#ef4444]/10"
  },
  {
    title: "PUBG Mobile UC",
    text: "Obtiens tes UC PUBG Mobile rapidement pour skins, crates et royale pass.",
    cta: "Acheter maintenant",
    href: "/product/pubg-mobile",
    image: "https://images.wallpapersden.com/image/download/pubg-mobile-4k_bG5tbGmUmZqaraWkpJRmbmdlrWZlbWU.jpg",
    gradient: "from-[#134e4a]/20 via-[#0f766e]/16 to-[#f59e0b]/12"
  }
];

type GameCategoryLink = {
  abbr: string;
  label: string;
  image: string;
  href: string;
};

const categories = [
  { abbr: "CODM", label: "Call of Duty Mobile", image: brandLogos.codm, href: "/product/codm" },
  { abbr: "FF", label: "Free Fire", image: brandLogos.freefire, href: "/product/free-fire" },
  { abbr: "PUBG", label: "PUBG Mobile", image: brandLogos.pubg, href: "/product/pubg-mobile" },
  { abbr: "GI", label: "Genshin Impact", image: brandLogos.genshin, href: "/product/genshin-impact" },
  { abbr: "HSR", label: "Honkai: Star Rail", image: brandLogos.honkai, href: "/product/honkai-star-rail" },
  { abbr: "ML", label: "Mobile Legends", image: brandLogos.mobileLegends, href: "/product/mobile-legends" },
  { abbr: "LD", label: "Love and Deepspace", image: gameImages.fortnite, href: "/product/love-and-deepspace" },
  { abbr: "HOK", label: "Honor of Kings", image: gameImages.mobileLegends, href: "/product/honor-of-kings" },
  { abbr: "ZZZ", label: "Zenless Zone Zero", image: gameImages.valorant, href: "/product/zenless-zone-zero" },
  { abbr: "GB", label: "GearUp Booster", image: brandLogos.gearup, href: "/product/gearup-booster" },
  { abbr: "EX", label: "Exitlag", image: brandLogos.exitlag, href: "/product/exitlag" },
  { abbr: "VAL", label: "Valorant", image: brandLogos.valorant, href: "/product/valorant" },
  { abbr: "PS", label: "PlayStation", image: brandLogos.playstation, href: "/product/playstation" }
] satisfies GameCategoryLink[];

const promos = [
  {
    title: "Free Fire Diamonds",
    subtitle: "Bonus instant +8%",
    href: "/product/free-fire",
    logo: brandLogos.freefire,
    image: "https://wallpapercave.com/wp/wp7536967.jpg",
    accent: "from-[#fff7ed] via-white to-[#dbeafe]"
  },
  {
    title: "PUBG Mobile UC",
    subtitle: "Livraison auto rapide",
    href: "/product/pubg-mobile",
    logo: brandLogos.pubg,
    image: "https://images.wallpapersden.com/image/download/pubg-mobile-4k_bG5tbGmUmZqaraWkpJRmbmdlrWZlbWU.jpg",
    accent: "from-[#f4f4f5] via-[#fde68a] to-[#111827]"
  },
  {
    title: "Valorant Points",
    subtitle: "Code digital securise",
    href: "/product/valorant",
    logo: brandLogos.valorant,
    image: gameImages.valorant,
    accent: "from-[#fee2e2] via-white to-[#fecaca]"
  },
  {
    title: "Genshin Crystals",
    subtitle: "Recharge globale",
    href: "/product/genshin-impact",
    logo: brandLogos.genshin,
    image: gameImages.genshin,
    accent: "from-[#eff6ff] via-white to-[#fae8ff]"
  }
];

export default function Home() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    getCatalogProducts(32)
      .then((response) => {
        setProducts(response.data);
        setCatalogStatus(response.data.length ? "ready" : "empty");
      })
      .catch(() => setCatalogStatus("error"));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % bannerSlides.length);
    }, 2000);

    return () => window.clearInterval(timer);
  }, []);

  const catalogCategories = useMemo(() => {
    const gamesByName = new Map<string, CatalogProduct>();

    products.forEach((product) => {
      const name = product.game || product.name;

      if (!gamesByName.has(name)) {
        gamesByName.set(name, product);
      }
    });

    return Array.from(gamesByName.entries()).slice(0, 14).map(([name, product]) => ({
      abbr: name
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 4)
        .toUpperCase(),
      label: name,
      image: product.image_url || gameImages.pubg,
      href: `/product/${product.id}`
    }));
  }, [products]);

  const displayCategories = catalogCategories.length ? catalogCategories : categories;

  return (
    <main className="min-h-screen bg-white text-[#06101f]">
      <SiteHeader />

      <section className="mx-auto max-w-[1586px] px-6 pt-16">
        <div className="relative h-[336px] overflow-hidden rounded-[18px] bg-[#145d3f] text-white shadow-[0_1px_2px_rgba(16,24,40,.08)]">
          {bannerSlides.map((slide, index) => (
            <div
              key={slide.title}
              className={`absolute inset-0 transition-opacity duration-700 ${index === activeSlide ? "opacity-100" : "opacity-0"}`}
              aria-hidden={index !== activeSlide}
            >
              <img src={slide.image} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/0 to-transparent" />
              <div className="relative z-10 flex h-full max-w-[760px] flex-col justify-center pl-[156px]">
                <p className="mb-3 text-sm font-black uppercase tracking-[.18em] text-white/80">Recharge officielle Astral4Gamer</p>
                <h1 className="text-[44px] font-black leading-[1.05] tracking-[-.4px]">{slide.title}</h1>
                <p className="mt-4 max-w-[470px] text-[21px] font-medium leading-7 text-white/88">{slide.text}</p>
                <a href={slide.href} className="interactive-button mt-7 inline-flex h-11 w-[188px] items-center justify-center gap-2 rounded bg-white text-[14px] font-black text-[#111827] shadow-sm">
                  {slide.cta} <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
          <button onClick={() => setActiveSlide((activeSlide - 1 + bannerSlides.length) % bannerSlides.length)} className="absolute left-8 top-1/2 z-20 -translate-y-1/2 text-white/90">
            <ChevronLeft className="h-9 w-9 stroke-[1.6]" />
          </button>
          <button onClick={() => setActiveSlide((activeSlide + 1) % bannerSlides.length)} className="absolute right-8 top-1/2 z-20 -translate-y-1/2 text-white/90">
            <ChevronRight className="h-9 w-9 stroke-[1.6]" />
          </button>
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
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

      <section id="categories" className="mx-auto max-w-[1586px] px-6 pt-12">
        <div className="rounded-xl bg-[#f6f6f7] px-8 py-4">
          <div className="grid grid-cols-13">
            {displayCategories.slice(0, 13).map(({ abbr, label, image, href }) => (
              <a key={label} className="soft-pop flex min-w-0 flex-col items-center justify-start border-r border-[#d9d9dc] px-2 last:border-r-0" href={href}>
                {image ? (
                  <img src={image} alt={label} className="h-16 w-16 rounded-xl object-contain" />
                ) : (
                  <span className="grid h-16 w-16 place-items-center rounded-xl bg-[#eaf2ff] text-sm font-black text-[#0b55d9]">{abbr}</span>
                )}
                <span className="mt-2 block w-full truncate text-center text-[14px] leading-5 text-black">{label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-[1586px] px-6 py-9">
        <div className="mb-7 flex items-center justify-between">
          <h2 className="text-[21px] font-black">Produits les Plus Vendus</h2>
          <a className="flex items-center gap-1 text-[16px] text-[#0057d9]" href="#">Voir tout <ChevronRight className="h-5 w-5" /></a>
        </div>

        {catalogStatus === "loading" && <p className="rounded-lg bg-[#f6f6f7] p-5 text-sm text-[#4b5563]">Chargement du catalogue fournisseur...</p>}
        {catalogStatus === "empty" && <p className="rounded-lg bg-[#fff7ed] p-5 text-sm text-[#9a3412]">Catalogue en attente de synchronisation sur le serveur.</p>}
        {catalogStatus === "error" && <p className="rounded-lg bg-[#fef2f2] p-5 text-sm text-[#991b1b]">Impossible de charger le catalogue Astral4Gamer pour le moment.</p>}

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 xl:grid-cols-8">
          {products.map((product, index) => (
            <a href={`/product/${product.id}`} key={product.id} className={`soft-pop rounded-xl p-3 ${index === 3 ? "bg-[#f3f3f3]" : "bg-white"}`}>
              <div className="relative aspect-square overflow-hidden rounded-lg bg-[#f4f4f5]">
                {product.variation_id && <span className="absolute left-2 top-2 z-10 rounded bg-[#f04a25] px-2 py-1 text-[10px] font-black text-white">API</span>}
                <img src={product.image_url || gameImages.pubg} alt={product.name} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
              </div>
              <div className="px-1 py-3">
                <h3 className="min-h-[42px] text-[14px] font-medium leading-5 text-[#004bd6]">{product.name}</h3>
                <p className="mt-5 text-right text-[14px] text-black">{product.price ? `${product.price} ${product.currency}` : "Prix API"}</p>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {promos.map((promo) => (
            <a key={promo.title} href={promo.href} className={`soft-pop group relative h-[218px] overflow-hidden rounded-xl bg-gradient-to-r ${promo.accent} p-7`}>
              <img src={promo.image} alt={promo.title} className="absolute inset-y-0 right-0 h-full w-[58%] object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/78 to-transparent" />
              <div className="relative z-10 flex h-full max-w-[205px] flex-col">
                <span className="grid h-12 w-24 place-items-center rounded-md bg-white/95 p-2 shadow-sm">
                  <img src={promo.logo} alt={`${promo.title} logo`} className="max-h-full max-w-full object-contain" />
                </span>
                <h3 className="mt-4 text-[24px] font-black leading-6 text-[#111827]">{promo.title}</h3>
                <p className="mt-2 text-sm font-black uppercase text-[#1f2937]">{promo.subtitle}</p>
                <span className="mt-auto inline-flex w-max items-center rounded bg-[#111827] px-3 py-2 text-[11px] font-black text-white shadow-sm">
                  Acheter <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
