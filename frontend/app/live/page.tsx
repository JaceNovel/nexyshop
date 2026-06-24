"use client";

import { CalendarClock, Clock3, Radio, RefreshCw, Shield, Skull, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { API_BASE_URL } from "@/lib/api";

type LiveTeam = {
  id: number;
  name: string;
  status: string;
  alive: boolean;
  players_alive: number;
  hp: number;
  kills: number;
  points: number;
  placement?: number | null;
  captain?: string | null;
  logo?: string | null;
};

type LiveRanking = {
  rank: number;
  team_id: number;
  team: string;
  points: number;
  kills: number;
  alive: boolean;
  direction: "up" | "down" | "same";
};

type LivePayload = {
  id: number | null;
  title: string;
  description?: string | null;
  status: string;
  viewer_count: number;
  youtube_video_id?: string | null;
  watch_url?: string | null;
  embed_url?: string | null;
  thumbnail_url?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  round: { current: number; total: number; next_round_seconds: number };
  game?: string | null;
  map?: string | null;
  prize_text?: string | null;
  tournament?: {
    id: number;
    title: string;
    mode: string;
    status: string;
    prize_pool: number;
  } | null;
  teams: LiveTeam[];
  ranking: LiveRanking[];
  stats: {
    alive_teams: number;
    dead_teams: number;
    total_teams: number;
    alive_players: number;
    total_kills: number;
  };
};

function statusLabel(status?: string) {
  if (status === "live") return "En direct";
  if (status === "paused") return "En pause";
  if (status === "scheduled") return "Programme";
  if (status === "ended") return "Termine";
  return status ?? "Indisponible";
}

function formatNumber(value?: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.round(value ?? 0)));
}

