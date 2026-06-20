"use client";

import { usePanelData } from "@/components/panel/panel-data";
import { MiniInfo, PageSection, panelDisplayName } from "@/components/panel/panel-ui";

export default function PanelParametresPage() {
  const { partner, logout } = usePanelData();

  if (!partner) return null;

  return (
    <div className="space-y-4">
      <PageSection title="Compte partenaire" description="Informations actuellement utilisées par le panel.">
        <div className="grid gap-3 md:grid-cols-3">
          <MiniInfo label="Société" value={panelDisplayName(partner)} />
          <MiniInfo label="Email" value={partner.email} />
          <MiniInfo label="Statut" value={partner.status ?? "inconnu"} />
          <MiniInfo label="Scope" value={partner.allowed_scope ?? "standard"} />
          <MiniInfo label="Marge" value={`${partner.margin_percent}%`} />
          <MiniInfo label="Minimum top-up" value={`${partner.minimum_topup} ${partner.wallet.currency}`} />
          <MiniInfo label="Seuil d'alerte" value={`${partner.low_balance_threshold} ${partner.wallet.currency}`} />
        </div>
        <div className="mt-3 rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-4 text-[12px] text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Jeux autorisés</p>
          <p className="mt-2 text-white">{partner.allowed_games?.length ? partner.allowed_games.join(", ") : "Aucun jeu explicitement listé"}</p>
        </div>
      </PageSection>

      <PageSection title="Rappels d'environnement" description="Organisation recommandée côté intégration.">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-4 text-[12px] leading-5 text-slate-300">
            <p className="font-bold text-white">Préproduction</p>
            <p className="mt-2 text-slate-500">Utilisez la sandbox pour les tests, les essais de payload et la documentation envoyée à un intégrateur.</p>
          </div>
          <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-4 text-[12px] leading-5 text-slate-300">
            <p className="font-bold text-white">Production</p>
            <p className="mt-2 text-slate-500">Utilisez uniquement la live côté backend sécurisé, jamais dans le frontend ou une documentation publique.</p>
          </div>
        </div>
        <button onClick={logout} className="mt-4 inline-flex h-9 items-center rounded-[10px] bg-[#141b29] px-3 text-xs font-semibold text-white">Déconnexion</button>
      </PageSection>
    </div>
  );
}