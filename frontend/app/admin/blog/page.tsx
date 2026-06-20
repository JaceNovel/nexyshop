"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Cloud, FilePlus2, RefreshCw, Send } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { API_BASE_URL } from "@/lib/api";

type IntegrationStatus = {
  google_people_connected: boolean;
  blogger_connected: boolean;
  blog_id_configured: boolean;
  blog_id?: string | null;
  last_sync_at?: string | null;
  last_error?: { endpoint: string; status_code?: number; created_at?: string } | null;
};
type BlogStats = { drafts: number; published: number; failed: number; blog_table_ready: boolean };

export default function AdminBlogPage() {
  const [postId, setPostId] = useState("");
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  function authHeaders() {
    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) {
      window.location.href = "/admin/login";
      throw new Error("Session admin absente.");
    }
    return { Accept: "application/json", Authorization: `Bearer ${token}` };
  }

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const headers = authHeaders();
      const [googleResponse, blogResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/integrations/google`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/admin/integrations/blog`, { headers, cache: "no-store" })
      ]);
      if ([googleResponse.status, blogResponse.status].some((status) => status === 401 || status === 403)) {
        localStorage.removeItem("nexy_sanctum_token");
        window.location.href = "/admin/login";
        return;
      }
      if (!googleResponse.ok || !blogResponse.ok) throw new Error("Impossible de charger les integrations Blogger.");
      setIntegrations(await googleResponse.json());
      setStats(await blogResponse.json());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function post(path: string, success: string) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "Operation impossible.");
      setMessage(success);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation impossible.");
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return <AdminShell title="Actualites & Blogger" subtitle="Publication et synchronisation des contenus Astral4Gamer.">
    <div className="mb-5 flex justify-end"><button onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-4 text-xs text-slate-200 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser</button></div>
    {message ? <div className="mb-5 rounded-lg border border-violet-400/20 bg-violet-400/10 px-4 py-3 text-sm text-violet-100">{message}</div> : null}
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Cloud className="h-5 w-5 text-violet-300" />Integrations Google</h2>
        <div className="mt-5 grid gap-3">
          <StatusRow label="Google People" ok={Boolean(integrations?.google_people_connected)} />
          <StatusRow label="Blogger OAuth" ok={Boolean(integrations?.blogger_connected)} />
          <StatusRow label="Blog ID" ok={Boolean(integrations?.blog_id_configured)} value={integrations?.blog_id ?? "Non configure"} />
        </div>
        <p className="mt-4 text-xs text-slate-500">Derniere synchronisation: {integrations?.last_sync_at ? new Date(integrations.last_sync_at).toLocaleString("fr-FR") : "Aucune"}</p>
        {integrations?.last_error ? <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-200">Derniere erreur: {integrations.last_error.endpoint} ({integrations.last_error.status_code})</p> : null}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold"><BookOpen className="h-5 w-5 text-violet-300" />Articles en base</h2>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric label="Brouillons" value={stats?.drafts ?? 0} />
          <Metric label="Publies" value={stats?.published ?? 0} />
          <Metric label="Echecs" value={stats?.failed ?? 0} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button disabled={loading} onClick={() => void post("/api/admin/blog-posts/generate-weekly-summary", "Article genere dans la base de donnees.")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-xs font-semibold disabled:opacity-50"><FilePlus2 className="h-4 w-4" />Generer un article</button>
          <input value={postId} onChange={(event) => setPostId(event.target.value)} className="h-10 w-28 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" placeholder="ID article" />
          <button disabled={loading || !postId} onClick={() => void post(`/api/admin/blog-posts/${postId}/publish-to-blogger`, "Article publie sur Blogger.")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-[#111827] disabled:opacity-40"><Send className="h-4 w-4" />Publier</button>
          <a href="/blog" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-4 text-xs text-slate-200"><BookOpen className="h-4 w-4" />Voir le blog</a>
        </div>
      </section>
    </div>
  </AdminShell>;
}

function StatusRow({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-lg bg-black/15 px-4 py-3 text-sm"><span className="text-slate-300">{label}</span><span className={`inline-flex items-center gap-2 text-xs font-medium ${ok ? "text-emerald-300" : "text-red-300"}`}><CheckCircle2 className="h-4 w-4" />{value ?? (ok ? "Connecte" : "Non connecte")}</span></div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-violet-500/10 p-4"><p className="text-2xl font-semibold text-violet-300">{value}</p><p className="mt-1 text-[10px] uppercase text-slate-400">{label}</p></div>;
}
