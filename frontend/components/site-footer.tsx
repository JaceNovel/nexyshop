"use client";

import { BadgePercent, Headphones, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const benefitItems: Array<[string, LucideIcon]> = [
  ["Livraison instantanée", Truck],
  ["Paiement sécurisé", ShieldCheck],
  ["Prix compétitifs", BadgePercent],
  ["Support client", Headphones]
];

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1586px] px-6 pb-10 pt-12">
      <div className="rounded-xl bg-[#f6f6f7] p-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3 text-[15px] text-[#374151]">
            <p><b>Entreprise:</b> Astral4Gamer</p>
            <p><b>Téléphone / WhatsApp:</b> +33 6 88 63 92 94</p>
            <p><b>YouTube:</b> @nexy</p>
            <p><b>Support:</b> Disponible pour les commandes, recharges et cartes cadeaux.</p>
          </div>
          <div className="grid grid-cols-2 gap-5 text-center md:grid-cols-4">
            {benefitItems.map(([item, Icon]) => (
              <div key={item} className="soft-pop rounded-lg bg-white p-4">
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-[#eaf2ff] text-[#0b55d9]">
                  <Icon className="h-5 w-5" />
                </div>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-9 grid gap-8 text-[14px] text-[#6b7280] md:grid-cols-4">
        <div><h3 className="mb-4 text-[16px] font-black text-black">Astral4Gamer</h3><p>A propos</p><p>Conditions d'utilisation</p><p>Politique de confidentialité</p><p>API revendeur</p></div>
        <div><h3 className="mb-4 text-[16px] font-black text-black">Services client</h3><p>Profil</p><p>Wallet</p><p>Commandes</p><p>Contact</p></div>
        <div><h3 className="mb-4 text-[16px] font-black text-black">Top produits</h3><p>CP Call of Duty Mobile</p><p>Diamants Free Fire</p><p>PUBG Mobile UC</p><p>Netflix Gift Card</p></div>
        <div><h3 className="mb-4 text-[16px] font-black text-black">Guide</h3><p>Achat top up automatique</p><p>Achat cartes cadeaux</p><p>Livraison instantanée</p><p>FAQ</p></div>
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
