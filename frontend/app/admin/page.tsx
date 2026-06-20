"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  Activity,
  BookOpen,
  CalendarDays,
  Download,
  Gamepad2,
  KeyRound,
  Package,
  Percent,
  ShoppingCart,
  Trophy,
  UserRound,
  Users,
  Wallet
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { AdminShell } from "@/components/admin/admin-shell";

type SummaryMetric = { value: number; change: number | null };
type RevenuePoint = { date: string; label: string; value: number };
type ActivityItem = { type: string; title: string; body: string; created_at: string };
type NamedValue = { name: string; value: number };
type TopTournament = { title: string; participants: number; status: string };
type TopProduct = { product_id: number; name: string; sales: number; revenue: number };

type DashboardPayload = {
  summary: Record<string, SummaryMetric>;
  revenue_series: RevenuePoint[];
  recent_activities: ActivityItem[];
  top_games: NamedValue[];
  top_tournaments: TopTournament[];
  payment_methods: NamedValue[];
  top_products: TopProduct[];
};

const fallbackPayload: DashboardPayload = {
  summary: {
    users: { value: 0, change: 0 },
    active_users: { value: 0, change: 0 },
    tournaments: { value: 0, change: 0 },
    orders: { value: 0, change: 0 },
    revenue: { value: 0, change: 0 }
  },
  revenue_series: [],
  recent_activities: [],
  top_games: [],
  top_tournaments: [],
  payment_methods: [],
  top_products: []
};

const metricCards = [
  { id: "users", label: "Utilisateurs totaux", icon: Users, color: "from-blue-500 to-cyan-400" },
  { id: "active_users", label: "Joueurs actifs", icon: Gamepad2, color: "from-violet-500 to-fuchsia-400" },
  { id: "tournaments", label: "Tournois", icon: Trophy, color: "from-emerald-500 to-lime-400" },
  { id: "orders", label: "Commandes", icon: ShoppingCart, color: "from-amber-500 to-orange-400" },
  { id: "revenue", label: "Revenus", icon: Wallet, color: "from-yellow-500 to-amber-300", money: true }
];

