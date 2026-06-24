"use client";

import { useUser } from "@clerk/nextjs";
import { Bell, ChevronDown, Copy, Gift, Globe2, Home, Loader2, Mail, Menu, Search, ShoppingCart, UserRound, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { CountryFlag } from "@/components/country-flag";
import { useLanguage, type DisplayCurrency, type SiteLanguage } from "@/components/language-provider";
import { hasCatalogProductImage, resolveCatalogImage } from "@/lib/catalog-images";
import { getAstralMails, getCatalogProducts, getHeaderNotifications, markAstralMailRead, type AstralMailMessage, type CatalogProduct, type HeaderNotification } from "@/lib/api";

const brandLogo = "/ChatGPT_Image_28_mai_2026__20_26_02-removebg-preview.png";

type StoredFreeFireProfile = {
  uid?: string | null;
  region?: string | null;
  nickname?: string | null;
  outfit_url?: string | null;
};

type StoredCodProfile = {
  username?: string | null;
  cod_username?: string | null;
  activision_id?: string | null;
  avatar_url?: string | null;
};

type StoredFortniteProfile = {
  name?: string | null;
  account_id?: string | null;
  avatar_url?: string | null;
};

type PublicRedeemCode = {
  id: string;
  preview: string;
  length: number;
  source?: string;
  date?: string;
  articleTitle?: string;
  articleLink?: string;
};

type RedeemPayload = {
  enabled: boolean;
  message: string;
  codes: PublicRedeemCode[];
  claimedToday?: boolean;
  usage?: { usedToday?: number; dailyLimit?: number; remainingToday?: number } | null;
};

type NavMenuItem = {
  name: string;
  image: string;
  href: string;
};

const liveItems = [
  { name: "Live en direct", image: "/icon.svg", href: "/live" },
  { name: "Lives passés", image: "/icon.svg", href: "/live/passe" }
] satisfies NavMenuItem[];

function productsToMenuItems(products: CatalogProduct[], limit = 24): NavMenuItem[] {
  const byName = new Map<string, CatalogProduct>();

  products.forEach((product) => {
    const name = product.name.trim();

    if (name && hasCatalogProductImage(product) && !byName.has(name)) {
      byName.set(name, product);
    }
  });

  return Array.from(byName.values()).slice(0, limit).map((product) => ({
    name: product.name,
    image: resolveCatalogImage(product),
    href: `/product/${product.id}`
  }));
}

function catalogProductPrice(
  product: CatalogProduct,
  language: SiteLanguage,
  formatMoney: (value: number, sourceCurrency?: string, options?: { unavailableLabel?: string; prefix?: string }) => string
) {
  const variationPrices = (product.variations ?? [])
    .map((variation) => Number(variation.price))
    .filter((price) => price > 0);
  const price = Number(product.price) > 0 ? Number(product.price) : Math.min(...variationPrices);

  if (!Number.isFinite(price) || price <= 0) {
    return language === "fr" ? "Prix indisponible" : "Price unavailable";
  }

  const hasRange = variationPrices.length > 1 || Boolean(product.price_range?.min && product.price_range?.max && product.price_range.min !== product.price_range.max);

  return formatMoney(price, product.currency, {
    prefix: hasRange ? (language === "fr" ? "Dès " : "From ") : "",
    unavailableLabel: language === "fr" ? "Prix indisponible" : "Price unavailable"
  });
}

function searchableProductText(product: CatalogProduct, field: "name" | "all" = "all") {
  const text = field === "name"
    ? product.name
    : `${product.name} ${product.game ?? ""} ${product.category ?? ""} ${product.public_reference ?? ""} ${product.sku ?? ""}`;

  return normalizeSearch(text);
}

function rankSearchProduct(product: CatalogProduct, query: string) {
  const normalizedQuery = normalizeSearch(query);
  const terms = normalizedQuery.split(" ").filter(Boolean);
  const name = searchableProductText(product, "name");
  const all = searchableProductText(product, "all");
  let score = 0;

  if (!terms.length) return score;
  if (name === normalizedQuery) score += 1000;
  if (name.includes(normalizedQuery)) score += 600;
  if (terms.every((term) => name.includes(term))) score += 450;
  if (terms.every((term) => all.includes(term))) score += 220;

  terms.forEach((term) => {
    if (name.includes(term)) score += 45;
    else if (all.includes(term)) score += 12;
  });

  if (name.startsWith(terms[0] ?? "")) score += 40;
  if (Number(product.price) > 0 || Number(product.price_range?.min) > 0) score += 5;

  return score;
}

function sortSearchSuggestions(products: CatalogProduct[], query: string) {
  return [...products]
    .map((product, index) => ({ product, index, score: rankSearchProduct(product, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.product)
    .slice(0, 8);
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="interactive-link flex h-10 shrink-0 items-center gap-1 text-black md:h-12">
      {children}
    </a>
  );
}

function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function MobileNavSheet({ title, href, items, onClose }: { title: string; href: string; items: NavMenuItem[]; onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[120] bg-black/45 p-3 md:hidden" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ml-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[420px] flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_70px_rgba(15,23,42,.28)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-[#edf0f4] px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase text-[#e52b2f]">Astral4Gamer</p>
            <h2 className="text-lg font-medium text-[#111827]">{title}</h2>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#f4f4f5]" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-2 overflow-y-auto p-3">
          {items.length ? items.map((item) => (
            <a key={item.name} href={item.href} className="flex min-h-14 items-center gap-3 rounded-lg border border-[#edf0f4] bg-white px-3 py-2 text-sm font-normal text-[#111827] shadow-[0_6px_18px_rgba(16,24,40,.04)]">
              <img
                src={item.image}
                alt=""
                onError={(event) => {
                  event.currentTarget.closest("a")?.remove();
                }}
                className="h-9 w-9 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <ChevronDown className="-rotate-90 h-4 w-4 text-[#98a2b3]" />
            </a>
          )) : <p className="rounded-lg bg-[#f8fafc] px-3 py-6 text-center text-sm font-normal text-[#667085]">Chargement du catalogue...</p>}
        </div>
        <div className="border-t border-[#edf0f4] p-3">
          <a href={href} className="flex h-11 items-center justify-center rounded-lg bg-[#e52b2f] text-sm font-medium text-white">
            Voir tout
          </a>
        </div>
      </div>
    </div>
  );
}

function NavDropdown({ href, label, items }: { href: string; label: string; items: NavMenuItem[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="group relative shrink-0">
      <a
        href={href}
        onClick={(event) => {
          if (isMobileViewport()) {
            event.preventDefault();
            setMobileOpen(true);
          }
        }}
        className="interactive-link flex h-10 items-center gap-1 text-[#0057d9] md:h-12"
      >
        {label} <ChevronDown className="h-4 w-4 stroke-[2.4] transition group-hover:rotate-180" />
      </a>
      <div className="invisible absolute left-0 top-12 z-50 hidden w-[min(1024px,calc(100vw-2rem))] rounded-b-lg bg-[#f3f3f3] px-4 pb-4 pt-5 opacity-0 shadow-[0_12px_32px_rgba(16,24,40,.12)] transition group-hover:visible group-hover:opacity-100 md:block">
        <div className="grid grid-cols-3 gap-x-12 gap-y-3 font-normal">
          {items.length ? items.map((item) => (
            <a key={item.name} href={item.href} className="flex min-w-0 items-center gap-3 rounded-md px-2 py-1.5 text-black transition hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-[0_8px_18px_rgba(16,24,40,.08)]">
              <img
                src={item.image}
                alt=""
                onError={(event) => {
                  event.currentTarget.closest("a")?.remove();
                }}
                className="h-11 w-11 shrink-0 rounded-lg bg-white object-cover shadow-sm ring-1 ring-black/5"
              />
              <span className="line-clamp-2 min-w-0 break-words text-[13px] font-normal leading-[18px]">{item.name}</span>
            </a>
          )) : <p className="col-span-3 rounded-lg bg-white px-4 py-8 text-center text-sm font-normal text-[#667085]">Chargement du catalogue...</p>}
        </div>
        <div className="mt-5 border-t border-[#d8d8d8] pt-3 text-center font-medium text-[#0057d9]">
          <a href={href}>Voir tout</a>
        </div>
      </div>
      {mobileOpen ? <MobileNavSheet title={label} href={href} items={items} onClose={() => setMobileOpen(false)} /> : null}
    </div>
  );
}

function LiveDropdown({ label = "Live Direct" }: { label?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="group relative shrink-0">
      <a
        href="/live"
        onClick={(event) => {
          if (isMobileViewport()) {
            event.preventDefault();
            setMobileOpen(true);
          }
        }}
        className="interactive-link flex h-10 items-center gap-1 text-[#0057d9] md:h-12"
      >
        {label} <ChevronDown className="h-4 w-4 stroke-[2.4] transition group-hover:rotate-180" />
      </a>
      <div className="invisible absolute left-0 top-12 z-50 hidden w-48 rounded-b-lg bg-white p-2 opacity-0 shadow-[0_12px_32px_rgba(16,24,40,.12)] ring-1 ring-[#edf0f4] transition group-hover:visible group-hover:opacity-100 md:block">
        <a href="/live" className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-normal text-[#111827] transition hover:bg-[#f8fafc] hover:text-[#0057d9]">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_0_4px_rgba(239,68,68,.12)]" />
          Live
        </a>
        <a href="/live/passe" className="flex h-10 items-center rounded-md px-3 text-sm font-normal text-[#111827] transition hover:bg-[#f8fafc] hover:text-[#0057d9]">
          Live Passé
        </a>
      </div>
      {mobileOpen ? <MobileNavSheet title={label} href="/live" items={liveItems} onClose={() => setMobileOpen(false)} /> : null}
    </div>
  );
}

function PubgDropdown() {
  const items = [
    ["/pubg", "Tableau de bord"],
    ["/pubg/historique", "Historique des derniers matchs"],
    ["/pubg/classement", "Classement TOP 500"],
    ["/pubg/match", "Chercher un match"],
    ["/pubg/comparateur", "Comparateur de joueur"]
  ];

  return (
    <div className="group relative shrink-0">
      <a href="/pubg" className="interactive-link flex h-10 items-center gap-1 text-[#0057d9] md:h-12">
        PUBG Hub <ChevronDown className="h-4 w-4 stroke-[2.4] transition group-hover:rotate-180" />
      </a>
      <div className="invisible absolute left-0 top-12 z-50 hidden w-[280px] rounded-b-lg bg-white p-2 opacity-0 shadow-[0_12px_32px_rgba(16,24,40,.12)] ring-1 ring-[#edf0f4] transition group-hover:visible group-hover:opacity-100 md:block">
        {items.map(([href, label]) => (
          <a key={href} href={href} className="flex h-10 items-center rounded-md px-3 text-sm font-normal text-[#111827] transition hover:bg-[#f8fafc] hover:text-[#0057d9]">
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { isSignedIn, user } = useUser();
  const { itemCount, openCart } = useCart();
  const { language, currency, setLanguage, setCurrency, t, formatMoney } = useLanguage();
  const [searchValue, setSearchValue] = useState("");
  const [redeemPayload, setRedeemPayload] = useState<RedeemPayload | null>(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState("");
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mailMessages, setMailMessages] = useState<AstralMailMessage[]>([]);
  const [mailCount, setMailCount] = useState(0);
  const [mailOpen, setMailOpen] = useState(false);
  const [showPubgNav, setShowPubgNav] = useState(false);
  const [showCodNav, setShowCodNav] = useState(false);
  const [topUpItems, setTopUpItems] = useState<NavMenuItem[]>([]);
  const [giftItems, setGiftItems] = useState<NavMenuItem[]>([]);
  const [gameKeyItems, setGameKeyItems] = useState<NavMenuItem[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<CatalogProduct[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);

  useEffect(() => {
    function closeSearch(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchFocused(false);
        setNotificationOpen(false);
        setMailOpen(false);
        setLanguageOpen(false);
        setCategorySheetOpen(false);
      }
    }

    window.addEventListener("keydown", closeSearch);
    return () => window.removeEventListener("keydown", closeSearch);
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchValue.trim();

    if (!query) {
      return;
    }

    if (redeemOpen) {
      return;
    }

    window.location.href = catalogSearchHref(query);
  }

  useEffect(() => {
    const normalizedSearch = normalizeSearch(searchValue);
    const shouldOpenRedeem = [
      "code gratuit",
      "codes gratuits",
      "redeem",
      "redem",
      "code free fire",
      "codes free fire",
      "free fire code",
      "free fire codes"
    ].some((term) => normalizedSearch.includes(term));

    if (!shouldOpenRedeem) {
      setRedeemOpen(false);
      return;
    }

    let cancelled = false;

    async function loadRedeemCodes() {
      setRedeemOpen(true);
      setRedeemLoading(true);
      setRedeemMessage("");

      try {
        const response = await fetch("/api/freefire/redeem", { cache: "no-store" });
        const payload = await response.json();

        if (!cancelled) {
          setRedeemPayload(payload);
        }
      } catch {
        if (!cancelled) {
          setRedeemPayload({ enabled: false, message: "Impossible de charger les codes gratuits pour le moment.", codes: [] });
        }
      } finally {
        if (!cancelled) {
          setRedeemLoading(false);
        }
      }
    }

    loadRedeemCodes();

    return () => {
      cancelled = true;
    };
  }, [searchValue]);

  useEffect(() => {
    const query = searchValue.trim();

    if (query.length < 2 || redeemOpen) {
      setSearchSuggestions([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      getCatalogProducts(40, { q: query })
        .then((payload) => {
          if (!cancelled) {
            setSearchSuggestions(sortSearchSuggestions(payload.data.filter(hasCatalogProductImage), query));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSearchSuggestions([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearchLoading(false);
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [redeemOpen, searchValue]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogMenus() {
      try {
        const [topUps, gifts, gameKeys] = await Promise.all([
          getCatalogProducts(240, { category: "top-up" }),
          getCatalogProducts(240, { category: "gift-card" }),
          getCatalogProducts(240, { category: "game-key" })
        ]);

        if (!cancelled) {
          setTopUpItems(productsToMenuItems(topUps.data));
          setGiftItems(productsToMenuItems(gifts.data));
          setGameKeyItems(productsToMenuItems(gameKeys.data));
        }
      } catch {
        if (!cancelled) {
          setTopUpItems([]);
          setGiftItems([]);
          setGameKeyItems([]);
        }
      }
    }

    loadCatalogMenus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      const payload = await getHeaderNotifications();

      if (!cancelled) {
        setNotifications(payload.items);
        setNotificationCount(payload.unread_count);
      }
    }

    loadNotifications();
    const timer = window.setInterval(loadNotifications, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    function readActiveGame() {
      const metadata = user?.unsafeMetadata as Record<string, unknown> | null | undefined;
      const metadataGame = typeof metadata?.favorite_game === "string"
        ? metadata.favorite_game
        : typeof metadata?.game === "string"
          ? metadata.game
          : null;
      const localGame = localStorage.getItem("astral_favorite_game");
      const hasPubgProfile = Boolean(localStorage.getItem("astral_pubg_profile"));
      const hasCodProfile = Boolean(localStorage.getItem("astral_cod_profile"));
      const hasFreeFireProfile = Boolean(localStorage.getItem("astral_freefire_profile"));
      const activeGame = (localGame ?? metadataGame ?? "").trim().toLowerCase();

      setShowPubgNav((activeGame === "pubg" || hasPubgProfile) && !hasFreeFireProfile);
      setShowCodNav((activeGame === "call_of_duty" || activeGame === "call of duty" || activeGame === "cod" || hasCodProfile) && !hasFreeFireProfile && !hasPubgProfile);
    }

    readActiveGame();
    window.addEventListener("storage", readActiveGame);
    window.addEventListener("focus", readActiveGame);

    return () => {
      window.removeEventListener("storage", readActiveGame);
      window.removeEventListener("focus", readActiveGame);
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadMails() {
      const token = localStorage.getItem("nexy_sanctum_token");
      const payload = await getAstralMails(token);

      if (!cancelled) {
        setMailMessages(payload.messages);
        setMailCount(payload.unread_count);
      }
    }

    loadMails();
    window.addEventListener("storage", loadMails);
    window.addEventListener("focus", loadMails);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", loadMails);
      window.removeEventListener("focus", loadMails);
    };
  }, []);

  async function copyRedeemCode(codeId: string) {
    if (!isSignedIn) {
      setRedeemMessage("Connecte-toi pour copier un code gratuit.");
      return;
    }

    setRedeemMessage("");

    try {
      const response = await fetch("/api/freefire/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeId })
      });
      const payload = await response.json();

      if (!response.ok) {
        setRedeemMessage(payload.message ?? "Impossible de copier ce code.");
        return;
      }

      await navigator.clipboard.writeText(payload.code);
      setRedeemMessage(payload.message ?? "Code copié.");
      setRedeemPayload((current) => current ? { ...current, claimedToday: true } : current);
    } catch {
      setRedeemMessage("Impossible de copier ce code. Réessaie dans un instant.");
    }
  }

  return (
    <header className="border-b border-[#e5e7eb] bg-white">
      <div className="relative flex h-10 items-center justify-center bg-[#e52b2f] px-8 text-center text-[11px] font-semibold leading-4 text-white md:h-10 md:px-4 md:text-sm">
        <span className="truncate">{t("offers")}</span>
        <X className="absolute right-4 hidden h-5 w-5 md:block" />
      </div>
      <div className="mx-auto max-w-[1452px] px-3 sm:px-6">
        <div className="flex min-h-[58px] flex-wrap items-center gap-x-2 gap-y-2 py-2 md:h-[108px] md:flex-nowrap md:gap-8 md:py-0">
          <a href="/" className="flex min-w-0 shrink-0 items-center gap-1.5 transition active:scale-[.98] md:min-w-[300px] md:gap-3 md:hover:scale-[1.01] xl:min-w-[360px]" aria-label="Astral4Gamer">
            <span className="relative h-9 w-9 shrink-0 overflow-hidden sm:h-12 sm:w-12 md:h-[96px] md:w-[96px]">
              <img src={brandLogo} alt="" className="absolute left-[-32px] top-[-6px] h-auto w-[104px] max-w-none md:left-[-72px] md:top-[-13px] md:w-[232px]" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[17px] font-black italic tracking-normal text-black min-[375px]:text-[19px] sm:text-[22px] md:text-[31px]">
                ASTRAL<span className="text-[#e52b2f]">4</span>GAMER
              </span>
              <span className="mt-1 hidden text-center text-[8px] font-black tracking-[.24em] text-black sm:block md:mt-3 md:text-[10px] md:tracking-[.48em]">
                <span className="text-[#e52b2f]">PLAY</span> • COMPETE • WIN
              </span>
            </span>
          </a>
          <form onSubmit={submitSearch} className="relative order-3 w-full basis-full md:order-none md:w-auto md:basis-auto md:flex-1">
            <label className="group flex h-10 items-center rounded-lg bg-[#f4f4f5] px-3 text-[#5f6673] transition focus-within:bg-white focus-within:shadow-[0_0_0_2px_rgba(11,103,240,.18),0_12px_30px_rgba(16,24,40,.08)] md:h-12 md:px-4">
              <Search className="mr-2 h-4 w-4 transition group-focus-within:text-[#0b67f0] md:mr-3 md:h-5 md:w-5" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onFocus={() => {
                  setSearchFocused(true);
                  setNotificationOpen(false);
                  setMailOpen(false);
                  setLanguageOpen(false);
                }}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 140)}
                className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#4b5563] md:text-[15px]"
                placeholder={t("search")}
              />
            </label>
            {searchFocused && !redeemOpen && searchValue.trim().length >= 2 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[110] max-h-[min(62dvh,480px)] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_22px_60px_rgba(16,24,40,.22)] md:right-auto md:top-[58px] md:max-h-none md:w-full md:max-w-[720px]">
                <div className="flex items-center justify-between border-b border-[#edf0f4] px-3 py-2">
                  <p className="text-xs font-medium uppercase text-[#667085]">{t("quickResults")}</p>
                  <a
                    href={catalogSearchHref(searchValue.trim())}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      window.location.href = catalogSearchHref(searchValue.trim());
                    }}
                    className="text-xs font-medium text-[#0057d9]"
                  >
                    {t("seeAll")}
                  </a>
                </div>
                {searchLoading ? (
                  <div className="flex h-20 items-center justify-center gap-2 text-sm font-normal text-[#667085]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("searching")}
                  </div>
                ) : searchSuggestions.length ? (
                  <div className="max-h-[calc(min(62dvh,480px)-46px)] overflow-y-auto overscroll-contain p-2 md:max-h-[380px]">
                    {searchSuggestions.map((product) => (
                      <a
                        key={product.id}
                        href={`/product/${product.id}`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          window.location.href = `/product/${product.id}`;
                        }}
                        className="grid min-h-[62px] grid-cols-[46px_minmax(0,1fr)] items-center gap-2 rounded-lg px-2 py-2 transition active:scale-[.99] active:bg-[#f1f5f9] hover:bg-[#f8fafc] sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-3"
                      >
                        <img
                          src={resolveCatalogImage(product)}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.closest("a")?.remove();
                          }}
                          className="h-11 w-11 shrink-0 rounded-lg bg-[#f4f4f5] object-cover sm:h-12 sm:w-12"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-normal text-[#111827]">{product.name}</span>
                          <span className="mt-0.5 block truncate text-xs font-semibold text-[#667085]">{product.category ?? product.type ?? "Catalogue"}</span>
                          <span className="mt-1 block text-xs font-normal text-[#111827] sm:hidden">{catalogProductPrice(product, language, formatMoney)}</span>
                        </span>
                        <span className="hidden shrink-0 text-right text-xs font-normal text-[#111827] sm:block">{catalogProductPrice(product, language, formatMoney)}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm font-normal text-[#111827]">{t("noProduct")}</p>
                    <p className="mt-1 text-xs font-semibold text-[#667085]">{t("tryAnother")}</p>
                  </div>
                )}
              </div>
            ) : null}
            {redeemOpen ? (
              <div className="absolute left-0 top-[48px] z-[80] w-full rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-[0_22px_60px_rgba(16,24,40,.18)] md:top-[58px] md:max-w-[640px] md:p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 text-[#e52b2f]">
                      <Gift className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-[#111827]">Codes gratuits Free Fire</p>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#667085] md:line-clamp-none">
                        Les codes disponibles peuvent provenir de différents serveurs Free Fire. Sélectionne un code et tente de trouver celui compatible avec ta région.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setRedeemOpen(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-[#f4f4f5]" aria-label="Fermer les codes">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {redeemLoading ? (
                  <div className="mt-4 flex h-20 items-center justify-center gap-2 rounded-lg bg-[#fbfbfd] text-sm font-black text-[#667085]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des codes du jour...
                  </div>
                ) : redeemPayload?.enabled === false ? (
                  <div className="mt-4 rounded-lg border border-[#fee2e2] bg-[#fff5f5] p-3 text-sm font-bold text-[#b42318]">
                    {redeemPayload.message}
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid max-h-[260px] gap-2 overflow-y-auto pr-1">
                      {(redeemPayload?.codes ?? []).slice(0, 8).map((code) => (
                        <div key={code.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#edf0f4] bg-[#fbfbfd] p-3">
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-black tracking-[.12em] text-[#111827]">{code.preview}</p>
                            <p className="mt-1 truncate text-[11px] font-semibold text-[#667085]">
                              {code.date || "Code vérifié"}
                            </p>
                          </div>
                          <button
                            onClick={() => copyRedeemCode(code.id)}
                            disabled={Boolean(redeemPayload?.claimedToday)}
                            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-[#e52b2f] px-3 text-xs font-black text-white transition hover:bg-[#c91f27] disabled:bg-[#d0d5dd]"
                          >
                            <Copy className="h-4 w-4" />
                            Copier
                          </button>
                        </div>
                      ))}
                    </div>
                    {redeemPayload?.codes?.length ? null : (
                      <div className="mt-4 rounded-lg border border-[#e5e7eb] bg-[#fbfbfd] p-3 text-sm font-bold text-[#667085]">
                        Aucun code disponible pour le moment.
                      </div>
                    )}
                    {redeemPayload?.claimedToday ? (
                      <p className="mt-3 text-xs font-black text-[#e52b2f]">Tu as déjà copié ton code gratuit aujourd’hui.</p>
                    ) : null}
                  </>
                )}

                {redeemMessage ? <p className="mt-3 rounded-md bg-[#fff7ed] px-3 py-2 text-xs font-black text-[#9a3412]">{redeemMessage}</p> : null}
              </div>
            ) : null}
          </form>
          <div className="ml-auto flex min-w-0 items-center justify-end gap-1 text-black sm:gap-2 md:min-w-[120px] md:gap-5">
            <div className="relative">
              <button type="button" onClick={() => {
                setLanguageOpen((open) => !open);
                setNotificationOpen(false);
                setMailOpen(false);
                setSearchFocused(false);
              }} className="interactive-icon relative grid h-9 w-9 place-items-center rounded-full hover:bg-[#f4f4f5] md:h-10 md:w-10" aria-label={t("language")} aria-expanded={languageOpen}>
                <Globe2 className="h-5 w-5 md:h-6 md:w-6" />
                <span className="absolute -bottom-0.5 -right-0.5 rounded-sm bg-[#0957ef] px-1 text-[9px] font-bold uppercase leading-3 text-white">{language}</span>
              </button>
              {languageOpen ? <LanguageMenu language={language} currency={currency} onSelect={(nextLanguage) => {
                setLanguage(nextLanguage);
              }} onCurrencySelect={(nextCurrency) => {
                setCurrency(nextCurrency);
                setLanguageOpen(false);
              }} /> : null}
            </div>
            <button type="button" onClick={openCart} className="interactive-icon relative grid h-9 w-9 place-items-center rounded-full hover:bg-[#f4f4f5] md:h-10 md:w-10" aria-label={t("cart")}>
              <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
              {itemCount > 0 ? <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#e52b2f] px-1 text-[10px] font-black text-white ring-2 ring-white">{itemCount > 99 ? "99+" : itemCount}</span> : null}
            </button>
            <div className="relative hidden sm:block">
              <HeaderBadgeButton label={t("notifications")} count={notificationCount} icon={<Bell className="h-5 w-5" />} onClick={() => {
                setNotificationOpen((open) => !open);
                setMailOpen(false);
                setSearchFocused(false);
                setLanguageOpen(false);
              }} />
              {notificationOpen ? <NotificationMenu items={notifications} onClose={() => setNotificationOpen(false)} /> : null}
            </div>
            <div className="relative hidden sm:block">
              <HeaderBadgeButton label={t("messages")} count={mailCount} icon={<Mail className="h-5 w-5" />} onClick={() => {
                setMailOpen((open) => !open);
                setNotificationOpen(false);
                setSearchFocused(false);
                setLanguageOpen(false);
              }} />
              {mailOpen ? <MailMenu messages={mailMessages} onClose={() => setMailOpen(false)} onRead={(message) => {
                if (message.mail_id) {
                  markAstralMailRead(localStorage.getItem("nexy_sanctum_token"), message.mail_id);
                }
              }} /> : null}
            </div>
            <NexyAccountSlot compactOnMobile />
          </div>
        </div>

        <nav className="hidden h-11 items-center gap-4 overflow-x-auto whitespace-nowrap text-[13px] font-normal md:flex md:h-12 md:overflow-visible md:gap-8 md:text-[16px]">
          <NavLink href="/">{t("home")}</NavLink>
          <NavDropdown href="/category/top-up" label={t("gameCredits")} items={topUpItems} />
          <NavDropdown href="/category/carte-cadeau" label={t("giftCards")} items={giftItems} />
          <NavDropdown href="/category/game-keys" label={language === "fr" ? "Clés de jeux" : "Game Keys"} items={gameKeyItems} />
	          <LiveDropdown label={t("live")} />
	          {showPubgNav ? <PubgDropdown /> : null}
	          <NavLink href="/tournois">{t("tournaments")}</NavLink>
	          {!showPubgNav && !showCodNav ? <NavLink href="/duel">{t("duel")}</NavLink> : null}
	          <NavLink href="/profil-public">{t("publicProfile")}</NavLink>
	          {!showCodNav ? <NavLink href="/partenariat">{t("partnership")}</NavLink> : null}
	          <NavLink href="/jeux-avenir">{t("upcoming")}</NavLink>
	          <NavLink href="/blog">{t("blog")}</NavLink>
        </nav>
      </div>
      {categorySheetOpen ? (
        <MobileCategoryDrawer
          topUpItems={topUpItems}
          giftItems={giftItems}
          gameKeyItems={gameKeyItems}
          liveItems={liveItems}
          labels={{
            title: language === "fr" ? "Catégories" : "Categories",
            home: t("home"),
            gameCredits: t("gameCredits"),
            giftCards: t("giftCards"),
            gameKeys: language === "fr" ? "Clés de jeux" : "Game Keys",
            live: t("live"),
            tournaments: t("tournaments"),
            duel: t("duel"),
            publicProfile: t("publicProfile"),
            partnership: t("partnership"),
            upcoming: t("upcoming"),
            blog: t("blog"),
            seeAll: t("seeAll")
          }}
          onClose={() => setCategorySheetOpen(false)}
        />
      ) : null}
      <MobileBottomNavigation
        itemCount={itemCount}
        labels={{
          home: t("home"),
          categories: language === "fr" ? "Catégories" : "Categories",
          cart: t("cart"),
          account: language === "fr" ? "Mon Compte" : "Account"
        }}
        onOpenCategories={() => setCategorySheetOpen(true)}
        onOpenCart={openCart}
      />
    </header>
  );
}

function LanguageMenu({
  language,
  currency,
  onSelect,
  onCurrencySelect
}: {
  language: SiteLanguage;
  currency: DisplayCurrency;
  onSelect: (language: SiteLanguage) => void;
  onCurrencySelect: (currency: DisplayCurrency) => void;
}) {
  const options: Array<{ code: SiteLanguage; label: string; country: string }> = [
    { code: "fr", label: "Français", country: "FR" },
    { code: "en", label: "English", country: "US" }
  ];
  const currencies: Array<{ code: DisplayCurrency; label: string }> = [
    { code: "USD", label: "USD" },
    { code: "EUR", label: "EUR" },
    { code: "XOF", label: "FCFA" }
  ];

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[130] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-[0_22px_60px_rgba(16,24,40,.22)] sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-12 sm:w-56" role="menu">
      {options.map((option) => (
        <button key={option.code} type="button" onClick={() => onSelect(option.code)} className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition hover:bg-[#f8fafc] ${language === option.code ? "bg-[#eff6ff] text-[#0b55d9]" : "text-[#111827]"}`} role="menuitem">
          <span className="grid h-7 w-9 place-items-center rounded bg-[#f8fafc] ring-1 ring-[#e5e7eb]">
            <CountryFlag code={option.country} label={option.label} />
          </span>
          <span className="font-semibold">{option.label}</span>
          {language === option.code ? <span className="ml-auto h-2 w-2 rounded-full bg-[#0b55d9]" /> : null}
        </button>
      ))}
      <div className="my-2 h-px bg-[#edf0f4]" />
      <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[.14em] text-[#667085]">{language === "fr" ? "Devise" : "Currency"}</p>
      <div className="grid grid-cols-3 gap-1 px-1 pb-1">
        {currencies.map((option) => (
          <button key={option.code} type="button" onClick={() => onCurrencySelect(option.code)} className={`h-9 rounded-lg text-xs font-black transition hover:bg-[#f8fafc] ${currency === option.code ? "bg-[#111827] text-white" : "bg-[#f4f4f5] text-[#111827]"}`} role="menuitem">
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileBottomNavigation({ itemCount, labels, onOpenCategories, onOpenCart }: {
  itemCount: number;
  labels: { home: string; categories: string; cart: string; account: string };
  onOpenCategories: () => void;
  onOpenCart: () => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[95] grid h-[64px] grid-cols-4 border-t border-[#e5e7eb] bg-white/98 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_28px_rgba(16,24,40,.08)] backdrop-blur md:hidden" aria-label="Navigation mobile">
      <a href="/" className="interactive-icon flex flex-col items-center justify-center gap-0.5 text-[#0b55d9]">
        <Home className="h-6 w-6" />
        <span className="text-[11px] font-medium">{labels.home}</span>
      </a>
      <button type="button" onClick={onOpenCategories} className="interactive-icon flex flex-col items-center justify-center gap-0.5 text-[#4b5563]">
        <Menu className="h-6 w-6" />
        <span className="text-[11px] font-medium">{labels.categories}</span>
      </button>
      <button type="button" onClick={onOpenCart} className="interactive-icon relative flex flex-col items-center justify-center gap-0.5 text-[#4b5563]">
        <span className="relative">
          <ShoppingCart className="h-6 w-6" />
          {itemCount > 0 ? <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#e52b2f] px-1 text-[10px] font-black text-white">{itemCount > 99 ? "99+" : itemCount}</span> : null}
        </span>
        <span className="text-[11px] font-medium">{labels.cart}</span>
      </button>
      <a href="/profil" className="interactive-icon flex flex-col items-center justify-center gap-0.5 text-[#4b5563]">
        <UserRound className="h-6 w-6" />
        <span className="text-[11px] font-medium">{labels.account}</span>
      </a>
    </nav>
  );
}

function MobileCategoryDrawer({ topUpItems, giftItems, gameKeyItems, liveItems, labels, onClose }: {
  topUpItems: NavMenuItem[];
  giftItems: NavMenuItem[];
  gameKeyItems: NavMenuItem[];
  liveItems: NavMenuItem[];
  labels: {
    title: string;
    home: string;
    gameCredits: string;
    giftCards: string;
    gameKeys: string;
    live: string;
    tournaments: string;
    duel: string;
    publicProfile: string;
    partnership: string;
    upcoming: string;
    blog: string;
    seeAll: string;
  };
  onClose: () => void;
}) {
  const [openSection, setOpenSection] = useState<string | null>("game");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const sections = [
    { key: "game", label: labels.gameCredits, href: "/category/top-up", items: topUpItems },
    { key: "gift", label: labels.giftCards, href: "/category/carte-cadeau", items: giftItems },
    { key: "keys", label: labels.gameKeys, href: "/category/game-keys", items: gameKeyItems },
    { key: "live", label: labels.live, href: "/live", items: liveItems }
  ];
  const directLinks = [
    { label: labels.tournaments, href: "/tournois" },
    { label: labels.duel, href: "/duel" },
    { label: labels.publicProfile, href: "/profil-public" },
    { label: labels.partnership, href: "/partenariat" },
    { label: labels.upcoming, href: "/jeux-avenir" },
    { label: labels.blog, href: "/blog" }
  ];

  return (
    <div className="fixed inset-0 z-[140] bg-black/35 md:hidden" role="dialog" aria-modal="true" aria-label={labels.title} onClick={onClose}>
      <section className="flex h-[100dvh] w-full max-w-[440px] flex-col bg-white shadow-[22px_0_70px_rgba(15,23,42,.22)]" onClick={(event) => event.stopPropagation()}>
        <header className="flex h-14 items-center gap-3 border-b border-[#e5e7eb] px-4">
          <button type="button" onClick={onClose} className="interactive-icon grid h-10 w-10 place-items-center rounded-full hover:bg-[#f4f4f5]" aria-label="Fermer">
            <X className="h-6 w-6" />
          </button>
          <h2 className="text-base font-black text-[#111827]">{labels.title}</h2>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-24">
          <a href="/" onClick={onClose} className="flex min-h-11 items-center text-[15px] font-medium text-[#111827]">{labels.home}</a>
          {sections.map((section) => {
            const open = openSection === section.key;

            return (
              <div key={section.key} className="border-b border-[#f1f2f4] py-1 last:border-b-0">
                <button type="button" onClick={() => setOpenSection(open ? null : section.key)} className="flex min-h-12 w-full items-center justify-between text-left text-[15px] font-medium text-[#111827]">
                  {section.label}
                  <ChevronDown className={`h-5 w-5 transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open ? (
                  <div className="grid gap-1 pb-3">
                    {section.items.slice(0, 24).map((item) => (
                      <a key={item.name} href={item.href} onClick={onClose} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm text-[#374151] hover:bg-[#f8fafc]">
                        <img
                          src={item.image}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.closest("a")?.remove();
                          }}
                          className="h-8 w-8 rounded-lg bg-[#f8fafc] object-cover ring-1 ring-[#eef0f4]"
                        />
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      </a>
                    ))}
                    <a href={section.href} onClick={onClose} className="mt-1 inline-flex h-10 items-center justify-center rounded-lg bg-[#0b55d9] px-3 text-sm font-bold text-white">
                      {labels.seeAll}
                    </a>
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="mt-1 border-t border-[#f1f2f4] pt-2">
            {directLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={onClose} className="flex min-h-12 items-center text-[15px] font-medium text-[#111827]">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function HeaderBadgeButton({ label, count, icon, onClick }: { label: string; count: number; icon: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="interactive-icon relative grid h-9 w-9 place-items-center rounded-full border border-[#e5e7eb] bg-white text-[#111827] shadow-[0_6px_16px_rgba(16,24,40,.06)] transition hover:border-[#e52b2f] hover:text-[#e52b2f] md:h-10 md:w-10" aria-label={label}>
      {icon}
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#e52b2f] px-1 text-[11px] font-black leading-none text-white ring-2 ring-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}

function NotificationMenu({ items, onClose }: { items: HeaderNotification[]; onClose: () => void }) {
  return (
    <div className="fixed bottom-3 left-3 right-3 z-[90] max-h-[75dvh] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-[0_22px_60px_rgba(16,24,40,.18)] md:absolute md:bottom-auto md:left-auto md:right-0 md:top-12 md:w-[340px]">
      <MenuHeader title="Notifications" onClose={onClose} />
      <div className="mt-2 max-h-[340px] overflow-y-auto pr-1">
        {items.length ? items.slice(0, 8).map((item) => (
          <a key={item.id} href={item.href ?? "#"} className="grid gap-1 border-b border-[#edf0f4] px-1 py-3 last:border-b-0 hover:text-[#e52b2f]">
            <span className="text-[11px] font-black uppercase text-[#e52b2f]">{notificationLabel(item.type)}</span>
            <span className="text-sm font-black leading-5 text-[#111827]">{item.title}</span>
            {item.description ? <span className="text-xs font-semibold leading-5 text-[#667085]">{item.description}</span> : null}
          </a>
        )) : (
          <p className="px-1 py-6 text-center text-sm font-bold text-[#667085]">Aucune annonce pour le moment.</p>
        )}
      </div>
    </div>
  );
}

function MailMenu({ messages, onClose, onRead }: { messages: AstralMailMessage[]; onClose: () => void; onRead: (message: AstralMailMessage) => void }) {
  return (
    <div className="fixed bottom-3 left-3 right-3 z-[90] max-h-[75dvh] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-[0_22px_60px_rgba(16,24,40,.18)] md:absolute md:bottom-auto md:left-auto md:right-0 md:top-12 md:w-[360px]">
      <MenuHeader title="Messages Astral4Gamer" onClose={onClose} />
      <div className="mt-2 max-h-[340px] overflow-y-auto pr-1">
        {messages.length ? messages.slice(0, 8).map((message) => (
          <a key={message.id} href={message.action_url ?? "/profil"} onClick={() => onRead(message)} className="grid gap-1 border-b border-[#edf0f4] px-1 py-3 last:border-b-0 hover:text-[#e52b2f]">
            <span className="text-[11px] font-black uppercase text-[#0057d9]">{mailLabel(message.type)}</span>
            <span className="flex items-start justify-between gap-3 text-sm font-black leading-5 text-[#111827]">
              {message.title}
              {message.unread ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#e52b2f]" /> : null}
            </span>
            {message.description ? <span className="text-xs font-semibold leading-5 text-[#667085]">{message.description}</span> : null}
            {message.from ? <span className="truncate text-[11px] font-bold text-[#98a2b3]">{message.from}</span> : null}
          </a>
        )) : (
          <p className="px-1 py-6 text-center text-sm font-bold text-[#667085]">Aucun message Astral4Gamer.</p>
        )}
      </div>
    </div>
  );
}

function MenuHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#edf0f4] pb-2">
      <p className="text-sm font-black text-[#111827]">{title}</p>
      <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full hover:bg-[#f4f4f5]" aria-label="Fermer">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function notificationLabel(type: HeaderNotification["type"]) {
  return {
    announcement: "Annonce",
    tournament: "Tournoi",
    blog: "Blog",
    stream: "Stream",
    video: "Video"
  }[type];
}

function mailLabel(type: AstralMailMessage["type"]) {
  return {
    payment: "Paiement",
    order: "Commande",
    mail: "Mail"
  }[type];
}

function NexyAccountSlot({ compactOnMobile = false }: { compactOnMobile?: boolean }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { language } = useLanguage();
  const [session, setSession] = useState<{ token: string | null; name: string | null; avatar: string | null }>({ token: null, name: null, avatar: null });
  const [freeFireProfile, setFreeFireProfile] = useState<StoredFreeFireProfile | null>(null);
  const [fortniteProfile, setFortniteProfile] = useState<StoredFortniteProfile | null>(null);
  const [codProfile, setCodProfile] = useState<StoredCodProfile | null>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<"online" | "latency">("online");

	  useEffect(() => {
	    function readSession() {
	      const storedFreeFire = localStorage.getItem("astral_freefire_profile");
	      const storedFortnite = localStorage.getItem("astral_fortnite_profile");
	      const storedCod = localStorage.getItem("astral_cod_profile");

      setSession({
        token: localStorage.getItem("nexy_sanctum_token"),
        name: localStorage.getItem("nexy_google_name"),
        avatar: localStorage.getItem("nexy_google_avatar")
      });
      setCustomAvatar(localStorage.getItem("astral_profile_avatar_override"));
	      try {
	        setFreeFireProfile(storedFreeFire ? JSON.parse(storedFreeFire) as StoredFreeFireProfile : null);
	      } catch {
	        setFreeFireProfile(null);
	      }
	      try {
	        setFortniteProfile(storedFortnite ? JSON.parse(storedFortnite) as StoredFortniteProfile : null);
	      } catch {
	        setFortniteProfile(null);
	      }
	      try {
	        setCodProfile(storedCod ? JSON.parse(storedCod) as StoredCodProfile : null);
	      } catch {
	        setCodProfile(null);
	      }
	    }

    readSession();
    window.addEventListener("storage", readSession);
    window.addEventListener("focus", readSession);
    window.addEventListener("astral-profile-updated", readSession);

    return () => {
      window.removeEventListener("storage", readSession);
      window.removeEventListener("focus", readSession);
      window.removeEventListener("astral-profile-updated", readSession);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkConnection() {
      if (!navigator.onLine) {
        setConnectionQuality("latency");
        return;
      }

      const startedAt = performance.now();

      try {
        await fetch(`/favicon.svg?ping=${Date.now()}`, { cache: "no-store" });
        if (!cancelled) {
          setConnectionQuality(performance.now() - startedAt > 1200 ? "latency" : "online");
        }
      } catch {
        if (!cancelled) setConnectionQuality("latency");
      }
    }

    checkConnection();
    const timer = window.setInterval(checkConnection, 15000);
    window.addEventListener("online", checkConnection);
    window.addEventListener("offline", checkConnection);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("online", checkConnection);
      window.removeEventListener("offline", checkConnection);
    };
  }, []);

  const clerkFreeFire = user?.unsafeMetadata?.free_fire as StoredFreeFireProfile | null | undefined;
  const clerkFortnite = user?.unsafeMetadata?.fortnite as StoredFortniteProfile | null | undefined;
  const clerkCod = user?.unsafeMetadata?.call_of_duty as StoredCodProfile | null | undefined;
  const activeFreeFire = freeFireProfile ?? clerkFreeFire ?? null;
  const activeFortnite = fortniteProfile ?? clerkFortnite ?? null;
  const activeCod = codProfile ?? clerkCod ?? null;
  const codName = cleanPlayerName(activeCod?.cod_username ?? activeCod?.username ?? activeCod?.activision_id);
  const fortniteName = cleanPlayerName(activeFortnite?.name ?? activeFortnite?.account_id);
  const displayName = cleanPlayerName(activeFreeFire?.nickname) ?? fortniteName ?? codName ?? session.name ?? user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Profil";
  const avatar = customAvatar ?? usableAccountImage(activeFortnite?.avatar_url) ?? usableAccountImage(activeCod?.avatar_url) ?? usableAccountImage(user?.imageUrl) ?? usableAccountImage(session.avatar) ?? null;

  if (session.token || (isLoaded && isSignedIn)) {
    const initial = displayName.slice(0, 1).toUpperCase();

    return (
      <a href="/profil" className={`interactive-button flex h-9 items-center gap-2 rounded-full border border-[#ececf3] bg-white p-1 shadow-[0_8px_22px_rgba(16,24,40,.08)] md:h-[58px] md:gap-3 md:py-1.5 md:pl-1.5 ${compactOnMobile ? "md:pr-4" : "pr-4"}`}>
        {avatar ? (
          <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-[#e52b2f] md:h-12 md:w-12" />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e52b2f] text-xs font-black text-white md:h-12 md:w-12 md:text-sm">{initial}</span>
        )}
        <span className="hidden min-w-[92px] max-w-[130px] flex-col text-left lg:flex">
          <span className="truncate text-sm font-black leading-5 text-[#111827]">{displayName}</span>
          <span className={`mt-0.5 inline-flex items-center gap-1.5 text-xs font-bold ${connectionQuality === "online" ? "text-emerald-600" : "text-amber-500"}`}>
            <span className={`h-2 w-2 rounded-full ${connectionQuality === "online" ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,.14)]" : "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,.18)]"} animate-pulse`} />
            {connectionQuality === "online" ? (language === "fr" ? "En ligne" : "Online") : (language === "fr" ? "Latence" : "Latency")}
          </span>
        </span>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-1.5 md:gap-2">
      <a
        href="/connexion"
        onClick={(event) => {
          event.preventDefault();
          window.location.assign("/connexion");
        }}
        className={`interactive-button inline-flex h-9 items-center justify-center rounded-full bg-[#e52b2f] text-xs font-black text-white shadow-[0_10px_24px_rgba(229,43,47,.22)] transition hover:bg-[#c91f27] md:h-10 md:rounded-md md:px-4 md:text-sm ${compactOnMobile ? "w-9 px-0 md:w-auto" : "px-3"}`}
      >
        <UserRound className={`${compactOnMobile ? "h-4 w-4 md:hidden" : "hidden"}`} />
        <span className={compactOnMobile ? "hidden md:inline" : ""}>{language === "fr" ? "Connexion" : "Sign in"}</span>
      </a>
      <a
        href="/inscription"
        onClick={(event) => {
          event.preventDefault();
          window.location.assign("/inscription");
        }}
        className="interactive-button hidden h-9 items-center rounded-md border border-[#e52b2f] bg-white px-3 text-xs font-black text-[#e52b2f] transition hover:bg-[#fff1f2] sm:inline-flex md:h-10 md:px-4 md:text-sm"
      >
        {language === "fr" ? "S'inscrire" : "Sign up"}
      </a>
    </div>
  );
}

function usableImage(url?: string | null) {
  if (!url) return null;

  const decoded = decodeURIComponent(url).toLowerCase();

  if (decoded.includes("not found") || decoded.includes("hl%20gaming%20official") || decoded.includes("hl gaming official") || decoded.includes("/freefire-media/")) {
    return null;
  }

  return url;
}

function usableAccountImage(url?: string | null) {
  if (!url) return null;

  const decoded = decodeURIComponent(url).toLowerCase();

  if (decoded.includes("not found") || decoded.includes("hl%20gaming%20official") || decoded.includes("hl gaming official")) {
    return null;
  }

  return url;
}

function cleanPlayerName(name?: string | null) {
  if (!name) return null;

  const cleaned = name
    .replace(/[\u2000-\u200f\u2028-\u202f\u205f-\u206f\u3000]/g, " ")
    .replace(/[^\p{L}\p{N}\s._-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || name.trim() || null;
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function catalogSearchHref(query: string) {
  return `/category/catalogue?q=${encodeURIComponent(query.trim())}`;
}
