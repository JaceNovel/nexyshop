"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Copy, Download, Filter, KeyRound, PauseCircle, PlayCircle, RefreshCw, Save, Search } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { API_BASE_URL } from "@/lib/api";

type SectionPayload = {
  columns: string[];
  rows: string[][];
  filters: string[];
  total: number;
  empty_message?: string | null;
};

const sectionMeta: Record<string, [string, string]> = {
  users: ["Utilisateurs", "Comptes reels enregistres sur Astral4Gamer."],
  players: ["Joueurs", "Profils gaming et statistiques stockes sur la plateforme."],
  roles: ["Roles & permissions", "Repartition reelle des acces administrateur et utilisateur."],
  tournaments: ["Tournois", "Competitions enregistrees dans la base de donnees."],
  participations: ["Participations", "Equipes et joueurs inscrits aux tournois."],
  registrations: ["Participations", "Equipes et joueurs inscrits aux tournois."],
  matches: ["Matchs", "Rencontres programmees et resultats enregistres."],
  rankings: ["Classements", "Classement calcule depuis les points et kills reels."],
  products: ["Produits", "Catalogue synchronise avec les fournisseurs actifs."],
  orders: ["Commandes", "Commandes clients et etat de livraison."],
  transactions: ["Transactions", "Paiements enregistres par les prestataires."],
  payments: ["Transactions", "Paiements enregistres par les prestataires."],
  resellers: ["Revendeurs API", "Partenaires B2B, soldes et commandes API."],
  calendar: ["Calendrier", "Dates des tournois enregistres."],
  news: ["Actualites", "Articles crees dans Astral4Gamer et Blogger."],
  pages: ["Pages du site", "Contenus institutionnels enregistres."],
  banners: ["Bannieres", "Visuels promotionnels enregistres."],
  integrations: ["API & integrations", "Fournisseurs et appels API observes par Laravel."],
  settings: ["Parametres", "Configuration enregistree de la plateforme."],
  logs: ["Journaux d'activites", "Appels et erreurs API traces sur le serveur."],
  coupons: ["Codes promo", "Promotions enregistrees dans la base de donnees."]
};

const emptyPayload: SectionPayload = { columns: [], rows: [], filters: ["Tous"], total: 0 };

