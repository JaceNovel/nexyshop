"use client";

import { BadgePercent, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { markDiscordJoined } from "@/components/discord-follow-popup";

const phoneNumber = "+33 6 88 63 92 94";
const whatsappUrl = "https://wa.me/33688639294";
const youtubeUrl = "https://www.youtube.com/@astral4gamer";
const discordUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ?? "https://discord.gg/astral4gamer";

const benefitItems: Array<[string, LucideIcon, string]> = [
  ["Livraison instantanée", Truck, "/guide/livraison-instantanee"],
  ["Paiement sécurisé", ShieldCheck, "/guide/paiement-securise"],
  ["Prix compétitifs", BadgePercent, "/category/top-up"],
  ["Serveur Discord", MessageCircle, discordUrl]
];

const footerGroups = [
  {
    title: "Astral4Gamer",
    links: [
      ["À propos", "/a-propos"],
      ["Conditions d'utilisation", "/conditions"],
      ["Politique de confidentialité", "/confidentialite"]
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
    <footer className="mx-auto max-w-[1586px] px-3 pb-6 pt-6 sm:px-6 md:pb-10 md:pt-12">
      <div className="rounded-lg bg-[#f6f6f7] p-4 md:rounded-xl md:p-8">
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:gap-8">
          <div className="space-y-2 text-[13px] text-[#374151] md:space-y-3 md:text-[15px]">
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
            <p>
              <b>Discord:</b>{" "}
              <a href={discordUrl} target="_blank" rel="noreferrer" onClick={markDiscordJoined} className="font-medium text-[#0b55d9] transition hover:text-[#e52b2f]">
                Rejoindre le serveur Astral4Gamer
              </a>
            </p>
            <p><b>Support:</b> Disponible pour les commandes, recharges et cartes cadeaux.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4 md:gap-5">
            {benefitItems.map(([item, Icon, href]) => (
              <a key={item} href={href} target={href.startsWith("https://") ? "_blank" : undefined} rel={href.startsWith("https://") ? "noreferrer" : undefined} onClick={href === discordUrl ? markDiscordJoined : undefined} className="soft-pop rounded-lg bg-white p-3 text-xs text-[#111827] transition hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(17,24,39,.10)] md:p-4 md:text-sm">
                <div className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-full bg-[#eaf2ff] text-[#0b55d9] md:mb-3 md:h-10 md:w-10">
                  <Icon className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <p>{item}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-5 text-[12px] text-[#6b7280] md:mt-9 md:grid-cols-4 md:gap-8 md:text-[14px]">
        {footerGroups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2 text-[13px] font-black text-black md:mb-4 md:text-[16px]">{group.title}</h3>
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
      <div className="mt-7 md:mt-10">
        <h2 className="text-[17px] font-black md:text-[22px]">Astral4Gamer - Boutique gaming et cartes cadeaux</h2>
        <p className="mt-3 text-[13px] leading-6 text-[#6b7280] md:mt-5 md:text-[15px] md:leading-7">
          Astral4Gamer accompagne les joueurs avec des recharges rapides, des cartes cadeaux digitales, des paiements sécurisés et une expérience simple pensée pour le mobile comme pour le desktop.
        </p>
      </div>
    </footer>
  );
}
