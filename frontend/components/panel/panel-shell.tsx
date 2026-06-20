"use client";

import Link from "next/link";
import { Activity, Bell, LogOut, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePanelData } from "@/components/panel/panel-data";
import { panelBalanceLabel, panelDisplayName, panelInitial, panelNavItems } from "@/components/panel/panel-ui";

function matchesPanelItem(pathname: string, href: string) {
  if (href === "/panel") {
    return pathname === "/panel";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PanelShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { partner, isLoading, logout } = usePanelData();

  const currentItem = useMemo(
    () => panelNavItems.find((item) => matchesPanelItem(pathname, item.href)) ?? panelNavItems[0],
    [pathname]
  );

  useEffect(() => {
    if (!sidebarOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen]);

  if (isLoading || !partner) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#090d16] text-white">
        <div className="text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#5b34f4]/12 text-[#8f5bff]">
            <Activity className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8f5bff]">Loading API panel</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#090d16_0%,#0c111b_100%)] text-white">
      {sidebarOpen ? <button aria-label="Fermer le menu" className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setSidebarOpen(false)} /> : null}

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className={`fixed inset-y-0 left-0 z-50 w-[236px] border-r border-[#1a2231] bg-[#0a0f18] px-3 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-[220px] lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[#101725] px-3 py-3">
              <div className="min-w-0">
                <p className="text-[18px] font-black leading-none tracking-[-0.04em]">GameAPI</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.24em] text-slate-500">Panel</p>
              </div>
              <button className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#141b29] text-slate-400 lg:hidden" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="mt-5 space-y-1">
              {panelNavItems.map((item) => {
                const active = matchesPanelItem(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-10 items-center gap-3 rounded-[12px] px-3 text-[12px] font-medium transition ${active ? "bg-[linear-gradient(90deg,#5b34f4,#7c4dff)] text-white" : "bg-transparent text-slate-400 hover:bg-[#131b2a] hover:text-white"}`}
                  >
                    <Icon className="h-[13px] w-[13px]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-4 pt-6">
              <div className="rounded-[14px] border border-[#1a2231] bg-[#101725] p-3.5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Compte partenaire</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 font-semibold text-slate-200">
                    <span className={`h-2 w-2 rounded-full ${partner.status === "active" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {(partner.status ?? "inconnu").toUpperCase()}
                  </span>
                  <span className="text-slate-500">{partner.allowed_scope ?? "standard"}</span>
                </div>
              </div>

              <div className="rounded-[14px] border border-[#1a2231] bg-[#101725] p-3.5 text-xs text-slate-300">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Rejoignez-nous</p>
                <div className="mt-4 space-y-2">
                  <a href="/contact" className="flex items-center justify-between rounded-[12px] bg-[#141b29] px-3 py-2.5">
                    <span>Support</span>
                    <span className="text-slate-500">↗</span>
                  </a>
                  <a href="/communaute" className="flex items-center justify-between rounded-[12px] bg-[#141b29] px-3 py-2.5">
                    <span>Communauté</span>
                    <span className="text-slate-500">↗</span>
                  </a>
                </div>
              </div>

              <button onClick={logout} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-[#141b29] text-xs font-semibold text-slate-200 lg:hidden">
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-3 py-3 sm:px-4 lg:px-5">
          <header className="sticky top-0 z-30 mb-4 flex flex-col gap-3 rounded-[20px] border border-[#1a2231] bg-[#0d131e]/96 px-4 py-3 backdrop-blur sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#141b29] text-slate-300 lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-[20px] font-black tracking-[-0.04em] text-white">{currentItem.label}</h1>
                <p className="mt-1 text-[12px] text-slate-500">{currentItem.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[104px] rounded-[12px] border border-[#1f2937] bg-[#111827] px-3 py-2">
                <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Solde</p>
                <p className="mt-1 text-[15px] font-black text-emerald-400">{panelBalanceLabel(partner)}</p>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-[12px] border border-[#1f2937] bg-[#111827] text-slate-400">
                <Bell className="h-4 w-4" />
              </button>
              <button onClick={logout} className="hidden items-center gap-3 rounded-[14px] border border-[#30384a] bg-[#111827] px-3 py-2 sm:flex">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-700/70 text-xs font-black text-white">{panelInitial(partner)}</span>
                <span className="text-left">
                  <span className="block text-xs font-semibold text-white">{partner.email}</span>
                  <span className="block text-[11px] text-slate-500">{panelDisplayName(partner)}</span>
                </span>
              </button>
            </div>
          </header>

          {children}
        </section>
      </div>
    </main>
  );
}