export default function AdminSectionPage() {
  const params = useParams<{ section: string }>();
  const section = String(params.section ?? "");
  const [title, subtitle] = sectionMeta[section] ?? ["Module admin", "Donnees de la plateforme."];
  const [payload, setPayload] = useState<SectionPayload>(emptyPayload);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (section === "resellers") {
    return <ResellersAdminSection title={title} subtitle={subtitle} />;
  }

  if (section === "orders") {
    return <OrdersAdminSection title={title} subtitle={subtitle} />;
  }

  if (section === "products") {
    return <ProductsAdminSection title={title} subtitle={subtitle} />;
  }

  async function load() {
    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const search = new URLSearchParams({ limit: "100" });
      if (query.trim()) search.set("q", query.trim());
      const response = await fetch(`${API_BASE_URL}/api/admin/sections/${section}?${search}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store"
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("nexy_sanctum_token");
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok) throw new Error("Impossible de charger les donnees depuis la base de l'hebergeur.");

      const data = await response.json() as SectionPayload;
      setPayload(data);
      setFilter(data.filters?.[0] ?? "Tous");
    } catch (exception) {
      setPayload(emptyPayload);
      setError(exception instanceof Error ? exception.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [section]);

  const rows = useMemo(() => {
    if (filter === "Tous" || filter.startsWith("Tous ") || filter === "Toutes" || filter === "General") return payload.rows;
    const needle = filter.toLowerCase().replace(/s$/, "");
    return payload.rows.filter((row) => row.join(" ").toLowerCase().includes(needle));
  }, [filter, payload.rows]);

  function exportRows() {
    if (!payload.columns.length || !rows.length) return;
    const csv = [payload.columns, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `astral4gamer-${section}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <AdminShell title={title} subtitle={subtitle}>
    <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 flex-wrap gap-2">
        <label className="flex h-11 min-w-[230px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-slate-400 md:max-w-md">
          <Search className="h-4 w-4" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm text-white outline-none" placeholder={`Rechercher dans ${title.toLowerCase()}...`} />
        </label>
        <button type="submit" className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 text-slate-300" title="Rechercher"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-300">
          <Filter className="h-4 w-4" />
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="bg-transparent outline-none">{payload.filters.map((item) => <option className="bg-[#101827]" key={item}>{item}</option>)}</select>
        </label>
      </div>
      <button type="button" disabled={!rows.length} onClick={exportRows} className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"><Download className="h-4 w-4" />Exporter CSV</button>
    </form>

    {error ? <div className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

    <section className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/10">
      {loading ? <div className="grid min-h-64 place-items-center text-sm text-slate-400"><RefreshCw className="mb-3 h-6 w-6 animate-spin text-violet-400" />Chargement depuis MySQL...</div> : null}
      {!loading && rows.length === 0 ? <div className="grid min-h-64 place-items-center px-5 text-center"><div><p className="text-base font-medium">Aucune donnee enregistree</p><p className="mt-2 text-sm text-slate-400">{payload.empty_message ?? "La base de donnees de l'hebergeur ne contient encore aucun element pour cette section."}</p></div></div> : null}
      {!loading && rows.length > 0 ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left text-sm"><thead className="border-b border-white/10 bg-white/[0.035] text-[11px] uppercase tracking-wide text-slate-400"><tr>{payload.columns.map((column) => <th key={column} className="px-4 py-4 font-medium">{column}</th>)}</tr></thead><tbody className="divide-y divide-white/[0.07]">{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="transition hover:bg-violet-500/[0.06]">{row.map((cell, cellIndex) => <td key={cellIndex} className={`px-4 py-4 ${cellIndex === 0 ? "font-medium text-white" : "text-slate-300"}`}>{cellIndex === row.length - 1 ? <Status value={cell} /> : cell}</td>)}</tr>)}</tbody></table></div> : null}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs text-slate-400"><span>{rows.length} resultat{rows.length > 1 ? "s" : ""} charge{rows.length > 1 ? "s" : ""}</span><span>Source: base de donnees de l'hebergeur</span></footer>
    </section>

  </AdminShell>;
}

function Status({ value }: { value: string }) {
  const good = /actif|active|succes|livre|valide|connecte|publie|synchronise|ouvert|termine/i.test(value);
  const bad = /echec|erreur|banni|refuse|annule|inactif|suspendu|suspended|bloque/i.test(value);
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${good ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : bad ? "border-red-400/20 bg-red-400/10 text-red-300" : "border-amber-400/20 bg-amber-400/10 text-amber-200"}`}>{value}</span>;
}

type AllowedGame = {
  slug: string;
  label: string;
};

type ManualOrderField = {
  key: string;
  label: string;
  value: string;
};

type ManualOrder = {
  id: number;
  status: string;
  fulfillment_status?: string | null;
  amount: number;
  currency: string;
  created_at?: string | null;
  product_name: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  game_uid: string;
  nickname: string;
  field_entries: ManualOrderField[];
};

type ManagedProduct = {
  id: number;
  name: string;
  game: string;
  sku: string;
  price: number;
  currency: string;
  active: boolean;
  type: string;
  permalink?: string | null;
  delivery: string;
  manual_fulfillment: boolean;
  variants_count: number;
};

type ResellerRequest = {
  id: number;
  reference: string;
  name: string;
  company_name?: string | null;
  email: string;
  discord?: string | null;
  discord_user_id?: string | null;
  discord_username?: string | null;
  country?: string | null;
  audience?: string | null;
  network_url?: string | null;
  message: string;
  status: string;
};

type ResellerPartner = {
  id: number;
  name: string;
  company_name?: string | null;
  email: string;
  status: string;
  allowed_scope?: string;
  allowed_games: string[];
  margin_percent: number;
  wallet?: { balance: number; currency: string } | null;
};

type ResellerDashboard = {
  partners: { data: ResellerPartner[] };
  pending_requests: ResellerRequest[];
  available_games: AllowedGame[];
};

function ResellersAdminSection({ title, subtitle }: { title: string; subtitle: string }) {
  const [payload, setPayload] = useState<ResellerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<{ email: string; password: string; api_key: string; panel_url: string } | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [savingPartnerId, setSavingPartnerId] = useState<number | null>(null);
  const [togglingPartnerId, setTogglingPartnerId] = useState<number | null>(null);
  const [requestGames, setRequestGames] = useState<Record<number, string[]>>({});
  const [partnerGames, setPartnerGames] = useState<Record<number, string[]>>({});

  async function load() {
    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/resellers`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store"
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("nexy_sanctum_token");
        window.location.href = "/admin/login";
        return;
      }

      if (!response.ok) throw new Error("Impossible de charger les revendeurs API.");
      const data = await response.json() as ResellerDashboard;
      setPayload(data);
      setRequestGames(Object.fromEntries((data.pending_requests ?? []).map((request) => [request.id, defaultAllowedGames(data.available_games)])));
      setPartnerGames(Object.fromEntries((data.partners?.data ?? []).map((partner) => [partner.id, partner.allowed_games?.length ? partner.allowed_games : defaultAllowedGames(data.available_games)])));
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function approve(requestId: number) {
    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) return;

    setApprovingId(requestId);
    setError("");
    setCredentials(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/resellers/requests/${requestId}/approve`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ margin_percent: 10, allowed_games: requestGames[requestId] ?? defaultAllowedGames(payload?.available_games) })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(body.message ?? "Approbation impossible.");

      setCredentials(body.credentials);
      await load();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Approbation impossible.");
    } finally {
      setApprovingId(null);
    }
  }

  async function savePartner(partnerId: number) {
    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) return;

    setSavingPartnerId(partnerId);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/resellers/${partnerId}`, {
        method: "PATCH",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ allowed_games: partnerGames[partnerId] ?? defaultAllowedGames(payload?.available_games) })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(body.message ?? "Mise a jour impossible.");

      await load();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Mise a jour impossible.");
    } finally {
      setSavingPartnerId(null);
    }
  }

  async function togglePartnerStatus(partner: ResellerPartner) {
    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) return;

    setTogglingPartnerId(partner.id);
    setError("");

    try {
      const endpoint = partner.status === "active" ? "suspend" : "activate";
      const response = await fetch(`${API_BASE_URL}/api/admin/resellers/${partner.id}/${endpoint}`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(body.message ?? "Changement de statut impossible.");

      await load();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Changement de statut impossible.");
    } finally {
      setTogglingPartnerId(null);
    }
  }

  function toggleSelection(current: string[], slug: string) {
    const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
    return next.length ? next : [slug];
  }

  async function copyCredentials() {
    if (!credentials) return;
    await navigator.clipboard?.writeText([
      `Panel: ${credentials.panel_url}`,
      `Email: ${credentials.email}`,
      `Mot de passe: ${credentials.password}`,
      `API key: ${credentials.api_key}`,
    ].join("\n"));
  }

  return (
    <AdminShell title={title} subtitle={subtitle}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Les demandes Discord apparaissent ici. Quand tu approuves, le bot envoie automatiquement les accès en DM.</p>
        </div>
        <button onClick={load} className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm text-slate-200">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {error ? <div className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      {credentials ? (
        <section className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4" /> Partenaire approuvé</p>
              <p className="mt-1 text-xs text-emerald-100/80">Le bot Discord va envoyer ces accès au partenaire si ses messages privés sont ouverts.</p>
            </div>
            <button onClick={copyCredentials} className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-semibold">
              <Copy className="h-4 w-4" />
              Copier
            </button>
          </div>
          <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-xs leading-5">{`Panel: ${credentials.panel_url}
Email: ${credentials.email}
Mot de passe: ${credentials.password}
API key: ${credentials.api_key}`}</pre>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold"><KeyRound className="h-4 w-4 text-violet-300" /> Demandes en attente</h2>
          {loading ? <p className="text-sm text-slate-400">Chargement...</p> : null}
          {!loading && !payload?.pending_requests?.length ? <p className="text-sm text-slate-400">Aucune demande en attente.</p> : null}
          <div className="grid gap-3">
            {payload?.pending_requests?.map((request) => (
              <article key={request.id} className="rounded-lg border border-white/10 bg-[#0c1424] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{request.company_name || request.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{request.email} · {request.discord_username || request.discord || "Discord non lie"}</p>
                  </div>
                  <button disabled={approvingId === request.id} onClick={() => void approve(request.id)} className="h-9 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white disabled:opacity-50">
                    {approvingId === request.id ? "Approbation..." : "Approuver"}
                  </button>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{request.message}</p>
                <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                  <span>Référence: {request.reference}</span>
                  <span>Pays: {request.country || "Non renseigné"}</span>
                  <span>Volume: {request.audience || "Non renseigné"}</span>
                  <span>ID Discord: {request.discord_user_id || "Non fourni"}</span>
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Jeux autorisés</p>
                  <div className="flex flex-wrap gap-2">
                    {payload?.available_games?.map((game) => {
                      const selected = (requestGames[request.id] ?? defaultAllowedGames(payload?.available_games)).includes(game.slug);
                      return <button key={`${request.id}-${game.slug}`} type="button" onClick={() => setRequestGames((current) => ({ ...current, [request.id]: toggleSelection(current[request.id] ?? defaultAllowedGames(payload?.available_games), game.slug) }))} className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${selected ? "border-violet-400/30 bg-violet-500/15 text-violet-200" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>{game.label}</button>;
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <h2 className="mb-4 text-base font-semibold">Partenaires actifs</h2>
          <div className="grid gap-3">
            {payload?.partners?.data?.map((partner) => (
              <article key={partner.id} className="rounded-lg border border-white/10 bg-[#0c1424] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{partner.company_name || partner.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{partner.email}</p>
                  </div>
                  <Status value={partner.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <span>Solde: {(partner.wallet?.balance ?? 0).toFixed(2)} {partner.wallet?.currency ?? "USD"}</span>
                  <span>Marge: {partner.margin_percent}%</span>
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Jeux autorisés</p>
                  <div className="flex flex-wrap gap-2">
                    {payload?.available_games?.map((game) => {
                      const selected = (partnerGames[partner.id] ?? partner.allowed_games ?? defaultAllowedGames(payload?.available_games)).includes(game.slug);
                      return <button key={`${partner.id}-${game.slug}`} type="button" onClick={() => setPartnerGames((current) => ({ ...current, [partner.id]: toggleSelection(current[partner.id] ?? partner.allowed_games ?? defaultAllowedGames(payload?.available_games), game.slug) }))} className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${selected ? "border-violet-400/30 bg-violet-500/15 text-violet-200" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>{game.label}</button>;
                    })}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button disabled={savingPartnerId === partner.id} onClick={() => void savePartner(partner.id)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    {savingPartnerId === partner.id ? "Enregistrement..." : "Enregistrer les jeux"}
                  </button>
                  <button disabled={togglingPartnerId === partner.id} onClick={() => void togglePartnerStatus(partner)} className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-50 ${partner.status === "active" ? "bg-red-500/80" : "bg-emerald-600"}`}>
                    {partner.status === "active" ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    {togglingPartnerId === partner.id ? "Mise a jour..." : partner.status === "active" ? "Bloquer" : "Debloquer"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function defaultAllowedGames(games?: AllowedGame[] | null) {
  const available = games?.map((game) => game.slug).filter(Boolean) ?? [];
  return available.includes("free_fire") ? ["free_fire"] : available.slice(0, 1);
}

function ProductsAdminSection({ title, subtitle }: { title: string; subtitle: string }) {
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [priceDrafts, setPriceDrafts] = useState<Record<number, string>>({});
  const [activeDrafts, setActiveDrafts] = useState<Record<number, boolean>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  async function load(search = "") {
    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const response = await fetch(`${API_BASE_URL}/api/admin/products/manage?${params}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      const body = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("nexy_sanctum_token");
        window.location.href = "/admin/login";
        return;
      }

      if (!response.ok) throw new Error(body.message ?? "Impossible de charger les produits.");

      const nextProducts = Array.isArray(body.data) ? body.data as ManagedProduct[] : [];
      setProducts(nextProducts);
      setPriceDrafts(Object.fromEntries(nextProducts.map((product) => [product.id, String(product.price)])));
      setActiveDrafts(Object.fromEntries(nextProducts.map((product) => [product.id, product.active])));
    } catch (exception) {
      setProducts([]);
      setError(exception instanceof Error ? exception.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveProduct(productId: number) {
    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) return;

    setSavingId(productId);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          price: Number(priceDrafts[productId] ?? 0),
          active: Boolean(activeDrafts[productId]),
        })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(body.message ?? "Mise à jour impossible.");

      await load(query);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Mise à jour impossible.");
    } finally {
      setSavingId(null);
    }
  }

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) => [product.name, product.game, product.sku, product.permalink || ""].join(" ").toLowerCase().includes(needle));
  }, [products, query]);

  return <AdminShell title={title} subtitle={subtitle}>
    <form onSubmit={(event) => { event.preventDefault(); void load(query); }} className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <label className="flex h-11 min-w-[230px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-slate-400 md:max-w-md">
        <Search className="h-4 w-4" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm text-white outline-none" placeholder="Rechercher un produit..." />
      </label>
      <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm text-slate-200">
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Actualiser
      </button>
    </form>

    {error ? <div className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
    {loading ? <div className="grid min-h-64 place-items-center text-sm text-slate-400"><RefreshCw className="mb-3 h-6 w-6 animate-spin text-violet-400" />Chargement des produits...</div> : null}
    {!loading && !filteredProducts.length ? <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6 text-sm text-slate-400">Aucun produit trouvé.</div> : null}

    {!loading ? <section className="grid gap-4 xl:grid-cols-2">
      {filteredProducts.map((product) => <article key={product.id} className="rounded-xl border border-white/10 bg-[#0c1424] p-4 shadow-2xl shadow-black/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">#{product.id} · {product.name}</p>
            <p className="mt-1 text-xs text-slate-400">{product.game} · {product.sku}</p>
          </div>
          <Status value={product.active ? "Actif" : "Inactif"} />
        </div>

        <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
          <span>Type: {product.type}</span>
          <span>Livraison: {product.delivery}</span>
          <span>Permalink: {product.permalink || "-"}</span>
          <span>Variantes: {product.variants_count}</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Prix</span>
            <div className="mt-2 flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-3">
              <input value={priceDrafts[product.id] ?? ""} onChange={(event) => setPriceDrafts((current) => ({ ...current, [product.id]: event.target.value }))} className="h-11 w-full bg-transparent text-sm text-white outline-none" inputMode="decimal" />
              <span className="text-xs font-semibold text-slate-400">{product.currency}</span>
            </div>
          </label>
          <label className="flex items-end">
            <span className="flex h-11 w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-200">
              Actif
              <input type="checkbox" checked={Boolean(activeDrafts[product.id])} onChange={(event) => setActiveDrafts((current) => ({ ...current, [product.id]: event.target.checked }))} className="h-4 w-4 accent-violet-500" />
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={savingId === product.id} onClick={() => void saveProduct(product.id)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <Save className="h-4 w-4" />
            {savingId === product.id ? "Enregistrement..." : "Enregistrer"}
          </button>
          {product.manual_fulfillment ? <span className="inline-flex h-10 items-center rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 text-xs font-semibold text-amber-200">Traitement manuel</span> : null}
        </div>
      </article>)}
    </section> : null}
  </AdminShell>;
}

function OrdersAdminSection({ title, subtitle }: { title: string; subtitle: string }) {
  const [orders, setOrders] = useState<ManualOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);

  async function load() {
    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/orders/manual`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      const body = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("nexy_sanctum_token");
        window.location.href = "/admin/login";
        return;
      }

      if (!response.ok) throw new Error(body.message ?? "Impossible de charger les commandes manuelles.");

      setOrders(Array.isArray(body.data) ? body.data : []);
    } catch (exception) {
      setOrders([]);
      setError(exception instanceof Error ? exception.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateStatus(orderId: number, status: "delivered" | "failed") {
    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) return;

    setBusyOrderId(orderId);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/manual-status`, {
        method: "PATCH",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(body.message ?? "Mise à jour impossible.");

      await load();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Mise à jour impossible.");
    } finally {
      setBusyOrderId(null);
    }
  }

  return <AdminShell title={title} subtitle={subtitle}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-400">Les commandes CODM payées arrivent ici avec les identifiants client. Quand la recharge est faite, marque la commande en livrée ou en échec.</p>
      <button onClick={load} className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm text-slate-200">
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Actualiser
      </button>
    </div>

    {error ? <div className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

    {loading ? <div className="grid min-h-64 place-items-center text-sm text-slate-400"><RefreshCw className="mb-3 h-6 w-6 animate-spin text-violet-400" />Chargement des commandes manuelles...</div> : null}
    {!loading && !orders.length ? <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6 text-sm text-slate-400">Aucune commande manuelle en attente.</div> : null}

    {!loading ? <section className="grid gap-4 xl:grid-cols-2">
      {orders.map((order) => {
        const locked = busyOrderId === order.id;
        const terminal = order.status === "delivered" || order.status === "failed";

        return <article key={order.id} className="rounded-xl border border-white/10 bg-[#0c1424] p-4 shadow-2xl shadow-black/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">#{order.id} · {order.product_name}</p>
              <p className="mt-1 text-xs text-slate-400">{order.customer_name} · {order.customer_email || "email non renseigné"}</p>
            </div>
            <Status value={manualOrderStatusLabel(order)} />
          </div>

          <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
            <span>Montant: {new Intl.NumberFormat("fr-FR").format(order.amount)} {order.currency}</span>
            <span>Date: {formatAdminDate(order.created_at)}</span>
            <span>Téléphone: {order.customer_phone || "Non renseigné"}</span>
            <span>Référence compte: {order.nickname || order.game_uid}</span>
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Identifiants client</p>
            <div className="grid gap-2">
              {order.field_entries.map((field) => <div key={`${order.id}-${field.key}`} className="flex items-start justify-between gap-3 rounded-md bg-white/[0.03] px-3 py-2 text-sm">
                <span className="text-slate-400">{field.label}</span>
                <span className="max-w-[60%] break-words text-right text-white">{field.value}</span>
              </div>)}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={locked || terminal} onClick={() => void updateStatus(order.id, "delivered")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" />
              {locked ? "Mise à jour..." : "Marquer livré"}
            </button>
            <button disabled={locked || terminal} onClick={() => void updateStatus(order.id, "failed")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-500/90 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              <PauseCircle className="h-4 w-4" />
              {locked ? "Mise à jour..." : "Marquer échec"}
            </button>
          </div>
        </article>;
      })}
    </section> : null}
  </AdminShell>;
}

function formatAdminDate(value?: string | null) {
  if (!value) return "Non renseignée";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Non renseignée" : date.toLocaleString("fr-FR");
}

function manualOrderStatusLabel(order: ManualOrder) {
  if (order.status === "delivered") return "Livrée";
  if (order.status === "failed") return "Échec";
  if (order.fulfillment_status === "awaiting_delivery") return "Paiement confirmé";
  if (order.status === "paid") return "Payée";
  return order.status;
}
