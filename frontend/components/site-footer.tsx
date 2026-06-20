"use client";

import { BadgePercent, Building2, Headphones, MessageCircle, Phone, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { useLanguage } from "@/components/language-provider";

const companyName = "5 avenue de l'europe bron 69500";
const phoneNumber = "+33688639294";
const phoneHref = "tel:+33688639294";
const whatsappUrl = "https://wa.me/33688639294";
const discordUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ?? "https://discord.gg/astral4gamer";

export function Footer() {
  const { language } = useLanguage();
  const isFrench = language === "fr";
  const contactItems: Array<{ label: string; value: string; href?: string; icon: ComponentType<{ className?: string }> }> = [
    { label: isFrench ? "Entreprise" : "Company", value: companyName, icon: Building2 },
    { label: "Discord", value: "discord.gg/astral4gamer", href: discordUrl, icon: DiscordMark },
    { label: isFrench ? "Téléphone" : "Phone", value: phoneNumber, href: phoneHref, icon: Phone },
    { label: "WhatsApp", value: phoneNumber, href: whatsappUrl, icon: WhatsAppMark },
  ];
  const benefitItems: Array<[string, LucideIcon, string]> = isFrench
    ? [
        ["Livraison instantanée", Truck, "/guide/livraison-instantanee"],
        ["Paiement sécurisé", ShieldCheck, "/guide/paiement-securise"],
        ["Meilleur prix", BadgePercent, "/category/top-up"],
        ["Support 24/7", Headphones, "/contact"],
      ]
    : [
        ["Instant Delivery", Truck, "/guide/livraison-instantanee"],
        ["Secure Payment", ShieldCheck, "/guide/paiement-securise"],
        ["Best Price", BadgePercent, "/category/top-up"],
        ["24/7 Support", Headphones, "/contact"],
      ];
  const footerGroups = [
    {
      title: "Astral4Gamer",
      links: isFrench
        ? [["A propos", "/a-propos"], ["Conditions d'utilisation", "/conditions"], ["Politique de confidentialité", "/confidentialite"]]
        : [["About", "/a-propos"], ["Terms of Use", "/conditions"], ["Privacy Policy", "/confidentialite"]]
    },
    {
      title: isFrench ? "Service client" : "Customer Service",
      links: isFrench
        ? [["Profil", "/profil"], ["Wallet", "/wallet"], ["Commandes", "/commandes"], ["Contact", "/contact"]]
        : [["Profile", "/profil"], ["Wallet", "/wallet"], ["Orders", "/commandes"], ["Contact", "/contact"]]
    },
    {
      title: isFrench ? "Produits phares" : "Top Products",
      links: [["CP Call of Duty Mobile", "/product/codm"], ["Diamants Free Fire", "/product/free-fire"], ["PUBG Mobile UC", "/product/pubg-mobile"], ["Netflix Gift Card", "/product/netflix-gift-card"]]
    },
    {
      title: isFrench ? "Guide" : "Guides",
      links: isFrench
        ? [["Achat top up automatique", "/guide/achat-top-up-automatique"], ["Achat cartes cadeaux", "/guide/achat-cartes-cadeaux"], ["Livraison instantanée", "/guide/livraison-instantanee"], ["FAQ", "/faq"]]
        : [["Automatic top-up purchase", "/guide/achat-top-up-automatique"], ["Gift card purchase", "/guide/achat-cartes-cadeaux"], ["Instant delivery", "/guide/livraison-instantanee"], ["FAQ", "/faq"]]
    }
  ];

  return (
    <footer className="mx-auto max-w-[1586px] px-3 pb-6 pt-6 sm:px-6 md:pb-10 md:pt-10">
      <div className="rounded-[18px] border border-[#ece9e2] bg-[#f7f5f2] px-6 py-7 shadow-[0_12px_32px_rgba(15,23,42,.06)] sm:px-8 md:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.45fr_.95fr] lg:items-start">
          <div className="space-y-4 text-[#2f2d2a]">
            {contactItems.map((item, index) => {
              const Icon = item.icon;
              const row = (
                <div className={`flex gap-3 ${index === contactItems.length - 1 ? "items-start" : "items-center"}`}>
                  <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#58524a]" />
                  <div className={`flex min-w-0 ${index === contactItems.length - 1 ? "flex-col gap-1.5 sm:flex-row sm:gap-4" : "items-center gap-2"}`}>
                    <span className="shrink-0 text-[13px] font-black text-[#3e3a35] sm:text-[14px]">{item.label}:</span>
                    <span className={`min-w-0 ${index === contactItems.length - 1 ? "border-l-0 pl-0 text-[13px] leading-6 text-[#5d5750] sm:border-l sm:border-[#cfc8bc] sm:pl-4 sm:text-[14px]" : "truncate text-[13px] text-[#5d5750] sm:text-[14px]"}`}>{item.value}</span>
                  </div>
                </div>
              );

              if (!item.href) {
                return <div key={item.label}>{row}</div>;
              }

              return (
                <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="block transition hover:text-[#0b55d9]">
                  {row}
                </a>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-7 border-t border-[#ded8cf] pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-1">
            {benefitItems.map(([label, Icon, href]) => (
              <a key={label} href={href} className="flex flex-col items-center text-center text-[#0f172a] transition hover:text-[#0b55d9]">
                <Icon className="h-9 w-9 text-[#1156d9]" strokeWidth={1.9} />
                <span className="mt-3 text-[15px] font-medium leading-5">{label}</span>
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
        <h2 className="text-[17px] font-black md:text-[22px]">{isFrench ? "Astral4Gamer - Cartes électroniques, clés de jeux et services gaming" : "Astral4Gamer - Electronic cards, game keys and gaming services"}</h2>
        <p className="mt-3 text-[13px] leading-6 text-[#6b7280] md:mt-5 md:text-[15px] md:leading-7">
          {isFrench
            ? "Astral4Gamer simplifie l'achat digital avec une livraison plus rapide, un support plus clair et une expérience boutique plus professionnelle."
            : "Astral4Gamer supports digital commerce with faster delivery, clearer support channels and a more professional storefront experience."}
        </p>
      </div>
    </footer>
  );
}

function DiscordMark({ className }: { className?: string }) {
  return <span className={className}>D</span>;
}

function WhatsAppMark({ className }: { className?: string }) {
  return <MessageCircle className={className} />;
}
