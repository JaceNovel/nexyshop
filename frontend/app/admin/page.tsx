"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Download,
  Gamepad2,
  Home,
  KeyRound,
  LayoutDashboard,
  Mail,
  Package,
  Percent,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Trophy,
  UserRound,
  Users,
  Wallet
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

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

const navGroups = [
  {
    title: "",
    items: [{ label: "Tableau de bord", href: "/admin", icon: LayoutDashboard, active: true }]
  },
  {
    title: "Utilisateurs",
    items: [
      { label: "Utilisateurs", href: "/admin/users", icon: Users },
      { label: "Joueurs", href: "/admin/players", icon: Gamepad2 },
      { label: "Roles & permissions", href: "/admin/roles", icon: ShieldCheck }
    ]
  },
  {
    title: "Tournois",
    items: [
      { label: "Tournois", href: "/admin/tournaments", icon: Trophy },
      { label: "Participations", href: "/admin/registrations", icon: Users },
      { label: "Calendrier", href: "/admin/calendar", icon: CalendarDays }
    ]
  },
  {
    title: "Boutique",
    items: [
      { label: "Produits", href: "/admin/products", icon: Package },
      { label: "Commandes", href: "/admin/orders", icon: ShoppingCart },
      { label: "Transactions", href: "/admin/payments", icon: Wallet },
      { label: "Codes promo", href: "/admin/redeem-codes", icon: Percent }
    ]
  },
  {
    title: "Contenu",
    items: [
      { label: "Actualites", href: "/admin/blog", icon: BookOpen },
      { label: "Video & lives", href: "/admin/video", icon: Activity },
      { label: "Bannieres", href: "/admin/banners", icon: BarChart3 }
    ]
  },
  {
    title: "Parametres",
    items: [
      { label: "Parametres", href: "/admin/settings", icon: Settings },
      { label: "API & integrations", href: "/admin/blog", icon: KeyRound },
      { label: "Journaux", href: "/admin/logs", icon: Activity }
    ]
  }
];

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
      .then((response) => {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("nexy_sanctum_token");
          window.location.href = "/admin/login";
          return null;
        }
        if (!response.ok) throw new Error("Impossible de charger le dashboard admin.");
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
    <main className="min-h-screen bg-[#070b16] text-white">
      <div className="min-h-screen">
        <aside className="border-r border-white/8 bg-[#0a1020] px-4 py-5 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-[248px] lg:overflow-y-auto lg:overscroll-contain">
          <a href="/" className="flex h-11 items-center gap-3 rounded-xl bg-white/[0.03] px-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/20 text-violet-300"><Home className="h-4 w-4" /></span>
            <span className="text-sm font-semibold tracking-wide">ASTRAL<span className="text-violet-400">4GAMER</span></span>
          </a>

          <nav className="mt-6 space-y-6">
            {navGroups.map((group) => (
              <div key={group.title || "root"}>
                {group.title ? <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">{group.title}</p> : null}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <AdminNavLink key={item.label} {...item} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-h-screen min-w-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_34%),linear-gradient(180deg,#08101f,#060914_62%)] lg:ml-[248px]">
          <header className="flex flex-col gap-4 border-b border-white/8 px-5 py-5 sm:px-8 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-400">Bienvenue, Admin Astral</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex h-11 w-full items-center gap-3 rounded-lg border border-white/8 bg-white/[0.04] px-3 text-slate-400 sm:w-72">
                <Search className="h-4 w-4" />
                <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Rechercher..." />
              </label>
              <IconButton badge="5"><Bell className="h-4 w-4" /></IconButton>
              <IconButton><Mail className="h-4 w-4" /></IconButton>
              <div className="flex h-11 items-center gap-3 rounded-lg border border-white/8 bg-white/[0.04] px-3">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-violet-400/60 bg-violet-500/20 text-xs font-semibold">A</span>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold">Admin Astral</p>
                  <p className="text-[10px] text-slate-500">Super Admin</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </header>

          <div className="px-5 py-6 sm:px-8">
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
                <div className="space-y-3">
                  {(payload.recent_activities.length ? payload.recent_activities : emptyActivities).map((item, index) => (
                    <ActivityRow key={`${item.title}-${index}`} item={item} />
                  ))}
                </div>
                <a href="/admin/logs" className="mt-5 inline-flex text-xs font-medium text-violet-300">Voir toutes les activites</a>
              </Panel>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-3">
              <Panel title="Top jeux">
                <DonutList data={payload.top_games} colors={["#7c3aed", "#3b82f6", "#2dd4bf", "#f59e0b", "#ef4444"]} />
              </Panel>

              <Panel title="Top tournois">
                <div className="space-y-3">
                  {(payload.top_tournaments.length ? payload.top_tournaments : emptyTournaments).map((tournament) => (
                    <div key={tournament.title} className="grid grid-cols-[1fr_72px_82px] items-center gap-3 text-xs">
                      <span className="truncate text-slate-200">{tournament.title}</span>
                      <span className="text-right text-slate-400">{tournament.participants}</span>
                      <span className={`rounded-full px-2 py-1 text-center text-[10px] ${statusClass(tournament.status)}`}>{tournament.status}</span>
                    </div>
                  ))}
                </div>
                <a href="/tournois" className="mt-5 inline-flex text-xs font-medium text-violet-300">Voir tous les tournois</a>
              </Panel>

              <Panel title="Repartition des paiements">
                <DonutList data={payload.payment_methods} colors={["#7c3aed", "#3b82f6", "#2dd4bf", "#f59e0b", "#ef4444"]} />
              </Panel>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Panel title="Top produits boutique">
                <div className="space-y-3">
                  {(payload.top_products.length ? payload.top_products : emptyProducts).slice(0, 6).map((product) => (
                    <div key={`${product.product_id}-${product.name}`} className="grid grid-cols-[1fr_56px_84px] items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                      <span className="truncate text-slate-200">{product.name}</span>
                      <span className="text-right text-slate-400">{product.sales}</span>
                      <span className="text-right text-slate-300">{formatMoney(product.revenue)}</span>
                    </div>
                  ))}
                </div>
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
        </section>
      </div>
    </main>
  );
}

function AdminNavLink({ label, href, icon: Icon, active }: { label: string; href: string; icon: ComponentType<{ className?: string }>; active?: boolean }) {
  return (
    <a href={href} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition ${active ? "bg-violet-600/35 text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </a>
  );
}

function IconButton({ children, badge }: { children: ReactNode; badge?: string }) {
  return (
    <button className="relative grid h-11 w-11 place-items-center rounded-lg border border-white/8 bg-white/[0.04] text-slate-300">
      {children}
      {badge ? <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-fuchsia-500 px-1 text-[10px] font-semibold text-white">{badge}</span> : null}
    </button>
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
  const series = points.length ? points : demoRevenue;
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
  const items = data.length ? data : [{ name: "Aucune donnee", value: 1 }];
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
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value) + " XOF";
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

const demoRevenue = Array.from({ length: 31 }).map((_, index) => ({
  date: `demo-${index}`,
  label: `${String(index + 1).padStart(2, "0")} Juin`,
  value: 5000 + Math.sin(index / 2) * 3500 + index * 420
}));

const emptyActivities: ActivityItem[] = [
  { type: "tournament", title: "Aucune activite recente", body: "Les actions admin apparaitront ici.", created_at: new Date().toISOString() }
];

const emptyTournaments: TopTournament[] = [
  { title: "Aucun tournoi", participants: 0, status: "a venir" }
];

const emptyProducts: TopProduct[] = [
  { product_id: 0, name: "Aucun produit vendu", sales: 0, revenue: 0 }
];