function formatTimer(totalSeconds?: number) {
  const safe = Math.max(0, Math.round(totalSeconds ?? 0));
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

async function fetchCurrentLive() {
  const response = await fetch(`${API_BASE_URL}/api/lives/current`, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Live indisponible");
  }

  return response.json() as Promise<{ data: LivePayload | null }>;
}

export default function LivePage() {
  const [live, setLive] = useState<LivePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLive() {
    try {
      setError(null);
      const payload = await fetchCurrentLive();
      setLive(payload.data);
    } catch {
      setError("Impossible de charger le live pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLive();
    const timer = window.setInterval(() => {
      loadLive();
    }, 8000);

    return () => window.clearInterval(timer);
  }, []);

  const teams = useMemo(() => live?.teams ?? [], [live]);
  const ranking = useMemo(() => live?.ranking ?? [], [live]);
  const aliveTeams = teams.filter((team) => team.alive);
  const eliminatedTeams = teams.filter((team) => !team.alive);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#07111f]">
      <SiteHeader />

      <section className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6 lg:py-8">
        {error ? (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Chargement du live...</div>
        ) : !live ? (
          <EmptyLive onRefresh={loadLive} />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
            <aside className="space-y-4">
              <Panel>
                <div className="flex items-center justify-between">
                  <span className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white ${live.status === "live" ? "bg-red-600" : "bg-slate-800"}`}>
                    {statusLabel(live.status)}
                  </span>
                  <Radio className={`h-5 w-5 ${live.status === "live" ? "text-red-600" : "text-slate-400"}`} />
                </div>
                <p className="mt-5 text-xs uppercase tracking-[0.18em] text-slate-500">Live officiel Astral4Gamer</p>
                <h1 className="mt-2 text-2xl font-semibold leading-tight">{live.title}</h1>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>{live.game ?? "Jeu non precise"}{live.map ? ` - ${live.map}` : ""}</p>
                  <p>{live.tournament?.mode ?? "Mode a definir"}</p>
                  {live.prize_text ? <p>Gain : {live.prize_text}</p> : null}
                </div>
              </Panel>

              <Panel>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Round en cours</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-5xl font-semibold text-red-600">{live.round.current}</span>
                  <span className="pb-2 text-2xl text-slate-400">/ {live.round.total}</span>
                </div>
                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs uppercase text-slate-500">Prochain round</p>
                  <p className="mt-1 text-3xl font-semibold text-red-600">{formatTimer(live.round.next_round_seconds)}</p>
                </div>
              </Panel>

              <Panel>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Equipes en vie</p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">{aliveTeams.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {aliveTeams.slice(0, 8).map((team, index) => (
                    <TeamMini key={team.id} rank={index + 1} team={team} />
                  ))}
                  {aliveTeams.length === 0 ? <p className="text-sm text-slate-500">Aucune equipe en vie.</p> : null}
                </div>
              </Panel>
            </aside>

            <section className="space-y-5">
              <Panel className="overflow-hidden p-0">
                <div className="relative min-h-[460px] bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,.28),transparent_35%),linear-gradient(135deg,#07111f,#111827_58%,#2b1020)] p-5 text-white sm:p-7 lg:min-h-[560px]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-600 via-violet-500 to-blue-600" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold">{statusLabel(live.status)}</span>
                    <span className="rounded-md bg-white/10 px-3 py-1.5 text-xs">{formatNumber(live.viewer_count)} spectateurs</span>
                    <span className="rounded-md bg-white/10 px-3 py-1.5 text-xs">Round {live.round.current}/{live.round.total}</span>
                  </div>

                  <div className="mt-10 max-w-2xl">
                    <p className="text-sm uppercase tracking-[0.22em] text-white/60">{live.tournament?.title ?? "Live Astral4Gamer"}</p>
                    <h2 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">{live.title}</h2>
                    {live.description ? <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">{live.description}</p> : null}
                  </div>

                  <div className="absolute bottom-5 left-5 right-5 grid gap-3 sm:grid-cols-5">
                    <Metric icon={Users} label="Spectateurs" value={formatNumber(live.viewer_count)} />
                    <Metric icon={Shield} label="Equipes en vie" value={String(live.stats.alive_teams)} />
                    <Metric icon={Skull} label="Eliminees" value={String(live.stats.dead_teams)} />
                    <Metric icon={Trophy} label="Kills total" value={String(live.stats.total_kills)} />
                    <Metric icon={Clock3} label="Round" value={`${live.round.current}/${live.round.total}`} />
                  </div>
                </div>
              </Panel>

              <Panel>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Tableau des equipes</h2>
                    <p className="mt-1 text-sm text-slate-500">Etat live synchronise depuis l'administration.</p>
                  </div>
                  <button onClick={loadLive} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50">
                    <RefreshCw className="h-4 w-4" /> Actualiser
                  </button>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-xs uppercase text-slate-400">
                      <tr className="border-b border-slate-100">
                        <th className="py-3">Equipe</th>
                        <th className="py-3">Etat</th>
                        <th className="py-3">Joueurs</th>
                        <th className="py-3">HP</th>
                        <th className="py-3">Kills</th>
                        <th className="py-3">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team) => (
                        <tr key={team.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-3">
                            <p className="font-medium text-slate-900">{team.name}</p>
                            {team.captain ? <p className="text-xs text-slate-500">Capitaine : {team.captain}</p> : null}
                          </td>
                          <td className="py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs ${team.alive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                              {team.alive ? "En vie" : "Mort"}
                            </span>
                          </td>
                          <td className="py-3">{team.players_alive}</td>
                          <td className="py-3">{team.hp}%</td>
                          <td className="py-3">{team.kills}</td>
                          <td className="py-3">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {teams.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Aucune equipe inscrite sur ce live.</p> : null}
                </div>
              </Panel>
            </section>

            <aside className="space-y-4">
              <Panel>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Classement live</h2>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-700">Auto</span>
                </div>
                <div className="mt-5 space-y-3">
                  {ranking.slice(0, 12).map((row) => (
                    <div key={row.team_id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm font-semibold text-slate-700">{row.rank}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.team}</p>
                        <p className="text-xs text-slate-500">{row.kills} kills</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{row.points} pts</span>
                    </div>
                  ))}
                  {ranking.length === 0 ? <p className="text-sm text-slate-500">Le classement apparaitra ici apres ajout des equipes.</p> : null}
                </div>
              </Panel>

              <Panel>
                <h2 className="text-lg font-semibold">Resume</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <SmallStat label="Equipes" value={live.stats.total_teams} />
                  <SmallStat label="En vie" value={live.stats.alive_teams} />
                  <SmallStat label="Mortes" value={eliminatedTeams.length} />
                  <SmallStat label="Joueurs" value={live.stats.alive_players} />
                </div>
              </Panel>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function EmptyLive({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-50 text-slate-400">
        <CalendarClock className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold">Aucun live actif</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Quand un live sera cree ou lance depuis l'administration, les equipes inscrites, le round, les kills et le classement apparaitront ici automatiquement.
      </p>
      <button onClick={onRefresh} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">
        <RefreshCw className="h-4 w-4" /> Actualiser
      </button>
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3 backdrop-blur">
      <Icon className="h-5 w-5 text-red-300" />
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="text-xs text-white/55">{label}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function TeamMini({ rank, team }: { rank: number; team: LiveTeam }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-600 text-sm font-semibold text-white">{rank}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{team.name}</p>
        <p className="text-xs text-slate-500">{team.kills} kills - {team.points} pts</p>
      </div>
      <span className="text-sm text-emerald-700">{team.players_alive}</span>
    </div>
  );
}
