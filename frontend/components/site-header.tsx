"use client";

import { useUser } from "@clerk/nextjs";
import { Bell, ChevronDown, Copy, Gift, Globe2, Loader2, Mail, Search, ShoppingCart, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
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
  { name: "Live en direct", image: "/unnamed.png", href: "/live" },
  { name: "Lives passés", image: "/unnamed.png", href: "/live/passe" }
] satisfies NavMenuItem[];

const menuFallbackImage = "/icon.svg";

function productMenuImage(product: Pick<CatalogProduct, "image_url" | "name" | "game">) {
  const image = product.image_url?.trim();
  const identity = `${product.name} ${product.game}`.toLowerCase();

  if (image && (!image.toLowerCase().includes("pubg") || identity.includes("pubg"))) {
    return image;
  }

  return menuFallbackImage;
}

function productsToMenuItems(products: CatalogProduct[], limit = 24): NavMenuItem[] {
  const byName = new Map<string, CatalogProduct>();

  products.forEach((product) => {
    const name = product.name.trim();

    if (name && !byName.has(name)) {
      byName.set(name, product);
    }
  });

  return Array.from(byName.values()).slice(0, limit).map((product) => ({
    name: product.name,
    image: productMenuImage(product),
    href: `/product/${product.id}`
  }));
}

