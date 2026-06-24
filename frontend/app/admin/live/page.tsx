"use client";

import { CheckCircle2, Clock3, Radio, RefreshCw, Save, Shield, Skull, Trophy, Users, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { API_BASE_URL } from "@/lib/api";
import type { Tournament } from "@/lib/api";

type LiveTeam = {
  id: number;
  name: string;
  status: string;
  alive: boolean;
  players_alive: number;
  hp: number;
  kills: number;
  points: number;
  captain?: string | null;
};

type LiveSession = {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  viewer_count: number;
  watch_url?: string | null;
  youtube_video_id?: string | null;
  scheduled_at?: string | null;
  round: { current: number; total: number; next_round_seconds: number };
  game?: string | null;
  map?: string | null;
  prize_text?: string | null;
  tournament?: { id: number; title: string; mode: string; status: string; prize_pool: number } | null;
  teams: LiveTeam[];
  stats: { alive_teams: number; dead_teams: number; total_teams: number; alive_players: number; total_kills: number };
};

type LiveForm = {
  title: string;
  description: string;
  tournament_id: string;
  status: string;
  round_current: string;
  round_total: string;
  next_round_seconds: string;
  game: string;
  map: string;
  prize_text: string;
  youtube_video_id: string;
  watch_url: string;
};

const defaultForm: LiveForm = {
  title: "Live Astral4Gamer",
  description: "",
  tournament_id: "",
  status: "scheduled",
  round_current: "1",
  round_total: "7",
  next_round_seconds: "0",
  game: "Free Fire",
  map: "Bermuda",
  prize_text: "",
  youtube_video_id: "",
  watch_url: ""
};

function adminToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("nexy_sanctum_token") ?? "";
}

async function apiFetch<T>(path: string, options?: RequestInit) {
  const headers = new Headers(options?.headers);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${adminToken()}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store"
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? "Action admin impossible.");
  }
  return body as T;
}

