"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Radio, RefreshCw, Settings, Video } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { API_BASE_URL } from "@/lib/api";

type YoutubeStatus = { connected: boolean; account?: { channel_title?: string; channel_id?: string; status?: string; token_expires_at?: string } | null };

export default function AdminVideoPage() {
  const [status, setStatus] = useState<YoutubeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  function headers() {
    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) { window.location.href = "/admin/login"; throw new Error("Session admin absente."); }
    return { Accept: "application/json", Authorization: `Bearer ${token}` };
  }

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/youtube/status`, { headers: headers(), cache: "no-store" });
      if (response.status === 401 || response.status === 403) { window.location.href = "/admin/login"; return; }
      if (!response.ok) throw new Error("Impossible de verifier YouTube.");
      setStatus(await response.json());
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chargement impossible."); }
    finally { setLoading(false); }
  }

  async function connectYoutube() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/youtube/redirect`, { headers: headers() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.url) throw new Error(payload?.message || "Connexion YouTube impossible.");
      window.location.href = payload.url;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connexion impossible."); setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return <AdminShell title="Video & lives" subtitle="Pilotage reel de YouTube, OBS et des contenus video.">
    {message ? <div className="mb-5 rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{message}</div> : null}
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
        <div className="flex items-start justify-between gap-4"><span className="grid h-11 w-11 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><Settings className="h-5 w-5" /></span><button onClick={() => void load()} disabled={loading} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div>
        <h2 className="mt-4 text-lg font-semibold">Connexion YouTube</h2>
        <p className="mt-2 text-sm text-slate-400">{status?.connected ? `Chaine connectee: ${status.account?.channel_title ?? status.account?.channel_id ?? "YouTube"}` : "Aucune chaine YouTube connectee au backend."}</p>
        <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs ${status?.connected ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>{status?.connected ? "Connecte" : "Non connecte"}</span>
        <button onClick={() => void connectYoutube()} disabled={loading} className="mt-5 block h-10 rounded-lg bg-violet-600 px-4 text-xs font-semibold disabled:opacity-50">{status?.connected ? "Reconnecter YouTube" : "Connecter YouTube"}</button>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-fuchsia-500/15 text-fuchsia-300"><Radio className="h-5 w-5" /></span>
        <h2 className="mt-4 text-lg font-semibold">Lives YouTube</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">La creation d'un live utilise le compte YouTube connecte et les routes Laravel protegees.</p>
        <a href="/admin/calendar" className="mt-5 inline-flex h-10 items-center rounded-lg border border-white/10 px-4 text-xs text-slate-200">Ouvrir le calendrier</a>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.045] p-5 lg:col-span-2">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Video className="h-5 w-5 text-violet-300" />Traitement video</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">Les replays, moments et highlights affiches ici proviendront exclusivement des tables Laravel et de la chaine YouTube connectee.</p>
      </section>
    </div>
    <section className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-5"><h2 className="flex items-center gap-2 text-sm font-semibold text-amber-100"><AlertTriangle className="h-4 w-4" />Configuration serveur</h2><p className="mt-2 text-sm text-amber-100/75">Les secrets YouTube et OBS restent uniquement dans le fichier `.env` du backend.</p></section>
  </AdminShell>;
}
