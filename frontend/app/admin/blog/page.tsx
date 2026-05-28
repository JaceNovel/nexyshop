"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Cloud, FilePlus2, RefreshCw, Send, Settings } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
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
  const [token, setToken] = useState("");
  const [postId, setPostId] = useState("");
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [stats, setStats] = useState<BlogStats | null>(null);

  async function load() {
    const storedToken = localStorage.getItem("nexy_sanctum_token") ?? token;
    setToken(storedToken);
    if (!storedToken) return;

    const headers = { Accept: "application/json", Authorization: `Bearer ${storedToken}` };
    const [googleResponse, blogResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/admin/integrations/google`, { headers }),
      fetch(`${API_BASE_URL}/api/admin/integrations/blog`, { headers })
    ]);
    if (googleResponse.ok) setIntegrations(await googleResponse.json());
    if (blogResponse.ok) setStats(await blogResponse.json());
  }

  async function post(path: string) {
    const storedToken = localStorage.getItem("nexy_sanctum_token") ?? token;
    if (!storedToken) return;
    await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${storedToken}` }
    });
    await load();
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />
      <section className="mx-auto max-w-[1180px] px-6 py-8">
        <p className="text-xs font-black uppercase text-[#6d28d9]">Admin</p>
        <h1 className="mt-2 text-4xl font-black tracking-normal">Google Integrations & Blog</h1>

        <label className="mt-6 flex max-w-xl items-center rounded-lg border border-[#e6e7ee] bg-[#fbfbff] px-4">
          <Settings className="mr-3 h-5 w-5 text-[#6d28d9]" />
          <input value={token} onChange={(event) => setToken(event.target.value)} className="h-12 w-full bg-transparent text-sm outline-none" placeholder="Token Sanctum admin" />
          <button onClick={load} className="ml-3 inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3 text-xs font-black text-white"><RefreshCw className="h-3.5 w-3.5" /> Sync</button>
        </label>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-[#ececf3] bg-[#fbfbff] p-5">
            <h2 className="flex items-center gap-2 text-lg font-black"><Cloud className="h-5 w-5 text-[#6d28d9]" /> Google Integrations</h2>
            <div className="mt-5 grid gap-3 text-sm">
              <StatusRow label="Google People" ok={Boolean(integrations?.google_people_connected)} />
              <StatusRow label="Blogger" ok={Boolean(integrations?.blogger_connected)} />
              <StatusRow label="Blog ID configure" ok={Boolean(integrations?.blog_id_configured)} value={integrations?.blog_id ?? "BLOGGER_BLOG_ID"} />
              <p className="text-[#5b6170]">Derniere synchronisation: {integrations?.last_sync_at ? new Date(integrations.last_sync_at).toLocaleString("fr-FR") : "Aucune"}</p>
              {integrations?.last_error ? <p className="text-amber-700">Derniere erreur API: {integrations.last_error.endpoint} ({integrations.last_error.status_code})</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-[#ececf3] bg-white p-5">
            <h2 className="flex items-center gap-2 text-lg font-black"><BookOpen className="h-5 w-5 text-[#6d28d9]" /> Blog</h2>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Brouillons" value={stats?.drafts ?? 0} />
              <Metric label="Publies" value={stats?.published ?? 0} />
              <Metric label="Echecs" value={stats?.failed ?? 0} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => post("/api/admin/blog-posts/generate-weekly-summary")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6d28d9] px-4 text-xs font-black text-white"><FilePlus2 className="h-4 w-4" /> Generer article</button>
              <input value={postId} onChange={(event) => setPostId(event.target.value)} className="h-10 w-28 rounded-lg border border-[#d7dce5] px-3 text-sm font-bold outline-none" placeholder="ID article" />
              <button onClick={() => postId && post(`/api/admin/blog-posts/${postId}/publish-to-blogger`)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#111827] px-4 text-xs font-black text-white"><Send className="h-4 w-4" /> Publier sur Blogger</button>
              <a href="/blog" className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d7dce5] px-4 text-xs font-black"><Send className="h-4 w-4" /> Voir les articles</a>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function StatusRow({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3">
      <span className="font-bold">{label}</span>
      <span className={`inline-flex items-center gap-2 text-xs font-black ${ok ? "text-[#047857]" : "text-[#9f1239]"}`}>
        <CheckCircle2 className="h-4 w-4" /> {value ?? (ok ? "Connecte" : "Non connecte")}
      </span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#f5f3ff] p-4">
      <p className="text-2xl font-black text-[#6d28d9]">{value}</p>
      <p className="mt-1 text-xs font-black uppercase text-[#4c1d95]">{label}</p>
    </div>
  );
}
