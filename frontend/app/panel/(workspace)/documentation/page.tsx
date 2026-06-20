"use client";

import { Copy, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePanelData } from "@/components/panel/panel-data";
import { buildDocumentationText, CodeTabs, copyText, downloadText, PageSection } from "@/components/panel/panel-ui";

export default function PanelDocumentationPage() {
  const { apiKeys, documentation, products } = usePanelData();
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const autoDownloadDone = useRef(false);

  if (!documentation) return null;

  const firstProductId = products[0] ? String(products[0].id) : undefined;
  const fullDoc = buildDocumentationText(documentation, apiKeys.sandbox?.key, apiKeys.live?.prefix ?? null);
  const filename = "astral4gamer-partner-api.txt";

  useEffect(() => {
    if (searchParams.get("download") !== "1" || autoDownloadDone.current) {
      return;
    }

    autoDownloadDone.current = true;
    downloadText(filename, fullDoc);
  }, [filename, fullDoc, searchParams]);

  async function handleCopy() {
    const copied = await copyText(fullDoc);
    setCopyFeedback(copied ? "Documentation copiée." : "Copie impossible depuis ce navigateur. Utilise le téléchargement.");
    window.setTimeout(() => setCopyFeedback(null), 2800);
  }

  return (
    <div className="space-y-4">
      <PageSection
        title="Documentation complète"
        description="Cette page sert de document d'intégration complet, copiable en entier et transmissible à un développeur."
        action={
          <div className="flex gap-2">
            <button onClick={() => void handleCopy()} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[linear-gradient(90deg,#5b34f4,#7c4dff)] px-3 text-xs font-semibold text-white">
              <Copy className="h-4 w-4" />
              Copier tout
            </button>
            <button onClick={() => downloadText(filename, fullDoc)} className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#30384a] bg-[#111827] px-3 text-xs font-semibold text-white">
              <Download className="h-4 w-4" />
              Télécharger
            </button>
          </div>
        }
      >
        <div className="mb-3 rounded-[14px] border border-[#1a2231] bg-[#101725] px-4 py-3 text-[12px] text-slate-300">
          Cette section reste dédiée à la documentation uniquement. Si tu veux télécharger directement le guide, utilise le bouton `Télécharger` ci-dessus.
        </div>
        <div className="rounded-[14px] border border-[#1a2231] bg-[#0c1221] p-3">
          <pre className="max-h-[540px] overflow-auto whitespace-pre-wrap rounded-[12px] bg-[#0a0f1b] p-4 text-[11px] leading-5 text-slate-300">{fullDoc}</pre>
        </div>
        {copyFeedback ? <p className="mt-3 text-xs font-semibold text-slate-400">{copyFeedback}</p> : null}
      </PageSection>

      <PageSection title="Exemples prêts à l'emploi" description="Par défaut, les exemples affichent la sandbox pour l'intégration et la phase de test.">
        <CodeTabs defaultKey={apiKeys.sandbox?.key} productId={firstProductId} />
      </PageSection>
    </div>
  );
}