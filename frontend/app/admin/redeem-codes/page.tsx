"use client";

import { useEffect, useState } from "react";
import { Gift, RefreshCw, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

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
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />
      <section className="mx-auto max-w-[980px] px-6 py-8">
        <p className="text-xs font-black uppercase text-[#e52b2f]">Admin</p>
        <h1 className="mt-2 text-4xl font-black tracking-normal">Redeem codes Free Fire</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#667085]">
          Appuie une fois par jour pour appeler l’API HL Gaming, récupérer les redeem codes trouvés et les afficher pendant 24H dans la recherche. Les visiteurs devront taper <b>code gratuit</b>.
        </p>

        <section className="mt-8 rounded-lg border border-[#e5e7eb] bg-[#fbfbff] p-6 shadow-[0_14px_38px_rgba(16,24,40,.06)]">
          <div className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-lg bg-red-50 text-[#e52b2f]">
                <Gift className="h-7 w-7" />
              </span>
              <div>
                <h2 className="text-xl font-black">Publier les codes du jour</h2>
                <p className="mt-1 text-sm font-semibold text-[#667085]">Le bouton appelle l’API, met les codes en cache, puis les retire automatiquement après 24H.</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {enabled ? (
                <button
                  disabled={loading}
                  onClick={disableCodes}
                  className="h-12 rounded-lg bg-[#111827] px-5 text-sm font-black text-white transition hover:bg-black disabled:opacity-60"
                >
                  Masquer
                </button>
              ) : null}
              <button
                disabled={loading}
                onClick={publishTodayCodes}
                className="h-12 rounded-lg bg-[#e52b2f] px-6 text-sm font-black text-white transition hover:bg-[#c91f27] disabled:opacity-60"
              >
                {loading ? "Chargement..." : "Afficher les codes du jour"}
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-[#e5e7eb] bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-black">
              <ShieldCheck className={`h-5 w-5 ${enabled ? "text-emerald-600" : "text-[#667085]"}`} />
              Statut : {enabled ? "visible" : "masqué"}
            </p>
            {publishedAt ? <p className="mt-3 text-sm font-semibold text-[#667085]">Publié le : {formatDate(publishedAt)}</p> : null}
            {enabledUntil ? <p className="mt-1 text-sm font-semibold text-[#667085]">Visible jusqu’au : {formatDate(enabledUntil)}</p> : null}
            {message ? <p className="mt-3 text-sm font-semibold text-[#667085]">{message}</p> : null}
          </div>

          <button onClick={load} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-[#d8dde7] px-4 text-xs font-black text-[#111827] transition hover:border-[#e52b2f]">
            <RefreshCw className="h-4 w-4" />
            Rafraîchir le statut
          </button>
        </section>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
