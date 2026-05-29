"use client";

import { BadgePercent, Headphones, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const phoneNumber = "+33 6 88 63 92 94";
const whatsappUrl = "https://wa.me/33688639294";
const youtubeUrl = "https://www.youtube.com/@astral4gamer";

const benefitItems: Array<[string, LucideIcon, string]> = [
  ["Livraison instantanée", Truck, "/guide/livraison-instantanee"],
  ["Paiement sécurisé", ShieldCheck, "/guide/paiement-securise"],
  ["Prix compétitifs", BadgePercent, "/category/top-up"],
  ["Support client", Headphones, "/contact"]
];

const footerGroups = [
  {
    title: "Astral4Gamer",
    links: [
      ["À propos", "/a-propos"],
      ["Conditions d'utilisation", "/conditions"],
      ["Politique de confidentialité", "/confidentialite"],
      ["API revendeur", "/api-revendeur"]
    ]
  },
  {
    title: "Services client",
    links: [
      ["Profil", "/profil"],
      ["Wallet", "/wallet"],
      ["Commandes", "/commandes"],
      ["Contact", "/contact"]
    ]
  },
  {
    title: "Top produits",
    links: [
      ["CP Call of Duty Mobile", "/product/codm"],
      ["Diamants Free Fire", "/product/free-fire"],
      ["PUBG Mobile UC", "/product/pubg-mobile"],
      ["Netflix Gift Card", "/product/netflix-gift-card"]
    ]
  },
  {
    title: "Guide",
    links: [
      ["Achat top up automatique", "/guide/achat-top-up-automatique"],
      ["Achat cartes cadeaux", "/guide/achat-cartes-cadeaux"],
      ["Livraison instantanée", "/guide/livraison-instantanee"],
      ["FAQ", "/faq"]
    ]
  }
];

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1586px] px-6 pb-10 pt-12">
      <div className="rounded-xl bg-[#f6f6f7] p-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3 text-[15px] text-[#374151]">
            <p><b>Entreprise:</b> Astral4Gamer</p>
            <p>
              <b>Téléphone / WhatsApp:</b>{" "}
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="font-medium text-[#0b55d9] transition hover:text-[#e52b2f]">
                {phoneNumber}
              </a>
            </p>
            <p>
              <b>YouTube:</b>{" "}
              <a href={youtubeUrl} target="_blank" rel="noreferrer" className="font-medium text-[#0b55d9] transition hover:text-[#e52b2f]">
                @astral4gamer
              </a>
            </p>
            <p><b>Support:</b> Disponible pour les commandes, recharges et cartes cadeaux.</p>
          </div>
          <div className="grid grid-cols-2 gap-5 text-center md:grid-cols-4">
            {benefitItems.map(([item, Icon, href]) => (
              <a key={item} href={href} className="soft-pop rounded-lg bg-white p-4 text-[#111827] transition hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(17,24,39,.10)]">
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-[#eaf2ff] text-[#0b55d9]">
                  <Icon className="h-5 w-5" />
                </div>
                <p>{item}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-9 grid gap-8 text-[14px] text-[#6b7280] md:grid-cols-4">
        {footerGroups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-4 text-[16px] font-black text-black">{group.title}</h3>
            <ul className="space-y-1.5">
              {group.links.map(([label, href]) => (
                <li key={href}>
                  <a href={href} className="transition hover:text-[#e52b2f]">{label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <h2 className="text-[22px] font-black">Astral4Gamer - Boutique gaming et cartes cadeaux</h2>
        <p className="mt-5 text-[15px] leading-7 text-[#6b7280]">
          Astral4Gamer accompagne les joueurs avec des recharges rapides, des cartes cadeaux digitales, des paiements sécurisés et une expérience simple pensée pour le mobile comme pour le desktop.
        </p>
      </div>
    </footer>
  );
}