export default function AdminDashboardPage() {
  const [payload, setPayload] = useState<DashboardPayload>(fallbackPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    fetch(`${API_BASE_URL}/api/admin/analytics`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store"
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("nexy_sanctum_token");
          window.location.href = "/admin/login";
          return null;
        }
        if (!response.ok) {
          const failure = await response.json().catch(() => ({}));
          throw new Error(failure?.message || failure?.error || `Impossible de charger le dashboard admin (HTTP ${response.status}).`);
        }
        return response.json();
      })
      .then((data: DashboardPayload | null) => {
        if (!data) return;
        setPayload({ ...fallbackPayload, ...data });
        setError("");
      })
      .catch((exception: Error) => setError(exception.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="Dashboard" subtitle="Bienvenue, Admin Astral">
          <div>
            {error ? (
              <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{error}</div>
            ) : null}

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
                <CalendarDays className="h-4 w-4 text-violet-300" />
                30 derniers jours
              </div>
              <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white shadow-lg shadow-violet-950/40">
                <Download className="h-4 w-4" />
                Exporter
              </button>
            </div>

            <section className="mb-4 rounded-xl border border-violet-400/25 bg-violet-500/10 p-4 shadow-xl shadow-violet-950/20">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-violet-500/20 text-violet-200">
                    <KeyRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Demandes partenaires & revendeurs API</h2>
                    <p className="mt-1 text-xs text-slate-300">Approuve les dossiers Discord, génère l'email, le mot de passe et la clé API du partenaire.</p>
                  </div>
                </div>
                <a href="/admin/resellers" className="inline-flex h-10 items-center rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white shadow-lg shadow-violet-950/40">
                  Voir / approuver
                </a>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {metricCards.map((card) => (
                <MetricCard key={card.id} {...card} metric={payload.summary[card.id]} loading={loading} />
              ))}
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
              <Panel className="min-h-[330px]" title="Apercu des revenus" action="Mensuel">
                <RevenueChart points={payload.revenue_series} />
              </Panel>

              <Panel title="Activites recentes">
                {payload.recent_activities.length ? <div className="space-y-3">
                  {payload.recent_activities.map((item, index) => (
                    <ActivityRow key={`${item.title}-${index}`} item={item} />
                  ))}
                </div> : <EmptyPanel text="Aucune activite enregistree." />}
                <a href="/admin/logs" className="mt-5 inline-flex text-xs font-medium text-violet-300">Voir toutes les activites</a>
              </Panel>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-3">
              <Panel title="Top jeux">
                <DonutList data={payload.top_games} colors={["#7c3aed", "#3b82f6", "#2dd4bf", "#f59e0b", "#ef4444"]} />
              </Panel>

              <Panel title="Top tournois">
                {payload.top_tournaments.length ? <div className="space-y-3">
                  {payload.top_tournaments.map((tournament) => (
                    <div key={tournament.title} className="grid grid-cols-[1fr_72px_82px] items-center gap-3 text-xs">
                      <span className="truncate text-slate-200">{tournament.title}</span>
                      <span className="text-right text-slate-400">{tournament.participants}</span>
                      <span className={`rounded-full px-2 py-1 text-center text-[10px] ${statusClass(tournament.status)}`}>{tournament.status}</span>
                    </div>
                  ))}
                </div> : <EmptyPanel text="Aucun tournoi enregistre." />}
                <a href="/tournois" className="mt-5 inline-flex text-xs font-medium text-violet-300">Voir tous les tournois</a>
              </Panel>

              <Panel title="Repartition des paiements">
                <DonutList data={payload.payment_methods} colors={["#7c3aed", "#3b82f6", "#2dd4bf", "#f59e0b", "#ef4444"]} />
              </Panel>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Panel title="Top produits boutique">
                {payload.top_products.length ? <div className="space-y-3">
                  {payload.top_products.slice(0, 6).map((product) => (
                    <div key={`${product.product_id}-${product.name}`} className="grid grid-cols-[1fr_56px_84px] items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                      <span className="truncate text-slate-200">{product.name}</span>
                      <span className="text-right text-slate-400">{product.sales}</span>
                      <span className="text-right text-slate-300">{formatMoney(product.revenue)}</span>
                    </div>
                  ))}
                </div> : <EmptyPanel text="Aucune vente produit enregistree." />}
              </Panel>

              <Panel title="Actions rapides">
                <div className="grid gap-3 sm:grid-cols-2">
                  <QuickAction href="/admin/blog" icon={BookOpen} label="Publier article" />
                  <QuickAction href="/admin/video" icon={Activity} label="Live YouTube" />
                  <QuickAction href="/admin/redeem-codes" icon={Percent} label="Codes promo" />
                  <QuickAction href="/admin/products" icon={Package} label="Produits" />
                </div>
              </Panel>
            </section>
          </div>
    </AdminShell>
  );
}

