"use client";

import { AlertTriangle, Copy, KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { usePanelData } from "@/components/panel/panel-data";
import { CodeTabs, copyText, formatDateTime, maskApiKey, PageSection, quickCode } from "@/components/panel/panel-ui";

export default function PanelApiPage() {
  const { apiKeys, products, regenerateLiveKey } = usePanelData();
  const [revealedLiveKey, setRevealedLiveKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sandboxKey = apiKeys.sandbox?.key;
  const liveKey = apiKeys.live;
  const firstProductId = products[0] ? String(products[0].id) : undefined;
  const effectiveLiveKey = revealedLiveKey ?? liveKey?.key ?? null;
  const liveKeyDisplay = effectiveLiveKey
    ? maskApiKey(effectiveLiveKey)
    : liveKey?.prefix
      ? `${liveKey.prefix}...`
      : "Aucune clé live active";

  async function onRegenerateLiveKey() {
    setMessage(null);
    setIsSubmitting(true);

    const result = await regenerateLiveKey();

    if (!result.ok || !result.key) {
      setMessage(result.message ?? "Impossible de générer une nouvelle clé live.");
      setIsSubmitting(false);
      return;
    }

    setRevealedLiveKey(result.key);
    setMessage("Nouvelle clé live générée. Copiez-la maintenant: elle ne sera plus réaffichée.");
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <PageSection title="Clé sandbox" description="Utilisez cette clé pour les tests, la documentation et l'intégration initiale.">
          <div className="flex gap-2 rounded-[12px] border border-[#1a2231] bg-[#0c1221] p-1.5">
            <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[10px] bg-[#0a0f1b] px-3 py-2.5 text-[12px] text-slate-200">{sandboxKey ? maskApiKey(sandboxKey) : "Clé sandbox indisponible"}</code>
            <button disabled={!sandboxKey} onClick={() => sandboxKey ? void copyText(sandboxKey) : undefined} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[linear-gradient(90deg,#5b34f4,#7c4dff)] px-3 text-xs font-semibold text-white disabled:opacity-50">
              <Copy className="h-4 w-4" />
              Copier
            </button>
          </div>
          <div className="mt-3 rounded-[12px] border border-[#1d3b28] bg-[#0f1d15] px-3 py-2.5 text-[12px] leading-5 text-emerald-200">
            La sandbox peut être utilisée pour tester les appels, préparer les payloads et donner un exemple à un intégrateur.
          </div>
        </PageSection>

        <PageSection title="Clé live production" description="Réservée au serveur backend en production uniquement.">
          <div className="flex gap-2 rounded-[12px] border border-[#1a2231] bg-[#0c1221] p-1.5">
            <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[10px] bg-[#0a0f1b] px-3 py-2.5 text-[12px] text-slate-200">{liveKeyDisplay}</code>
            {effectiveLiveKey ? (
              <button onClick={() => void copyText(effectiveLiveKey)} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[linear-gradient(90deg,#5b34f4,#7c4dff)] px-3 text-xs font-semibold text-white">
                <Copy className="h-4 w-4" />
                Copier
              </button>
            ) : null}
            <button onClick={() => void onRegenerateLiveKey()} disabled={isSubmitting} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#182032] px-3 text-xs font-semibold text-white disabled:opacity-50">
              <KeyRound className="h-4 w-4" />
              {isSubmitting ? "Génération..." : "Regénérer"}
            </button>
          </div>
          {liveKey?.source === "partnership_approval" ? (
            <div className="mt-3 rounded-[12px] border border-[#1d3b28] bg-[#0f1d15] px-3 py-2.5 text-[12px] leading-5 text-emerald-200">
              Cette clé correspond à la clé live générée lors de la validation du partenariat Discord.
            </div>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-3 text-[12px] text-slate-300">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Dernière utilisation</p>
              <p className="mt-2 text-white">{formatDateTime(liveKey?.last_used_at)}</p>
            </div>
            <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-3 text-[12px] text-slate-300">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Créée le</p>
              <p className="mt-2 text-white">{formatDateTime(liveKey?.created_at)}</p>
            </div>
          </div>
          {revealedLiveKey ? (
            <div className="mt-3 rounded-[12px] border border-emerald-900 bg-emerald-950/30 p-3 text-[12px] text-emerald-100">
              <p className="font-bold">Nouvelle clé live</p>
              <div className="mt-2 flex gap-2 rounded-[10px] border border-emerald-900/60 bg-[#0a0f1b] p-1.5">
                <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[8px] px-2 py-2 text-[12px]">{revealedLiveKey}</code>
                <button onClick={() => void copyText(revealedLiveKey)} className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-emerald-600 px-3 text-xs font-semibold text-white">
                  <Copy className="h-4 w-4" />
                  Copier
                </button>
              </div>
            </div>
          ) : null}
          {message ? <p className="mt-3 rounded-[12px] border border-[#1a2231] bg-[#0f1521] px-3 py-2.5 text-[12px] text-slate-300">{message}</p> : null}
          <div className="mt-3 rounded-[12px] border border-[#4a1d1d] bg-[#251111] px-3 py-2.5 text-[12px] leading-5 text-red-200">
            Ne partagez jamais la clé live avec un client, dans un dépôt Git, dans le navigateur ou dans le code frontend. La valeur complète n'est pas récupérable après sa création.
          </div>
        </PageSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <PageSection title="Exemple d'appel sandbox" description="Le panel montre volontairement la sandbox par défaut pour les échanges d'intégration.">
          <CodeTabs defaultKey={sandboxKey} productId={firstProductId} />
        </PageSection>

        <PageSection title="Règles de sécurité" description="Séparez clairement test et production.">
          <div className="space-y-3 text-[12px] text-slate-300">
            <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-4">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                <p className="font-bold">Sandbox pour documentation</p>
              </div>
              <p className="mt-2 leading-5 text-slate-500">Quand vous envoyez la documentation à un intégrateur, utilisez la sandbox et gardez la clé live privée.</p>
            </div>
            <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-4">
              <div className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                <p className="font-bold">Live uniquement en production backend</p>
              </div>
              <p className="mt-2 leading-5 text-slate-500">Le passage de la sandbox à la live doit se faire seulement après tests validés, sur un backend sécurisé, avec variables d'environnement côté serveur.</p>
            </div>
            <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-4">
              <p className="font-bold text-white">Template cURL production</p>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-[10px] bg-[#0a0f1b] p-3 text-[11px] leading-5 text-slate-300">{quickCode("cURL", { key: "YOUR_LIVE_KEY", productId: firstProductId })}</pre>
            </div>
          </div>
        </PageSection>
      </section>
    </div>
  );
}