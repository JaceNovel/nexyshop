"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { ChevronDown, Globe2, Search, ShoppingCart, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

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
  return (
    <>
      <div className="relative flex h-10 items-center justify-center bg-[#e52b2f] px-4 text-center text-sm font-semibold text-white">
        <span>Profitez des offres Astral4Gamer sur les recharges, cartes cadeaux et tournois.</span>
        <X className="absolute right-8 h-5 w-5" />
      </div>
      <header className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto max-w-[1586px] px-6">
          <div className="flex h-[88px] items-center gap-9">
            <a href="/" className="flex min-w-[260px] items-center text-[30px] font-black tracking-[-1.8px] transition hover:scale-[1.02]">
              <span>Astral</span><span className="mx-0.5 text-[42px] italic leading-none text-[#e52b2f]">4</span><span>Gamer</span>
            </a>
            <label className="group flex h-12 flex-1 items-center rounded-lg bg-[#f4f4f5] px-4 text-[#5f6673] transition focus-within:bg-white focus-within:shadow-[0_0_0_2px_rgba(11,103,240,.18),0_12px_30px_rgba(16,24,40,.08)]">
              <Search className="mr-3 h-5 w-5 transition group-focus-within:text-[#0b67f0]" />
              <input className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#4b5563]" placeholder="I'm shopping for ..." />
            </label>
            <div className="flex min-w-[360px] items-center justify-end gap-5 text-black">
              <button className="interactive-icon relative grid h-10 w-10 place-items-center rounded-full hover:bg-[#f4f4f5]" aria-label="Langue">
                <Globe2 className="h-6 w-6" />
                <span className="absolute bottom-0 right-0 rounded-sm bg-[#0957ef] px-1 text-[10px] font-bold leading-3 text-white">FR</span>
              </button>
              <button className="interactive-icon grid h-10 w-10 place-items-center rounded-full hover:bg-[#f4f4f5]" aria-label="Panier">
                <ShoppingCart className="h-6 w-6" />
              </button>
              <NexyAccountSlot />
            </div>
          </div>

          <nav className="flex h-12 items-center gap-8 text-[16px]">
            <NavLink href="/">Accueil</NavLink>
            <NavDropdown href="/category/top-up" label="Game Credits" items={topUpItems} />
            <NavDropdown href="/category/carte-cadeau" label="Gift Cards" items={giftItems} />
            <LiveDropdown />
            <NavLink href="/tournois">Tournois</NavLink>
            <NavLink href="/blog">Blog</NavLink>
          </nav>
        </div>
      </header>
    </>
  );
}

function NexyAccountSlot() {
  const [session, setSession] = useState<{ token: string | null; name: string | null; avatar: string | null }>({ token: null, name: null, avatar: null });

  useEffect(() => {
    function readSession() {
      setSession({
        token: localStorage.getItem("nexy_sanctum_token"),
        name: localStorage.getItem("nexy_google_name"),
        avatar: localStorage.getItem("nexy_google_avatar")
      });
    }

    readSession();
    window.addEventListener("storage", readSession);
    window.addEventListener("focus", readSession);

    return () => {
      window.removeEventListener("storage", readSession);
      window.removeEventListener("focus", readSession);
    };
  }, []);

  if (session.token) {
    const initial = (session.name ?? "N").slice(0, 1).toUpperCase();

    return (
      <a href="/profil" className="interactive-button flex h-11 items-center gap-3 rounded-full border border-[#ececf3] bg-white py-1 pl-1 pr-3 shadow-[0_8px_22px_rgba(16,24,40,.08)]">
        {session.avatar ? (
          <img src={session.avatar} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-[#6d28d9]" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#6d28d9] text-sm font-black text-white">{initial}</span>
        )}
        <span className="hidden max-w-[120px] truncate text-sm font-black text-[#111827] lg:block">{session.name ?? "Profil"}</span>
      </a>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <div className="flex items-center gap-2">
          <a href="/connexion" className="interactive-button inline-flex h-10 items-center rounded-md border border-[#d7dce5] px-4 text-sm font-black text-[#111827] transition hover:border-[#e52b2f] hover:text-[#e52b2f]">
            Connexion
          </a>
          <a href="/inscription" className="interactive-button inline-flex h-10 items-center rounded-md bg-[#6d28d9] px-4 text-sm font-black text-white shadow-[0_8px_20px_rgba(109,40,217,.18)] transition hover:bg-[#5b21b6]">
            Inscription
          </a>
        </div>
      </Show>
      <Show when="signed-in">
        <a href="/profil" className="mr-2 text-sm font-black text-[#111827]">Profil</a>
        <UserButton />
      </Show>
    </>
  );
}
