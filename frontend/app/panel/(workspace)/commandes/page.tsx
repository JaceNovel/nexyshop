"use client";

import { Copy } from "lucide-react";
import { usePanelData } from "@/components/panel/panel-data";
import { copyText, formatDateTime, MethodBadge, PageSection } from "@/components/panel/panel-ui";

export default function PanelCommandesPage() {
  const { documentation, recentOrders } = usePanelData();

  if (!documentation) return null;

  return (
    <div className="space-y-4">
      <PageSection title="Endpoints principaux" description="Chaque action clé dispose de son propre endpoint dédié.">
        <div className="space-y-2">
          {documentation.endpoints.map((endpoint) => (
            <div key={`${endpoint.method}-${endpoint.path}`} className="grid grid-cols-[62px_1fr_auto_20px] items-center gap-3 rounded-[12px] border border-[#1a2231] bg-[#0f1521] px-3 py-2.5 text-[12px]">
              <MethodBadge method={endpoint.method} />
              <code className="text-slate-200">{endpoint.path}</code>
              <span className="hidden text-slate-500 lg:block">{endpoint.description}</span>
              <button onClick={() => void copyText(endpoint.path)} className="text-slate-500">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </PageSection>

      <section className="grid gap-4 xl:grid-cols-3">
        <PageSection title="Flux 1" description="Créer une commande proprement.">
          <ol className="space-y-2 text-[12px] leading-5 text-slate-300">
            <li>1. Récupérer le catalogue via GET /products et sélectionner un product_id valide.</li>
            <li>2. Vérifier le solde via GET /get-balance avant les achats en série.</li>
            <li>3. Envoyer la commande vers POST /order/add-order avec `data.player_id` et `data.region`.</li>
            <li>4. Conserver `order_id` et `partner_reference` pour le suivi.</li>
          </ol>
        </PageSection>
        <PageSection title="Flux 2" description="Suivre les commandes.">
          <ol className="space-y-2 text-[12px] leading-5 text-slate-300">
            <li>1. Lire l'ID Astral ou la référence partenaire retournée à la création.</li>
            <li>2. Interroger GET /order/get-order avec `order_id` pour l'état réel.</li>
            <li>3. Réconcilier les montants et statuts avec votre système interne.</li>
          </ol>
        </PageSection>
        <PageSection title="Flux 3" description="Avant la production.">
          <ol className="space-y-2 text-[12px] leading-5 text-slate-300">
            <li>1. Tester tout en sandbox.</li>
            <li>2. Déplacer la clé live côté backend seulement.</li>
            <li>3. Activer les logs, la surveillance du solde et les alertes d'erreur.</li>
          </ol>
        </PageSection>
      </section>

      <PageSection title="Historique des commandes" description="Dernières commandes réellement enregistrées.">
        <div className="space-y-2">
          {recentOrders.length ? recentOrders.map((order) => (
            <div key={order.id} className="grid gap-2 rounded-[12px] border border-[#1a2231] bg-[#0f1521] px-3 py-3 text-[12px] text-slate-300 md:grid-cols-[1.4fr_1.4fr_120px_140px] md:items-center">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Référence</p>
                <p className="mt-1 text-white">{order.external_reference}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Produit</p>
                <p className="mt-1 text-white">{order.product_name ?? `Produit #${order.product_id}`}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Montant</p>
                <p className="mt-1 text-white">{order.amount.toFixed(2)} {order.currency}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Date</p>
                <p className="mt-1 text-white">{formatDateTime(order.created_at)}</p>
              </div>
            </div>
          )) : (
            <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] px-3 py-6 text-center text-[12px] text-slate-500">
              Aucune commande reseller enregistrée.
            </div>
          )}
        </div>
      </PageSection>
    </div>
  );
}