function MetricCard({ label, icon: Icon, color, metric, money, loading }: { label: string; icon: ComponentType<{ className?: string }>; color: string; metric?: SummaryMetric; money?: boolean; loading: boolean }) {
  const value = metric?.value ?? 0;
  const change = metric?.change ?? 0;

  return (
    <article className="rounded-xl border border-white/8 bg-white/[0.055] p-4 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${color} bg-opacity-20`}>
          <Icon className="h-5 w-5 text-white" />
        </span>
        <span className="text-slate-500">...</span>
      </div>
      <p className="mt-4 text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{loading ? "..." : money ? formatMoney(value) : formatNumber(value)}</p>
      <p className={`mt-2 text-xs ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        {change >= 0 ? "+" : ""}{change}% <span className="text-slate-500">vs mois dernier</span>
      </p>
    </article>
  );
}

function Panel({ title, action, children, className = "" }: { title: string; action?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-white/8 bg-white/[0.055] p-5 shadow-xl shadow-black/10 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {action ? <button className="rounded-lg border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">{action}</button> : null}
      </div>
      {children}
    </section>
  );
}

function RevenueChart({ points }: { points: RevenuePoint[] }) {
  if (!points.length) {
    return <div className="grid h-64 place-items-center rounded-lg bg-[#0b1327] text-sm text-slate-500">Aucun paiement enregistre sur les 30 derniers jours.</div>;
  }

  const series = points;
  const max = Math.max(...series.map((point) => point.value), 1);
  const path = series.map((point, index) => {
    const x = (index / Math.max(series.length - 1, 1)) * 100;
    const y = 100 - (point.value / max) * 86 - 7;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
  const area = `${path} L 100 100 L 0 100 Z`;

  return (
    <div>
      <div className="relative h-64 overflow-hidden rounded-lg bg-[#0b1327]">
        <div className="absolute inset-0 grid grid-rows-5">
          {Array.from({ length: 5 }).map((_, index) => <span key={index} className="border-t border-white/[0.06]" />)}
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#revenueArea)" />
          <path d={path} fill="none" stroke="#8b5cf6" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-slate-500">
        {series.filter((_, index) => index % 6 === 0 || index === series.length - 1).map((point) => <span key={point.date}>{point.label}</span>)}
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = item.type === "tournament" ? Trophy : item.type === "user" ? UserRound : ShoppingCart;
  const color = item.type === "tournament" ? "bg-violet-500/15 text-violet-300" : item.type === "user" ? "bg-cyan-500/15 text-cyan-300" : "bg-fuchsia-500/15 text-fuchsia-300";

  return (
    <div className="grid grid-cols-[40px_1fr_auto] items-center gap-3">
      <span className={`grid h-10 w-10 place-items-center rounded-lg ${color}`}><Icon className="h-4 w-4" /></span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-200">{item.title}</p>
        <p className="truncate text-xs text-slate-500">{item.body}</p>
      </div>
      <time className="text-[10px] text-slate-500">{timeAgo(item.created_at)}</time>
    </div>
  );
}

function DonutList({ data, colors }: { data: NamedValue[]; colors: string[] }) {
  if (!data.length) return <EmptyPanel text="Aucune donnee enregistree." />;

  const items = data;
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  let offset = 25;

  return (
    <div className="grid items-center gap-5 sm:grid-cols-[140px_1fr]">
      <svg viewBox="0 0 42 42" className="h-36 w-36 -rotate-90">
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#111827" strokeWidth="8" />
        {items.map((item, index) => {
          const percent = (item.value / total) * 100;
          const dash = `${percent} ${100 - percent}`;
          const circle = <circle key={item.name} cx="21" cy="21" r="15.915" fill="transparent" stroke={colors[index % colors.length]} strokeWidth="8" strokeDasharray={dash} strokeDashoffset={offset} />;
          offset -= percent;
          return circle;
        })}
      </svg>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-xs">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="truncate text-slate-300">{item.name}</span>
            <span className="text-slate-400">{Math.round((item.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="grid min-h-28 place-items-center rounded-lg border border-dashed border-white/10 px-4 text-center text-xs text-slate-500">{text}</div>;
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <a href={href} className="flex h-20 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-4 text-sm font-medium text-slate-200 hover:bg-white/[0.075]">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><Icon className="h-4 w-4" /></span>
      {label}
    </a>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function timeAgo(value: string) {
  if (!value) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "a l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

function statusClass(status: string) {
  if (status.includes("cours") || status.includes("ouvert")) return "bg-emerald-500/15 text-emerald-300";
  if (status.includes("venir")) return "bg-blue-500/15 text-blue-300";
  return "bg-slate-500/15 text-slate-300";
}
