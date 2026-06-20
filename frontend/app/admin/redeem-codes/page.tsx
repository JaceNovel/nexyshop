"use client";

import { useEffect, useState } from "react";
import { Gift, RefreshCw, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminRedeemCodesPage() {
  const [enabled, setEnabled] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [enabledUntil, setEnabledUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/redeem-codes", { cache: "no-store" });
    const payload = await response.json();
    setEnabled(Boolean(payload.enabled));
    setPublishedAt(payload.publishedAt ?? null);
    setEnabledUntil(payload.enabledUntil ?? null);
    setLoading(false);
  }

  async function publishTodayCodes() {
    setMessage("");
    setLoading(true);
    const response = await fetch("/api/admin/redeem-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish" })
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.message ?? "Impossible de publier les redeem codes.");
      return;
    }

    setEnabled(Boolean(payload.enabled));
    setPublishedAt(payload.publishedAt ?? null);
    setEnabledUntil(payload.enabledUntil ?? null);
    setMessage(`${payload.codesCount ?? 0} redeem codes publiés pour 24H dans la recherche.`);
  }

  async function disableCodes() {
    setMessage("");
    const response = await fetch("/api/admin/redeem-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false })
    });
    const payload = await response.json();
    setEnabled(Boolean(payload.enabled));
    setPublishedAt(payload.publishedAt ?? null);
    setEnabledUntil(payload.enabledUntil ?? null);
    setMessage("Les redeem codes sont masqués.");
  }

  useEffect(() => {
    load().catch(() => {
      setLoading(false);
      setMessage("Impossible de charger le réglage.");
    });
  }, []);

  return (
    <AdminShell title="Codes promo" subtitle="Publication et disponibilite des redeem codes Free Fire.">
      <section className="max-w-[980px]">
        <p className="max-w-2xl text-sm leading-6 text-slate-400">
          Appuie une fois par jour pour récupérer les redeem codes trouvés et les afficher pendant 24H dans la recherche. Les visiteurs devront taper <b>code gratuit</b>.
        </p>

        <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/10 sm:p-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-violet-300">
                <Gift className="h-7 w-7" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Publier les codes du jour</h2>
                <p className="mt-1 text-sm text-slate-400">Le bouton appelle l’API, met les codes en cache, puis les retire automatiquement après 24H.</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {enabled ? (
                <button
                  disabled={loading}
                  onClick={disableCodes}
                  className="h-11 rounded-lg border border-white/10 px-5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Masquer
                </button>
              ) : null}
              <button
                disabled={loading}
                onClick={publishTodayCodes}
                className="h-11 rounded-lg bg-violet-600 px-6 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60"
              >
                {loading ? "Chargement..." : "Afficher les codes du jour"}
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-black/15 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className={`h-5 w-5 ${enabled ? "text-emerald-300" : "text-slate-500"}`} />
              Statut : {enabled ? "visible" : "masqué"}
            </p>
            {publishedAt ? <p className="mt-3 text-sm text-slate-400">Publié le : {formatDate(publishedAt)}</p> : null}
            {enabledUntil ? <p className="mt-1 text-sm text-slate-400">Visible jusqu’au : {formatDate(enabledUntil)}</p> : null}
            {message ? <p className="mt-3 text-sm text-violet-200">{message}</p> : null}
          </div>

          <button onClick={load} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-4 text-xs text-slate-200">
            <RefreshCw className="h-4 w-4" />
            Rafraîchir le statut
          </button>
        </section>
      </section>
    </AdminShell>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
