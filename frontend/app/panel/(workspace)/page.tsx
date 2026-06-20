"use client";

import { FileCode2, KeyRound, Wallet } from "lucide-react";
import Link from "next/link";
import { usePanelData } from "@/components/panel/panel-data";
import { formatDateTime, formatNumber, MetricCard, MiniInfo, PageSection, panelBalanceLabel } from "@/components/panel/panel-ui";

export default function PanelDashboardPage() {
  const { partner, products, recentOrders, stats } = usePanelData();

  if (!partner || !stats) return null;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Commandes aujourd'hui" value={formatNumber(stats.orders_today)} accent="text-emerald-300" />
        <MetricCard label="Commandes ce mois" value={formatNumber(stats.orders_this_month)} />
        <MetricCard label="Taux de réussite" value={stats.success_rate === null ? "Aucune donnée" : `${stats.success_rate}%`} />
        <MetricCard label="Catalogue" value={`${stats.catalog_products || products.length} produits`} accent="text-[#a78bfa]" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <PageSection title="Raccourcis utiles" description="Accès rapides vers les parties essentielles du panel.">
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/panel/api" className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-4 text-sm text-slate-300">
              <KeyRound className="h-5 w-5 text-[#a78bfa]" />
              <p className="mt-3 text-[14px] font-bold text-white">Clés API</p>
              <p className="mt-1 text-[12px] text-slate-500">Sandbox, live et règles de sécurité.</p>
            </Link>
            <Link href="/panel/documentation" className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-4 text-sm text-slate-300">
              <FileCode2 className="h-5 w-5 text-[#a78bfa]" />
              <p className="mt-3 text-[14px] font-bold text-white">Documentation</p>
              <p className="mt-1 text-[12px] text-slate-500">Guide complet à copier et transmettre.</p>
            </Link>
            <Link href="/panel/solde" className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-4 text-sm text-slate-300">
              <Wallet className="h-5 w-5 text-[#a78bfa]" />
              <p className="mt-3 text-[14px] font-bold text-white">Wallet</p>
              <p className="mt-1 text-[12px] text-slate-500">Solde, seuil d'alerte et marge actuelle.</p>
            </Link>
          </div>
        </PageSection>

        <PageSection title="Vue partenaire" description="État rapide du compte revendeur.">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniInfo label="Solde" value={panelBalanceLabel(partner)} />
            <MiniInfo label="Marge" value={`${partner.margin_percent}%`} />
            <MiniInfo label="Statut" value={partner.status ?? "inconnu"} />
            <MiniInfo label="Seuil d'alerte" value={`${partner.low_balance_threshold} ${partner.wallet.currency}`} />
          </div>
        </PageSection>
      </section>

      <PageSection title="Commandes récentes" description="Dernières commandes réellement enregistrées pour ce partenaire.">
        <div className="overflow-x-auto">
          <div className="min-w-[640px] space-y-2">
            <div className="grid grid-cols-[1.2fr_1.8fr_120px_120px_150px] gap-3 px-2 pb-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">
              <span>Référence</span>
              <span>Produit</span>
              <span>Statut</span>
              <span>Montant</span>
              <span>Date</span>
            </div>
            {recentOrders.length ? recentOrders.map((order) => (
              <div key={order.id} className="grid grid-cols-[1.2fr_1.8fr_120px_120px_150px] items-center gap-3 rounded-[12px] border border-[#1a2231] bg-[#0f1521] px-3 py-2.5 text-[12px]">
                <span className="truncate text-slate-200">{order.external_reference}</span>
                <span className="truncate text-slate-300">{order.product_name ?? `Produit #${order.product_id}`}</span>
                <span className="inline-flex w-fit rounded-md bg-sky-500/14 px-2.5 py-1 text-[11px] font-black text-sky-300">{order.status}</span>
                <span className="text-slate-400">{order.amount.toFixed(2)} {order.currency}</span>
                <span className="text-slate-500">{formatDateTime(order.created_at)}</span>
              </div>
            )) : (
              <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] px-3 py-6 text-center text-[12px] text-slate-500">
                Aucune commande reseller enregistrée pour le moment.
              </div>
            )}
          </div>
        </div>
      </PageSection>
    </div>
  );
}