"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Activity, BarChart3, Bell, BookOpen, CalendarDays, ChevronDown, Gamepad2,
  Home, KeyRound, LayoutDashboard, LogOut, Mail, Menu, Package, Percent,
  Settings, ShieldCheck, ShoppingCart, Trophy, Users, Wallet, X
} from "lucide-react";

const groups = [
  { title: "", items: [["Tableau de bord", "/admin", LayoutDashboard], ["Demandes partenaires", "/admin/resellers", KeyRound]] },
  { title: "Utilisateurs", items: [["Utilisateurs", "/admin/users", Users], ["Joueurs", "/admin/players", Gamepad2], ["Roles & permissions", "/admin/roles", ShieldCheck]] },
  { title: "Tournois", items: [["Tournois", "/admin/tournaments", Trophy], ["Participations", "/admin/participations", Users], ["Matchs", "/admin/matches", Gamepad2], ["Classements", "/admin/rankings", BarChart3], ["Calendrier", "/admin/calendar", CalendarDays]] },
  { title: "Boutique", items: [["Produits", "/admin/products", Package], ["Commandes", "/admin/orders", ShoppingCart], ["Transactions", "/admin/transactions", Wallet], ["Revendeurs API", "/admin/resellers", KeyRound], ["Codes promo", "/admin/redeem-codes", Percent]] },
  { title: "Contenu", items: [["Actualites", "/admin/blog", BookOpen], ["Pages", "/admin/pages", BookOpen], ["Video & lives", "/admin/video", Activity], ["Bannieres", "/admin/banners", BarChart3]] },
  { title: "Parametres", items: [["Parametres", "/admin/settings", Settings], ["API & integrations", "/admin/integrations", KeyRound], ["Journaux", "/admin/logs", Activity]] }
] as const;

export function AdminShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!localStorage.getItem("nexy_sanctum_token")) window.location.href = "/admin/login";
  }, []);

  function logout() {
    localStorage.removeItem("nexy_sanctum_token");
    localStorage.removeItem("astral_admin_user");
    window.location.href = "/admin/login";
  }

  return (
    <main className="min-h-screen bg-[#060914] text-white">
      {open ? <button aria-label="Fermer le menu" className="fixed inset-0 z-40 bg-black/65 lg:hidden" onClick={() => setOpen(false)} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[248px] overflow-y-auto overscroll-contain border-r border-white/10 bg-[#0a1020] px-4 py-5 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <a href="/" className="flex h-11 flex-1 items-center gap-3 rounded-lg bg-white/[0.04] px-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/20 text-violet-300"><Home className="h-4 w-4" /></span>
            <span className="text-sm font-semibold">ASTRAL<span className="text-violet-400">4GAMER</span></span>
          </a>
          <button className="ml-2 grid h-9 w-9 place-items-center lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="mt-6 space-y-6">
          {groups.map((group) => <div key={group.title || "dashboard"}>
            {group.title ? <p className="mb-2 px-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">{group.title}</p> : null}
            <div className="space-y-1">{group.items.map(([label, href, Icon]) => {
              const active = pathname === href;
              return <a key={href} href={href} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] transition ${active ? "bg-violet-600/45 text-white" : "text-slate-300 hover:bg-white/[0.05] hover:text-white"}`}><Icon className="h-4 w-4" />{label}</a>;
            })}</div>
          </div>)}
        </nav>
      </aside>

      <section className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,.17),transparent_32%),linear-gradient(180deg,#08101f,#060914_62%)] lg:ml-[248px]">
        <header className="sticky top-0 z-30 flex min-h-[84px] items-center justify-between gap-4 border-b border-white/10 bg-[#08101f]/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <div className="min-w-0"><h1 className="truncate text-xl font-semibold sm:text-2xl">{title}</h1><p className="mt-1 truncate text-xs text-slate-400 sm:text-sm">{subtitle}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button title="Notifications" className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04]"><Bell className="h-4 w-4" /></button>
            <button className="hidden h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] sm:grid"><Mail className="h-4 w-4" /></button>
            <button onClick={logout} className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-left">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-violet-400/60 bg-violet-500/20 text-xs">A</span>
              <span className="hidden sm:block"><b className="block text-xs">Admin Astral</b><small className="text-[10px] text-slate-500">Super Admin</small></span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>
            <button title="Deconnexion" onClick={logout} className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-slate-400 hover:text-white"><LogOut className="h-4 w-4" /></button>
          </div>
        </header>
        <div className="p-4 sm:p-7">{children}</div>
      </section>
    </main>
  );
}
