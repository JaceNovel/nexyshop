"use client";

import { Show, UserButton, useUser } from "@clerk/nextjs";
import { Bell, ChevronDown, Copy, Gift, Globe2, Loader2, Mail, Search, ShoppingCart, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const brandLogo = "/ChatGPT_Image_28_mai_2026__20_26_02-removebg-preview.png";

type StoredFreeFireProfile = {
  uid?: string | null;
  region?: string | null;
  nickname?: string | null;
  outfit_url?: string | null;
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

const topUpItems = [
  ["Genesis Crystals Genshin Impact", "https://media.rawg.io/media/resize/640/-/screenshots/ca8/ca8a011899a0743ee717c0a2f056f0af.jpg"],
  ["Mobile Legends Diamants", "https://commons.wikimedia.org/wiki/Special:FilePath/Mobile%20Legends%20Logo.webp"],
  ["Diamants Free Fire", "https://media.rawg.io/media/resize/640/-/screenshots/96a/96ab17437e722c8e22240923dfdfcdd0_ftUmkIh.jpg"],
  ["PUBG Mobile UC", "https://media.rawg.io/media/resize/640/-/screenshots/a83/a830c3a3f3f4c9b6cc74924cd42b89a0.jpg"],
  ["CP Call of Duty Mobile", "https://media.rawg.io/media/resize/640/-/screenshots/b59/b59e44204d8af92133ea0b67af45a04c_hS4tgMe.jpg"],
  ["Honkai: Star Rail", "https://upload.wikimedia.org/wikipedia/commons/2/2f/Honkai_Star_Rail_logo.png"],
  ["Brawl Stars Gems", "https://cdn2.steamgriddb.com/icon/6f4922f45568161a8cdf4ad2299f6d23.png"],
  ["Valorant Points", "https://commons.wikimedia.org/wiki/Special:FilePath/Valorant%20logo.svg"],
  ["Arena Breakout", "https://media.rawg.io/media/resize/640/-/screenshots/a83/a830c3a3f3f4c9b6cc74924cd42b89a0.jpg"]
];

const giftItems = [
  ["Carte Cadeau Steam", "https://media.rawg.io/media/resize/640/-/screenshots/c28/c286227823231c426a88aa873cf1b8d6.jpg"],
  ["Carte cadeau Apple iTunes", "https://media.rawg.io/media/resize/640/-/screenshots/ca8/ca8a011899a0743ee717c0a2f056f0af.jpg"],
  ["Carte cadeau Google Play", "https://cdn2.steamgriddb.com/icon/6f4922f45568161a8cdf4ad2299f6d23.png"],
  ["Carte Cadeau PlayStation Network", "https://commons.wikimedia.org/wiki/Special:FilePath/Playstation%20logo%20colour.svg"],
  ["Carte Cadeau Xbox", "https://media.rawg.io/media/resize/640/-/screenshots/a83/a830c3a3f3f4c9b6cc74924cd42b89a0.jpg"],
  ["Free Fire Gift Card", "https://media.rawg.io/media/resize/640/-/screenshots/96a/96ab17437e722c8e22240923dfdfcdd0_ftUmkIh.jpg"],
  ["Riot Points", "https://commons.wikimedia.org/wiki/Special:FilePath/Valorant%20logo.svg"],
  ["Carte cadeau Twitch", "https://commons.wikimedia.org/wiki/Special:FilePath/Mobile%20Legends%20Logo.webp"],
  ["ExitLag", "https://www.exitlag.com/favicon.ico"]
];

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="interactive-link flex h-12 items-center gap-1 text-black">
      {children}
    </a>
  );
}

function NavDropdown({ href, label, items }: { href: string; label: string; items: string[][] }) {
  return (
    <div className="group relative">
      <a href={href} className="interactive-link flex h-12 items-center gap-1 text-[#0057d9]">
        {label} <ChevronDown className="h-4 w-4 stroke-[2.4] transition group-hover:rotate-180" />
      </a>
      <div className="invisible absolute left-0 top-12 z-50 w-[1024px] rounded-b-lg bg-[#f3f3f3] px-4 pb-4 pt-6 opacity-0 shadow-[0_12px_32px_rgba(16,24,40,.12)] transition group-hover:visible group-hover:opacity-100">
        <div className="grid grid-cols-3 gap-x-14 gap-y-4">
          {items.map(([name, image]) => (
            <a key={name} href="/product/pubg-mobile/" className="flex items-center gap-3 rounded-md px-2 py-1 text-black transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(16,24,40,.1)]">
              <img src={image} alt="" className="h-6 w-6 rounded object-cover" />
              {name}
            </a>
          ))}
        </div>
        <div className="mt-5 border-t border-[#d8d8d8] pt-3 text-center font-extrabold text-[#0057d9]">
          <a href={href}>Voir tout</a>
        </div>
      </div>
    </div>
  );
}