function catalogProductPrice(product: CatalogProduct) {
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
  return (
    <div className="fixed inset-0 z-[120] bg-black/45 p-3 md:hidden" role="dialog" aria-modal="true">
      <div className="ml-auto flex max-h-[88vh] w-full max-w-[420px] flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_70px_rgba(15,23,42,.28)]">
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
              <img src={item.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
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
      <div className="invisible absolute left-0 top-12 z-50 hidden w-[min(1024px,calc(100vw-2rem))] rounded-b-lg bg-[#f3f3f3] px-4 pb-4 pt-6 opacity-0 shadow-[0_12px_32px_rgba(16,24,40,.12)] transition group-hover:visible group-hover:opacity-100 md:block">
        <div className="grid grid-cols-3 gap-x-14 gap-y-4 font-normal">
          {items.length ? items.map((item) => (
            <a key={item.name} href={item.href} className="flex items-center gap-3 rounded-md px-2 py-1 text-black transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(16,24,40,.1)]">
              <img src={item.image} alt="" className="h-6 w-6 rounded object-cover" />
              {item.name}
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

function LiveDropdown() {
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
        Live Direct <ChevronDown className="h-4 w-4 stroke-[2.4] transition group-hover:rotate-180" />
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
      {mobileOpen ? <MobileNavSheet title="Live Direct" href="/live" items={liveItems} onClose={() => setMobileOpen(false)} /> : null}
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
  const [searchSuggestions, setSearchSuggestions] = useState<CatalogProduct[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchValue.trim();

    if (!query) {
      return;
    }

    if (redeemOpen) {
      return;
    }

    window.location.href = `/category/top-up?q=${encodeURIComponent(query)}`;
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
      getCatalogProducts(8, { q: query })
        .then((payload) => {
          if (!cancelled) {
            setSearchSuggestions(payload.data);
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
        const [topUps, gifts] = await Promise.all([
          getCatalogProducts(240, { category: "top-up" }),
          getCatalogProducts(240, { category: "gift-card" })
        ]);

        if (!cancelled) {
          setTopUpItems(productsToMenuItems(topUps.data));
          setGiftItems(productsToMenuItems(gifts.data));
        }
      } catch {
        if (!cancelled) {
          setTopUpItems([]);
          setGiftItems([]);
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
      <div className="relative flex h-8 items-center justify-center bg-[#e52b2f] px-3 text-center text-[11px] font-semibold text-white md:h-10 md:px-4 md:text-sm">
        <span className="truncate">Offres Astral4Gamer: recharges, cartes cadeaux et tournois.</span>
        <X className="absolute right-4 hidden h-5 w-5 md:block" />
      </div>
      <div className="mx-auto max-w-[1452px] px-3 sm:px-6">
        <div className="flex min-h-[74px] flex-wrap items-center gap-3 py-2 md:h-[108px] md:flex-nowrap md:gap-8 md:py-0">
          <a href="/" className="flex min-w-0 shrink-0 items-center gap-2 transition hover:scale-[1.01] md:min-w-[300px] md:gap-3 xl:min-w-[360px]" aria-label="Astral4Gamer">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden md:h-[96px] md:w-[96px]">
              <img src={brandLogo} alt="" className="absolute left-[-36px] top-[-7px] h-auto w-[116px] max-w-none md:left-[-72px] md:top-[-13px] md:w-[232px]" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[18px] font-black italic tracking-normal text-black sm:text-[22px] md:text-[31px]">
                ASTRAL<span className="text-[#e52b2f]">4</span>GAMER
              </span>
              <span className="mt-1 hidden text-center text-[8px] font-black tracking-[.24em] text-black sm:block md:mt-3 md:text-[10px] md:tracking-[.48em]">
                <span className="text-[#e52b2f]">PLAY</span> • COMPETE • WIN
              </span>
            </span>
          </a>
          <form onSubmit={submitSearch} className="relative order-3 w-full flex-1 md:order-none md:w-auto">
            <label className="group flex h-10 items-center rounded-lg bg-[#f4f4f5] px-3 text-[#5f6673] transition focus-within:bg-white focus-within:shadow-[0_0_0_2px_rgba(11,103,240,.18),0_12px_30px_rgba(16,24,40,.08)] md:h-12 md:px-4">
              <Search className="mr-2 h-4 w-4 transition group-focus-within:text-[#0b67f0] md:mr-3 md:h-5 md:w-5" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 140)}
                className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#4b5563] md:text-[15px]"
                placeholder="Rechercher..."
              />
            </label>
            {searchFocused && !redeemOpen && searchValue.trim().length >= 2 ? (
              <div className="fixed left-3 right-3 top-[122px] z-[110] max-h-[68vh] overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-[0_22px_60px_rgba(16,24,40,.22)] md:absolute md:left-0 md:right-auto md:top-[58px] md:max-h-none md:w-full md:max-w-[720px]">
                <div className="flex items-center justify-between border-b border-[#edf0f4] px-3 py-2">
                  <p className="text-xs font-medium uppercase text-[#667085]">Résultats rapides</p>
                  <a
                    href={`/category/top-up?q=${encodeURIComponent(searchValue.trim())}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      window.location.href = `/category/top-up?q=${encodeURIComponent(searchValue.trim())}`;
                    }}
                    className="text-xs font-medium text-[#0057d9]"
                  >
                    Voir tout
                  </a>
                </div>
                {searchLoading ? (
                  <div className="flex h-20 items-center justify-center gap-2 text-sm font-normal text-[#667085]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recherche...
                  </div>
                ) : searchSuggestions.length ? (
                  <div className="max-h-[calc(68vh-46px)] overflow-y-auto p-2 md:max-h-[380px]">
                    {searchSuggestions.map((product) => (
                      <a
                        key={product.id}
                        href={`/product/${product.id}`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          window.location.href = `/product/${product.id}`;
                        }}
                        className="grid grid-cols-[46px_1fr] items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-[#f8fafc] sm:grid-cols-[48px_1fr_auto] sm:gap-3"
                      >
                        <img src={productMenuImage(product)} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-[#f4f4f5] object-contain p-1.5 sm:h-12 sm:w-12" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-normal text-[#111827]">{product.name}</span>
                          <span className="mt-0.5 block truncate text-xs font-semibold text-[#667085]">{product.category ?? product.type ?? "Catalogue"}</span>
                          <span className="mt-1 block text-xs font-normal text-[#111827] sm:hidden">{catalogProductPrice(product)}</span>
                        </span>
                        <span className="hidden shrink-0 text-right text-xs font-normal text-[#111827] sm:block">{catalogProductPrice(product)}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm font-normal text-[#111827]">Aucun produit trouvé</p>
                    <p className="mt-1 text-xs font-semibold text-[#667085]">Essaie un autre mot-clé.</p>
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
          <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5 text-black sm:gap-2 md:min-w-[120px] md:gap-5">
            <button className="interactive-icon relative hidden h-10 w-10 place-items-center rounded-full hover:bg-[#f4f4f5] sm:grid" aria-label="Langue">
              <Globe2 className="h-6 w-6" />
              <span className="absolute bottom-0 right-0 rounded-sm bg-[#0957ef] px-1 text-[10px] font-bold leading-3 text-white">FR</span>
            </button>
            <button className="interactive-icon grid h-9 w-9 place-items-center rounded-full hover:bg-[#f4f4f5] md:h-10 md:w-10" aria-label="Panier">
              <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <div className="relative">
              <HeaderBadgeButton label="Notifications" count={notificationCount} icon={<Bell className="h-5 w-5" />} onClick={() => setNotificationOpen((open) => !open)} />
              {notificationOpen ? <NotificationMenu items={notifications} onClose={() => setNotificationOpen(false)} /> : null}
            </div>
            <div className="relative">
              <HeaderBadgeButton label="Messages Astral4Gamer" count={mailCount} icon={<Mail className="h-5 w-5" />} onClick={() => setMailOpen((open) => !open)} />
              {mailOpen ? <MailMenu messages={mailMessages} onClose={() => setMailOpen(false)} onRead={(message) => {
                if (message.mail_id) {
                  markAstralMailRead(localStorage.getItem("nexy_sanctum_token"), message.mail_id);
                }
              }} /> : null}
            </div>
            <NexyAccountSlot />
          </div>
        </div>

        <nav className="mobile-scroll flex h-11 items-center gap-4 overflow-x-auto whitespace-nowrap text-[13px] font-normal md:h-12 md:overflow-visible md:gap-8 md:text-[16px]">
          <NavLink href="/">Accueil</NavLink>
          <NavDropdown href="/category/top-up" label="Game Credits" items={topUpItems} />
          <NavDropdown href="/category/carte-cadeau" label="Gift Cards" items={giftItems} />
	          <LiveDropdown />
	          {showPubgNav ? <PubgDropdown /> : null}
	          <NavLink href="/tournois">Tournois</NavLink>
	          {!showPubgNav && !showCodNav ? <NavLink href="/duel">Duel 1V1</NavLink> : null}
	          <NavLink href="/communaute">Communauté</NavLink>
	          <NavLink href="/profil-public">Profil public</NavLink>
	          {!showCodNav ? <NavLink href="/partenariat">Partenariat</NavLink> : null}
	          <NavLink href="/jeux-avenir">Jeux à venir</NavLink>
	          <NavLink href="/blog">Blog</NavLink>
        </nav>
      </div>
    </header>
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
    <div className="fixed left-3 right-3 top-[126px] z-[90] rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-[0_22px_60px_rgba(16,24,40,.18)] md:absolute md:left-auto md:right-0 md:top-12 md:w-[340px]">
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
    <div className="fixed left-3 right-3 top-[126px] z-[90] rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-[0_22px_60px_rgba(16,24,40,.18)] md:absolute md:left-auto md:right-0 md:top-12 md:w-[360px]">
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

function NexyAccountSlot() {
  const { isLoaded, isSignedIn, user } = useUser();
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
      <a href="/profil" className="interactive-button flex h-9 items-center gap-2 rounded-full border border-[#ececf3] bg-white p-1 shadow-[0_8px_22px_rgba(16,24,40,.08)] md:h-[58px] md:gap-3 md:py-1.5 md:pl-1.5 md:pr-4">
        {avatar ? (
          <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-[#e52b2f] md:h-12 md:w-12" />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e52b2f] text-xs font-black text-white md:h-12 md:w-12 md:text-sm">{initial}</span>
        )}
        <span className="hidden min-w-[92px] max-w-[130px] flex-col text-left lg:flex">
          <span className="truncate text-sm font-black leading-5 text-[#111827]">{displayName}</span>
          <span className={`mt-0.5 inline-flex items-center gap-1.5 text-xs font-bold ${connectionQuality === "online" ? "text-emerald-600" : "text-amber-500"}`}>
            <span className={`h-2 w-2 rounded-full ${connectionQuality === "online" ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,.14)]" : "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,.18)]"} animate-pulse`} />
            {connectionQuality === "online" ? "En ligne" : "Latence"}
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
        className="interactive-button inline-flex h-9 items-center rounded-md bg-[#e52b2f] px-3 text-xs font-black text-white shadow-[0_10px_24px_rgba(229,43,47,.22)] transition hover:bg-[#c91f27] md:h-10 md:px-4 md:text-sm"
      >
        Connexion
      </a>
      <a
        href="/inscription"
        onClick={(event) => {
          event.preventDefault();
          window.location.assign("/inscription");
        }}
        className="interactive-button hidden h-9 items-center rounded-md border border-[#e52b2f] bg-white px-3 text-xs font-black text-[#e52b2f] transition hover:bg-[#fff1f2] sm:inline-flex md:h-10 md:px-4 md:text-sm"
      >
        S'inscrire
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
