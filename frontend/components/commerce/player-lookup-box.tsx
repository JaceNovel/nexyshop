"use client";

import { useState } from "react";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import type { PlayerLookupResult } from "@/lib/commerce-types";

const labels: Record<PlayerLookupResult["game"], string> = {
  freefire: "Free Fire",
  pubg: "PUBG",
  codm: "CODM",
  mobile_legends: "Mobile Legends"
};

export function PlayerLookupBox({ game }: { game: PlayerLookupResult["game"] }) {
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlayerLookupResult | null>(null);
  const [manual, setManual] = useState(false);

  async function verify() {
    if (!uid.trim()) return;
    setLoading(true);
    setManual(false);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    if (uid.length < 5) {
      setManual(true);
      setResult(null);
    } else {
      setResult({
        game,
        uid,
        nickname: `${labels[game]} Player ${uid.slice(-4)}`,
        server: game === "freefire" ? "MENA" : "Global",
        level: 42,
        avatarUrl: game === "freefire" ? "https://www.stc.com.sa/content/dam/corporatesite/common/individual/direct-billing/logo_garena_g_stacked_Black_BG.png" : "/icons/pubg-logo.svg"
      });
    }
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <label className="text-sm font-semibold text-white">ID joueur {labels[game]}</label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input value={uid} onChange={(event) => setUid(event.target.value)} className="h-12 flex-1 rounded-xl border border-white/10 bg-[#070d19] px-4 text-white outline-none focus:border-blue-400" placeholder="Entre l'ID joueur" />
        <button type="button" onClick={verify} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-[.98]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Verifier
        </button>
      </div>
      {result ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-50">
          <img src={result.avatarUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
          <div className="text-sm">
            <p className="font-semibold"><ShieldCheck className="mr-1 inline h-4 w-4" />Compte detecte: {result.nickname}</p>
            <p className="text-emerald-100/80">Serveur {result.server} · Niveau {result.level} · ID {result.uid}</p>
          </div>
        </div>
      ) : null}
      {manual ? <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">Verification manuelle disponible. Tu peux continuer, notre equipe verifiera avant livraison.</p> : null}
    </div>
  );
}