function LiveDropdown() {
  return (
    <div className="group relative">
      <a href="/live" className="interactive-link flex h-12 items-center gap-1 text-[#0057d9]">
        Live Direct <ChevronDown className="h-4 w-4 stroke-[2.4] transition group-hover:rotate-180" />
      </a>
      <div className="invisible absolute left-0 top-12 z-50 w-48 rounded-b-lg bg-white p-2 opacity-0 shadow-[0_12px_32px_rgba(16,24,40,.12)] ring-1 ring-[#edf0f4] transition group-hover:visible group-hover:opacity-100">
        <a href="/live" className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold text-[#111827] transition hover:bg-[#f8fafc] hover:text-[#0057d9]">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_0_4px_rgba(239,68,68,.12)]" />
          Live
        </a>
        <a href="/live/passe" className="flex h-10 items-center rounded-md px-3 text-sm font-bold text-[#111827] transition hover:bg-[#f8fafc] hover:text-[#0057d9]">
          Live Passé
        </a>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { isSignedIn } = useUser();
  const [searchValue, setSearchValue] = useState("");
  const [redeemPayload, setRedeemPayload] = useState<RedeemPayload | null>(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState("");

  useEffect(() => {
    const shouldOpenRedeem = normalizeSearch(searchValue).includes("code gratuit");

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
      <div className="relative flex h-10 items-center justify-center bg-[#e52b2f] px-4 text-center text-sm font-semibold text-white">
        <span>Profitez des offres Astral4Gamer sur les recharges, cartes cadeaux et tournois.</span>
        <X className="absolute right-8 h-5 w-5" />
      </div>
      <div className="mx-auto max-w-[1452px] px-6">
        <div className="flex h-[108px] items-center gap-8">
          <a href="/" className="flex min-w-[360px] items-center gap-3 transition hover:scale-[1.01]" aria-label="Astral4Gamer">
            <span className="relative h-[96px] w-[96px] shrink-0 overflow-hidden">
              <img src={brandLogo} alt="" className="absolute left-[-72px] top-[-13px] h-auto w-[232px] max-w-none" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[31px] font-black italic tracking-normal text-black">
                ASTRAL<span className="text-[#e52b2f]">4</span>GAMER
              </span>
              <span className="mt-3 text-center text-[10px] font-black tracking-[.48em] text-black">
                <span className="text-[#e52b2f]">PLAY</span> • COMPETE • WIN
              </span>
            </span>
          </a>
          <div className="relative flex-1">
            <label className="group flex h-12 items-center rounded-lg bg-[#f4f4f5] px-4 text-[#5f6673] transition focus-within:bg-white focus-within:shadow-[0_0_0_2px_rgba(11,103,240,.18),0_12px_30px_rgba(16,24,40,.08)]">
              <Search className="mr-3 h-5 w-5 transition group-focus-within:text-[#0b67f0]" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#4b5563]"
                placeholder="I'm shopping for ..."
              />
            </label>
            {redeemOpen ? (
              <div className="absolute left-0 top-[58px] z-[80] w-full max-w-[640px] rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-[0_22px_60px_rgba(16,24,40,.18)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 text-[#e52b2f]">
                      <Gift className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-[#111827]">Codes gratuits Free Fire</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[#667085]">
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
                              {[code.source, code.date].filter(Boolean).join(" • ") || "Source HL Gaming"}
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
          </div>
          <div className="flex min-w-[120px] items-center justify-end gap-5 text-black">
            <button className="interactive-icon relative grid h-10 w-10 place-items-center rounded-full hover:bg-[#f4f4f5]" aria-label="Langue">
              <Globe2 className="h-6 w-6" />
              <span className="absolute bottom-0 right-0 rounded-sm bg-[#0957ef] px-1 text-[10px] font-bold leading-3 text-white">FR</span>
            </button>
            <button className="interactive-icon grid h-10 w-10 place-items-center rounded-full hover:bg-[#f4f4f5]" aria-label="Panier">
              <ShoppingCart className="h-6 w-6" />
            </button>
            <HeaderBadgeButton label="Notifications" count={3} icon={<Bell className="h-5 w-5" />} />
            <HeaderBadgeButton label="Messages" count={5} icon={<Mail className="h-5 w-5" />} />
            <NexyAccountSlot />
          </div>
        </div>

        <nav className="flex h-12 items-center gap-8 text-[16px]">
          <NavLink href="/">Accueil</NavLink>
          <NavDropdown href="/category/top-up" label="Game Credits" items={topUpItems} />
          <NavDropdown href="/category/carte-cadeau" label="Gift Cards" items={giftItems} />
	          <LiveDropdown />
	          <NavLink href="/tournois">Tournois</NavLink>
	          <NavLink href="/jeux-avenir">Jeux à venir</NavLink>
	          <NavLink href="/blog">Blog</NavLink>
        </nav>
      </div>
    </header>
  );
}

function HeaderBadgeButton({ label, count, icon }: { label: string; count: number; icon: ReactNode }) {
  return (
    <button className="interactive-icon relative grid h-10 w-10 place-items-center rounded-full border border-[#e5e7eb] bg-white text-[#111827] shadow-[0_6px_16px_rgba(16,24,40,.06)] transition hover:border-[#e52b2f] hover:text-[#e52b2f]" aria-label={label}>
      {icon}
      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#e52b2f] px-1 text-[11px] font-black leading-none text-white ring-2 ring-white">
        {count}
      </span>
    </button>
  );
}

function NexyAccountSlot() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [session, setSession] = useState<{ token: string | null; name: string | null; avatar: string | null }>({ token: null, name: null, avatar: null });
  const [freeFireProfile, setFreeFireProfile] = useState<StoredFreeFireProfile | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<"online" | "latency">("online");

	  useEffect(() => {
	    function readSession() {
	      const storedFreeFire = localStorage.getItem("astral_freefire_profile");

      setSession({
        token: localStorage.getItem("nexy_sanctum_token"),
        name: localStorage.getItem("nexy_google_name"),
        avatar: localStorage.getItem("nexy_google_avatar")
      });
	      try {
	        setFreeFireProfile(storedFreeFire ? JSON.parse(storedFreeFire) as StoredFreeFireProfile : null);
	      } catch {
	        setFreeFireProfile(null);
	      }
	    }

    readSession();
    window.addEventListener("storage", readSession);
    window.addEventListener("focus", readSession);

    return () => {
      window.removeEventListener("storage", readSession);
      window.removeEventListener("focus", readSession);
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
  const activeFreeFire = freeFireProfile ?? clerkFreeFire ?? null;
  const displayName = cleanPlayerName(activeFreeFire?.nickname) ?? session.name ?? user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Profil";
  const avatar = usableAccountImage(user?.imageUrl) ?? usableAccountImage(session.avatar) ?? usableImage(activeFreeFire?.outfit_url) ?? null;

  if (session.token || (isLoaded && isSignedIn)) {
    const initial = displayName.slice(0, 1).toUpperCase();

    return (
      <a href="/profil" className="interactive-button flex h-[58px] items-center gap-3 rounded-full border border-[#ececf3] bg-white py-1.5 pl-1.5 pr-4 shadow-[0_8px_22px_rgba(16,24,40,.08)]">
        {avatar ? (
          <img src={avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-[#e52b2f]" />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e52b2f] text-sm font-black text-white">{initial}</span>
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
    <>
      <Show when="signed-out">
        <a href="/connexion" className="interactive-button inline-flex h-10 items-center rounded-md bg-[#e52b2f] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(229,43,47,.22)] transition hover:bg-[#c91f27]">
          Connexion
        </a>
      </Show>
      <Show when="signed-in">
        <a href="/profil" className="mr-2 text-sm font-black text-[#111827]">Profil</a>
        <UserButton />
      </Show>
    </>
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

  if (decoded.includes("img.clerk.com") || decoded.includes("images.clerk.dev") || decoded.includes("avatar")) {
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
