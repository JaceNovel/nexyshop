"use client";

import { usePanelData } from "@/components/panel/panel-data";
import { MetricCard, MiniInfo, PageSection, panelBalanceLabel, ProgressBar } from "@/components/panel/panel-ui";

export default function PanelSoldePage() {
  const { partner, products, stats } = usePanelData();

  if (!partner || !stats) return null;

  const lowBalance = partner.wallet.balance <= partner.low_balance_threshold;
  const thresholdPercent = Math.min(100, Math.max(10, (partner.wallet.balance / Math.max(partner.low_balance_threshold * 3, 1)) * 100));

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Solde actuel" value={panelBalanceLabel(partner)} accent={lowBalance ? "text-amber-300" : "text-emerald-300"} />
        <MetricCard label="Marge" value={`${partner.margin_percent}%`} />
        <MetricCard label="Catalogue" value={`${products.length} produits`} accent="text-[#a78bfa]" />
        <MetricCard label="Recharges ce mois" value={`${stats.topups_this_month.toFixed(2)} ${partner.wallet.currency}`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <PageSection title="Statut du wallet" description="Lecture claire du niveau de solde et du seuil d'alerte.">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniInfo label="Solde" value={panelBalanceLabel(partner)} />
            <MiniInfo label="Seuil d'alerte" value={`${partner.low_balance_threshold} ${partner.wallet.currency}`} />
            <MiniInfo label="Marge" value={`${partner.margin_percent}%`} />
            <MiniInfo label="Devise" value={partner.wallet.currency} />
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>Niveau de couverture</span>
              <span>{partner.low_balance_threshold} {partner.wallet.currency}</span>
            </div>
            <ProgressBar value={thresholdPercent} tone={lowBalance ? "amber" : "emerald"} />
          </div>
        </PageSection>

        <PageSection title="Recommandations" description="Ce qu'il faut surveiller côté exploitation.">
          <ul className="space-y-2 text-[12px] leading-5 text-slate-300">
            <li>{lowBalance ? "Le solde est sous surveillance: rechargez rapidement pour éviter un blocage des commandes." : "Le solde actuel reste au-dessus du seuil d'alerte configuré."}</li>
            <li>Dépenses du mois: {stats.spend_this_month.toFixed(2)} {partner.wallet.currency}.</li>
            <li>Gardez une réserve supérieure au seuil d'alerte si vous automatisez les achats en série.</li>
          </ul>
        </PageSection>
      </section>
    </div>
  );
}