export default function AdminLivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<LiveForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => sessions.find((session) => session.id === selectedId) ?? sessions[0] ?? null, [sessions, selectedId]);

  async function load() {
    try {
      setError(null);
      const [livePayload, tournamentPayload] = await Promise.all([
        apiFetch<{ data: LiveSession[] }>("/api/admin/live-sessions"),
        fetch(`${API_BASE_URL}/api/tournaments`, { headers: { Accept: "application/json" }, cache: "no-store" }).then((res) => res.json() as Promise<{ data: Tournament[] }>)
      ]);
      setSessions(livePayload.data);
      setTournaments(tournamentPayload.data ?? []);
      if (!selectedId && livePayload.data[0]) setSelectedId(livePayload.data[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateForm(key: keyof LiveForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createSession(createYoutube = false) {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      let youtubeVideoId = form.youtube_video_id.trim();
      let watchUrl = form.watch_url.trim();
      let existingStreamId: number | null = null;

      if (createYoutube) {
        const youtube = await apiFetch<{ data?: { id?: number; youtube_video_id?: string; watch_url?: string } }>("/api/admin/youtube/lives", {
          method: "POST",
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            scheduled_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            privacy_status: "public",
            tournament_id: form.tournament_id ? Number(form.tournament_id) : null
          })
        });
        existingStreamId = youtube.data?.id ?? null;
        youtubeVideoId = youtube.data?.youtube_video_id ?? youtubeVideoId;
        watchUrl = youtube.data?.watch_url ?? watchUrl;
      }

      const body = JSON.stringify({
        ...form,
        tournament_id: form.tournament_id ? Number(form.tournament_id) : null,
        round_current: Number(form.round_current),
        round_total: Number(form.round_total),
        next_round_seconds: Number(form.next_round_seconds),
        youtube_video_id: youtubeVideoId || null,
        watch_url: watchUrl || null
      });
      const payload = await apiFetch<{ data: LiveSession }>(existingStreamId ? `/api/admin/live-sessions/${existingStreamId}` : "/api/admin/live-sessions", {
        method: existingStreamId ? "PATCH" : "POST",
        body
      });

      setSessions((current) => {
        const exists = current.some((session) => session.id === payload.data.id);
        return exists ? current.map((session) => (session.id === payload.data.id ? payload.data : session)) : [payload.data, ...current];
      });
      setSelectedId(payload.data.id);
      setMessage(createYoutube ? "Live YouTube et session Astral crees." : "Session live creee.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function updateSession(updates: Record<string, string | number | null>) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await apiFetch<{ data: LiveSession }>(`/api/admin/live-sessions/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...updates
        })
      });
      setSessions((current) => current.map((session) => (session.id === payload.data.id ? payload.data : session)));
      setMessage("Live mis a jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise a jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function syncTeams() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await apiFetch<{ data: LiveSession }>(`/api/admin/live-sessions/${selected.id}/sync-teams`, { method: "POST" });
      setSessions((current) => current.map((session) => (session.id === payload.data.id ? payload.data : session)));
      setMessage("Equipes synchronisees depuis les inscriptions.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Synchronisation impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function updateTeam(team: LiveTeam, updates: Partial<LiveTeam>) {
    if (!selected) return;
    try {
      const payload = await apiFetch<{ data: LiveSession }>(`/api/admin/live-sessions/${selected.id}/teams/${team.id}`, {
        method: "PATCH",
        body: JSON.stringify(updates)
      });
      setSessions((current) => current.map((session) => (session.id === payload.data.id ? payload.data : session)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Equipe impossible a modifier.");
    }
  }

  return (
    <AdminShell title="Gestion live" subtitle="Pilote les lives, les rounds, les equipes et le classement en temps reel.">
      <div className="space-y-5">
        {message ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
        {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

        <section className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Creer une session</h2>
              <Radio className="h-5 w-5 text-violet-300" />
            </div>
            <div className="mt-5 grid gap-3">
              <Input label="Titre" value={form.title} onChange={(value) => updateForm("title", value)} />
              <label className="grid gap-2 text-xs text-slate-400">
                Tournoi lie
                <select value={form.tournament_id} onChange={(event) => updateForm("tournament_id", event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#080d19] px-3 text-sm text-white outline-none">
                  <option value="">Aucun tournoi</option>
                  {tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.title}</option>)}
                </select>
              </label>
              <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="Description visible sur la page live" className="min-h-24 rounded-xl border border-white/10 bg-[#080d19] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Round" value={form.round_current} onChange={(value) => updateForm("round_current", value)} />
                <Input label="Total" value={form.round_total} onChange={(value) => updateForm("round_total", value)} />
                <Input label="Prochain round sec." value={form.next_round_seconds} onChange={(value) => updateForm("next_round_seconds", value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Jeu" value={form.game} onChange={(value) => updateForm("game", value)} />
                <Input label="Carte" value={form.map} onChange={(value) => updateForm("map", value)} />
              </div>
              <Input label="Gain affiche" value={form.prize_text} onChange={(value) => updateForm("prize_text", value)} placeholder="Ex: 250 000 FCFA" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="YouTube video ID" value={form.youtube_video_id} onChange={(value) => updateForm("youtube_video_id", value)} />
                <Input label="Lien YouTube" value={form.watch_url} onChange={(value) => updateForm("watch_url", value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button disabled={saving} onClick={() => createSession(false)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60">
                  <Save className="h-4 w-4" /> Creer session
                </button>
                <button disabled={saving} onClick={() => createSession(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60">
                  <Youtube className="h-4 w-4" /> Creer YouTube + live
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Session active</h2>
                <p className="mt-1 text-sm text-slate-400">{selected ? selected.title : "Aucune session creee"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={load} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 hover:bg-white/5"><RefreshCw className="h-4 w-4" /> Recharger</button>
                <button disabled={!selected || saving} onClick={syncTeams} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 text-sm text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"><Users className="h-4 w-4" /> Sync equipes</button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <Stat icon={Shield} label="En vie" value={selected?.stats.alive_teams ?? 0} />
              <Stat icon={Skull} label="Mortes" value={selected?.stats.dead_teams ?? 0} />
              <Stat icon={Trophy} label="Kills" value={selected?.stats.total_kills ?? 0} />
              <Stat icon={Clock3} label="Round" value={selected ? `${selected.round.current}/${selected.round.total}` : "0/0"} />
            </div>

            {selected ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-[220px_1fr_1fr_1fr]">
                <label className="grid gap-2 text-xs text-slate-400">
                  Statut
                  <select
                    value={selected.status}
                    onChange={(event) => updateSession({ status: event.target.value })}
                    className="h-11 rounded-xl border border-white/10 bg-[#080d19] px-3 text-sm text-white outline-none"
                  >
                    <option value="scheduled">Programme</option>
                    <option value="live">En direct</option>
                    <option value="paused">Pause</option>
                    <option value="ended">Termine</option>
                    <option value="cancelled">Annule</option>
                  </select>
                </label>
                <Input label="Round actuel" value={String(selected.round.current)} onChange={(value) => updateSession({ round_current: Number(value) || 1 })} />
                <Input label="Rounds total" value={String(selected.round.total)} onChange={(value) => updateSession({ round_total: Number(value) || 1 })} />
                <Input label="Prochain round sec." value={String(selected.round.next_round_seconds)} onChange={(value) => updateSession({ next_round_seconds: Number(value) || 0 })} />
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Equipes inscrites</h2>
              <p className="mt-1 text-sm text-slate-400">Coche les equipes mortes ou vivantes, puis ajuste les kills et les points.</p>
            </div>
            <div className="flex gap-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedId(session.id)}
                  className={`rounded-xl px-3 py-2 text-xs ${selected?.id === session.id ? "bg-violet-600 text-white" : "border border-white/10 text-slate-300 hover:bg-white/5"}`}
                >
                  #{session.id}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr className="border-b border-white/10">
                  <th className="py-3">Equipe</th>
                  <th className="py-3">Etat</th>
                  <th className="py-3">Joueurs</th>
                  <th className="py-3">HP</th>
                  <th className="py-3">Kills</th>
                  <th className="py-3">Points</th>
                  <th className="py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {(selected?.teams ?? []).map((team) => (
                  <tr key={team.id} className="border-b border-white/10 last:border-0">
                    <td className="py-3">
                      <p className="font-semibold text-white">{team.name}</p>
                      <p className="text-xs text-slate-500">{team.captain ?? "Capitaine non renseigne"}</p>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${team.alive ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"}`}>
                        {team.alive ? "En vie" : "Mort"}
                      </span>
                    </td>
                    <td className="py-3"><NumberBox value={team.players_alive} onCommit={(value) => updateTeam(team, { players_alive: value })} /></td>
                    <td className="py-3"><NumberBox value={team.hp} onCommit={(value) => updateTeam(team, { hp: value })} /></td>
                    <td className="py-3"><NumberBox value={team.kills} onCommit={(value) => updateTeam(team, { kills: value })} /></td>
                    <td className="py-3"><NumberBox value={team.points} onCommit={(value) => updateTeam(team, { points: value })} /></td>
                    <td className="py-3">
                      <button
                        onClick={() => updateTeam(team, { alive: !team.alive, players_alive: team.alive ? 0 : Math.max(1, team.players_alive || 4), hp: team.alive ? 0 : 100 })}
                        className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${team.alive ? "bg-red-500/10 text-red-100 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"}`}
                      >
                        {team.alive ? <Skull className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        {team.alive ? "Marquer mort" : "Remettre en vie"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selected && selected.teams.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-400">
                Aucune equipe trouvee. Lie un tournoi avec des inscriptions, puis clique sur Sync equipes.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function Input({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-2 text-xs text-slate-400">
      {label}
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#080d19] px-3 text-sm text-white outline-none placeholder:text-slate-500" />
    </label>
  );
}

function NumberBox({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  return (
    <input
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={() => onCommit(Number(localValue) || 0)}
      className="h-9 w-20 rounded-lg border border-white/10 bg-[#080d19] px-2 text-sm text-white outline-none"
    />
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#080d19] p-4">
      <Icon className="h-5 w-5 text-violet-300" />
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
