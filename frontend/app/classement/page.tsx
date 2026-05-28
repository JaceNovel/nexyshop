"use client";

import { Award, Flame, Loader2, Search, Shield, Trophy, TrendingDown, TrendingUp, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { getLeaderboards, type Leaderboards } from "@/lib/api";

const fallback: Leaderboards = {
  top_players: [
    { id: 1, name: "TM-MAFIA", points: 52, kills: 18 },
    { id: 2, name: "TEAM SHADOW", points: 41, kills: 15 },
    { id: 3, name: "PRIME ELITE", points: 33, kills: 12 }
  ],
  top_killers: [],
  top_guilds: []
};

export default function ClassementPage() {
  const [leaderboards, setLeaderboards] = useState<Leaderboards>(fallback);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboards()
      .then(setLeaderboards)
      .catch(() => setLeaderboards(fallback))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = leaderboards.top_players.length ? leaderboards.top_players : fallback.top_players;
    if (!normalized) return source;
    return source.filter((row) => row.name.toLowerCase().includes(normalized));
  }, [leaderboards, query]);

  const podium = rows.slice(0, 3);
  const totalKills = rows.reduce((sum, row) => sum + Number(row.kills), 0);

  return (
    <main className="min-h-screen bg-[#fbfbfd] text-[#080b15]">
      <SiteHeader />
      <section className="mx-auto w-full max-w-[1480px] px-6 py-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-5">
            <div className="rounded-lg border border-[#edf0f4] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,.055)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase text-[#6d28d9]">Classement API</p>
                  <h1 className="mt-1 text-3xl font-black">Classement complet</h1>
                  <p className="mt-1 text-sm text-[#4b5563]">Points et kills issus des résultats de tournois enregistrés.</p>
                </div>
                <a href="/live" className="rounded bg-[#111827] px-4 py-3 text-xs font-black text-white">Retour au live</a>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {podium.map((row, index) => (
                  <article key={row.id} className={`rounded-lg border p-4 ${index === 0 ? "border-[#f59e0b] bg-[#fffbeb]" : "border-[#edf0f4] bg-[#f8fafc]"}`}>
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#6d28d9] text-sm font-black text-white">{index + 1}</span>
                      <Trophy className={index === 0 ? "h-6 w-6 text-[#f59e0b]" : "h-6 w-6 text-[#6d28d9]"} />
                    </div>
                    <h2 className="mt-4 text-lg font-black">{row.name}</h2>
                    <p className="text-xs text-[#4b5563]">{row.kills} kills</p>
                    <div className="mt-4 flex items-end justify-between">
                      <b className="text-[28px] leading-none">{row.points}</b>
                      <span className="text-xs font-black text-[#6d28d9]">PTS</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#edf0f4] bg-white shadow-[0_2px_12px_rgba(16,24,40,.055)]">
              <div className="flex flex-wrap items-center gap-3 border-b border-[#edf0f4] p-4">
                <label className="flex h-10 min-w-[260px] flex-1 items-center rounded bg-[#f8fafc] px-3 text-[#6b7280]">
                  <Search className="mr-2 h-4 w-4" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Rechercher une équipe" />
                </label>
              </div>

              {loading ? (
                <div className="grid h-72 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#6d28d9]" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[760px]">
                    <div className="grid grid-cols-[70px_minmax(240px,1fr)_100px_100px_60px] items-center border-b border-[#edf0f4] px-4 py-3 text-[11px] font-black uppercase text-[#6b7280]">
                      <span>Rang</span><span>Équipe</span><span>Points</span><span>Kills</span><span />
                    </div>
                    <div className="divide-y divide-[#edf0f4]">
                      {rows.map((row, index) => (
                        <div key={row.id} className="grid grid-cols-[70px_minmax(240px,1fr)_100px_100px_60px] items-center px-4 py-3 text-sm">
                          <b className={index < 3 ? "text-[#6d28d9]" : ""}>#{index + 1}</b>
                          <span><b>{row.name}</b><br /><small className="text-[#6b7280]">Guilde #{row.guild_id ?? "N/A"}</small></span>
                          <b>{row.points} PTS</b>
                          <span>{row.kills}</span>
                          <Trend index={index} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <InfoCard title="Équipes classées" value={rows.length.toString()} icon={<Users className="h-5 w-5" />} />
            <InfoCard title="Kills validés" value={totalKills.toString()} icon={<Flame className="h-5 w-5" />} />
            <section className="rounded-lg border border-[#edf0f4] bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,.055)]">
              <h2 className="flex items-center gap-2 text-sm font-black"><Award className="h-4 w-4 text-[#6d28d9]" /> Barème</h2>
              <div className="mt-4 space-y-2 text-sm">
                {["Top 1 : 12 pts", "Top 2 : 9 pts", "Top 3 : 8 pts", "Chaque kill : +1 pt"].map((rule) => (
                  <p key={rule} className="rounded bg-[#f8fafc] px-3 py-2 font-semibold text-[#374151]">{rule}</p>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Trend({ index }: { index: number }) {
  if (index < 2) return <span className="grid h-8 w-8 place-items-center rounded bg-emerald-50 text-emerald-600"><TrendingUp className="h-4 w-4" /></span>;
  if (index > 4) return <span className="grid h-8 w-8 place-items-center rounded bg-red-50 text-red-500"><TrendingDown className="h-4 w-4" /></span>;
  return <span className="grid h-8 w-8 place-items-center rounded bg-[#f8fafc] text-[#6b7280]"><Shield className="h-4 w-4" /></span>;
}

function InfoCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <section className="rounded-lg border border-[#edf0f4] bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,.055)]">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f5f3ff] text-[#6d28d9]">{icon}</span>
        <b className="text-[26px]">{value}</b>
      </div>
      <p className="mt-3 text-xs font-black uppercase text-[#6b7280]">{title}</p>
    </section>
  );
}
