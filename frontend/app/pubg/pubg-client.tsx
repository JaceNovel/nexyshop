"use client";

import { comparePubgPlayers, getPubgLeaderboard, getPubgMatch, getPubgProfile, getPubgRecentMatches, type PubgLeaderboardEntry, type PubgMatchSummary, type PubgProfile } from "@/lib/api";
import { Activity, BarChart3, Crown, Crosshair, Gamepad2, Loader2, Medal, Search, Shield, Swords, Trophy, Users, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type View = "dashboard" | "history" | "leaderboard" | "match" | "compare";

export function PubgClient({ view }: { view: View }) {
  const [profile, setProfile] = useState<PubgProfile | null>(null);
  const [playerInput, setPlayerInput] = useState("");
  const [matches, setMatches] = useState<PubgMatchSummary[]>([]);
  const [matchId, setMatchId] = useState("");
  const [match, setMatch] = useState<PubgMatchSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<PubgLeaderboardEntry[]>([]);
  const [compareInput, setCompareInput] = useState("");
  const [compared, setCompared] = useState<PubgProfile[]>([]);
  const [mode, setMode] = useState("squad-fpp");
  const [region, setRegion] = useState("pc-eu");
  const [season, setSeason] = useState("lifetime");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredProfile();
    if (stored) {
      setProfile(stored);
      setPlayerInput(stored.name || stored.game_id || stored.account_id || "");
      setCompareInput(stored.name || "");
      setMatchId(stored.recent_matches?.[0] ?? "");
    }
  }, []);

  useEffect(() => {
    if (view === "history" && profile) loadHistory(profile.account_id || profile.name);
    if (view === "leaderboard") loadLeaderboard();
    if (view === "match" && matchId) loadMatch(matchId);
  }, [view, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const heroTitle = {
    dashboard: "PUBG Hub",
    history: "Historique PUBG",
    leaderboard: "Classement TOP 500",
    match: "Chercher un match",
    compare: "Comparateur PUBG"
  }[view];

  async function connectProfile() {
    if (!playerInput.trim()) {
      setMessage("Entre ton ID PUBG.");
      return;
    }
    await run(async () => {
      const payload = await getPubgProfile(playerInput.trim(), { persistAsCurrentUser: true });
      localStorage.setItem("astral_favorite_game", "pubg");
      setProfile(payload);
      setMatchId(payload.recent_matches[0] ?? "");
      setMessage(`Profil PUBG connecté : ${payload.name}`);
    });
  }

  async function loadHistory(player = playerInput) {
    if (!player.trim()) {
      setMessage("Entre un pseudo PUBG ou un account.id.");
      return;
    }
    await run(async () => {
      const payload = await getPubgRecentMatches(player.trim());
      setMatches(payload.data);
      setMessage(payload.data.length ? null : "Aucun match récent trouvé.");
    });
  }

  async function loadLeaderboard() {
    await run(async () => {
      const payload = await getPubgLeaderboard({ season, mode, region });
      setLeaderboard(payload.data);
      setMessage(payload.data.length ? null : "Aucune entrée de classement retournée.");
    });
  }

  async function loadMatch(id = matchId) {
    if (!id.trim()) {
      setMessage("Entre un ID de match PUBG.");
      return;
    }
    await run(async () => {
      const payload = await getPubgMatch(id.trim());
      setMatch(payload);
      setMessage(null);
    });
  }

  async function runCompare() {
    const players = compareInput.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 4);
    if (players.length < 2) {
      setMessage("Entre au moins deux joueurs, séparés par une virgule.");
      return;
    }
    await run(async () => {
      const payload = await comparePubgPlayers(players);
      setCompared(payload.data);
      setMessage(null);
    });
  }

  async function run(action: () => Promise<void>) {
    setLoading(true);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action PUBG impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full px-3 py-5 sm:px-5">
      <div className="relative overflow-hidden rounded-lg border border-[#111827] bg-[#070b12] p-6 text-white shadow-[0_22px_56px_rgba(16,24,40,.18)]">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,37,50,.22),transparent_38%,rgba(250,204,21,.14)_100%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_390px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase text-[#ff5961]">Astral4Gamer PUBG</p>
            <h1 className="mt-2 text-4xl font-black tracking-normal">{heroTitle}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/68">
              Profil, matchs, TOP 500, recherche et comparaison des joueurs PUBG depuis les données officielles.
            </p>
          </div>
          <div className="rounded-lg border border-white/12 bg-white/8 p-3">
            <label className="text-[11px] font-black uppercase text-white/58">ID PUBG</label>
            <div className="mt-2 flex gap-2">
              <input value={playerInput} onChange={(event) => setPlayerInput(event.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border border-white/12 bg-white px-3 text-sm font-bold text-[#111827] outline-none" placeholder="Pseudo PUBG ou account.id" />
              <button onClick={connectProfile} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#ff2532] px-4 text-xs font-black text-white disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gamepad2 className="h-4 w-4" />}
                Connecter
              </button>
            </div>
          </div>
        </div>
      </div>

      {message ? <div className="mt-4 rounded-lg border border-[#ffd0d0] bg-[#fff6f6] px-4 py-3 text-sm font-bold text-[#b70d0d]">{message}</div> : null}

      <nav className="mobile-scroll mt-4 flex gap-2 overflow-x-auto whitespace-nowrap">
        {[
          ["/pubg", "Dashboard"],
          ["/pubg/historique", "Historique"],
          ["/pubg/classement", "TOP 500"],
          ["/pubg/match", "Match"],
          ["/pubg/comparateur", "Comparateur"]
        ].map(([href, label]) => (
          <a key={href} href={href} className="inline-flex h-10 items-center rounded-lg border border-[#e4e8f0] bg-white px-4 text-xs font-black text-[#111827] shadow-sm transition hover:border-[#ff2532] hover:text-[#ff2532]">{label}</a>
        ))}
      </nav>

      {view === "dashboard" ? <Dashboard profile={profile} /> : null}
      {view === "history" ? <History matches={matches} loading={loading} onLoad={() => loadHistory()} /> : null}
      {view === "leaderboard" ? <Leaderboard entries={leaderboard} profile={profile} mode={mode} region={region} season={season} onMode={setMode} onRegion={setRegion} onSeason={setSeason} onLoad={loadLeaderboard} loading={loading} /> : null}
      {view === "match" ? <MatchSearch matchId={matchId} onMatchId={setMatchId} match={match} loading={loading} onLoad={() => loadMatch()} /> : null}
      {view === "compare" ? <Compare input={compareInput} onInput={setCompareInput} profiles={compared} loading={loading} onCompare={runCompare} /> : null}
    </section>
  );
}

function Dashboard({ profile }: { profile: PubgProfile | null }) {
  const highlights = profile?.highlights;
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <Panel title="Profil connecté">
        {profile ? (
          <div className="flex items-center gap-4">
            <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-lg border border-[#ececf3] bg-[#f8fafc]" />
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-black">{profile.name}</h2>
              <p className="mt-1 truncate text-xs font-bold text-[#667085]">{profile.account_id}</p>
              <p className="mt-2 text-sm font-black text-[#ff2532]">{profile.rank.label} · {profile.rank.score} pts</p>
            </div>
          </div>
        ) : <Empty text="Connecte ton ID PUBG pour afficher ton profil." />}
      </Panel>
      <Panel title="Statistiques principales">
        <StatsGrid stats={[
          ["Matchs", highlights?.matches ?? 0, Trophy],
          ["Victoires", highlights?.wins ?? 0, Crown],
          ["Kills", highlights?.kills ?? 0, Swords],
          ["Assists", highlights?.assists ?? 0, Users],
          ["Top 10", highlights?.top10s ?? 0, Medal],
          ["Plus long kill", `${Math.round(highlights?.longestKill ?? 0)} m`, Crosshair]
        ]} />
      </Panel>
    </div>
  );
}

function History({ matches, loading, onLoad }: { matches: PubgMatchSummary[]; loading: boolean; onLoad: () => void }) {
  return (
    <Panel title="Historique des derniers matchs" action={<Action loading={loading} onClick={onLoad} label="Charger" />}>
      <div className="grid gap-3">
        {matches.map((match) => <MatchCard key={match.id} match={match} />)}
        {!matches.length ? <Empty text="Connecte un profil puis charge l'historique." /> : null}
      </div>
    </Panel>
  );
}

function Leaderboard(props: { entries: PubgLeaderboardEntry[]; profile: PubgProfile | null; mode: string; region: string; season: string; loading: boolean; onMode: (v: string) => void; onRegion: (v: string) => void; onSeason: (v: string) => void; onLoad: () => void }) {
  const playerRank = findLeaderboardRank(props.entries, props.profile);

  return (
    <Panel title="Classement TOP 500 officiel PUBG" action={<Action loading={props.loading} onClick={props.onLoad} label="Actualiser" />}>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Select label="Mode" value={props.mode} onChange={props.onMode} options={["solo", "solo-fpp", "duo", "duo-fpp", "squad", "squad-fpp"]} />
        <Select label="Région" value={props.region} onChange={props.onRegion} options={["pc-eu", "pc-na", "pc-as", "pc-krjp", "pc-sa", "pc-sea", "pc-oc"]} />
        <Input label="Saison" value={props.season} onChange={props.onSeason} placeholder="lifetime ou seasonId" />
      </div>
      <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-bold ${
        !props.profile
          ? "border-[#e4e8f0] bg-[#fbfcff] text-[#667085]"
          : playerRank
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
      }`}>
        {!props.profile
          ? "Connecte ton profil PUBG pour voir ta position dans le TOP 500 officiel."
          : playerRank
            ? `${props.profile.name} est dans le TOP 500 officiel : rang #${playerRank.rank}.`
            : `${props.profile.name} n’est pas dans le TOP 500 officiel pour cette saison, région et ce mode.`}
      </div>
      <div className="overflow-hidden rounded-lg border border-[#ececf3]">
        {props.entries.slice(0, 500).map((entry) => (
          <div key={entry.account_id} className={`grid grid-cols-[54px_1fr_90px_90px] items-center gap-3 border-b border-[#f0f1f5] px-3 py-3 last:border-b-0 ${playerRank?.account_id === entry.account_id ? "bg-emerald-50" : ""}`}>
            <b className="text-lg">#{entry.rank}</b>
            <span className="flex min-w-0 items-center gap-3"><img src={entry.avatar_url} alt="" className="h-9 w-9 rounded-lg" /><span className="truncate text-sm font-black">{entry.name}</span></span>
            <Stat label="Wins" value={entry.stats.wins ?? 0} />
            <Stat label="Kills" value={entry.stats.kills ?? 0} />
          </div>
        ))}
        {!props.entries.length ? <Empty text="Charge le classement pour afficher les joueurs." /> : null}
      </div>
    </Panel>
  );
}

function MatchSearch({ matchId, onMatchId, match, loading, onLoad }: { matchId: string; onMatchId: (v: string) => void; match: PubgMatchSummary | null; loading: boolean; onLoad: () => void }) {
  return (
    <Panel title="Chercher un match" action={<Action loading={loading} onClick={onLoad} label="Rechercher" />}>
      <Input label="ID de match" value={matchId} onChange={onMatchId} placeholder="Match ID PUBG" />
      {match ? <div className="mt-4"><MatchCard match={match} detailed /></div> : <Empty text="Entre un ID de match pour voir participants, kills et dégâts." />}
    </Panel>
  );
}

function Compare({ input, onInput, profiles, loading, onCompare }: { input: string; onInput: (v: string) => void; profiles: PubgProfile[]; loading: boolean; onCompare: () => void }) {
  return (
    <Panel title="Comparateur de joueur" action={<Action loading={loading} onClick={onCompare} label="Comparer" />}>
      <textarea value={input} onChange={(event) => onInput(event.target.value)} className="min-h-24 w-full rounded-lg border border-[#d8dde7] px-3 py-2 text-sm font-bold outline-none focus:border-[#ff2532]" placeholder="Ex: PlayerOne, PlayerTwo" />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {profiles.map((profile) => (
          <div key={profile.account_id} className="rounded-lg border border-[#ececf3] bg-white p-4">
            <div className="flex items-center gap-3"><img src={profile.avatar_url} alt="" className="h-12 w-12 rounded-lg" /><div><h3 className="font-black">{profile.name}</h3><p className="text-xs font-bold text-[#ff2532]">{profile.rank.label}</p></div></div>
            <StatsGrid compact stats={[["Matchs", profile.highlights.matches, Trophy], ["Wins", profile.highlights.wins, Crown], ["Kills", profile.highlights.kills, Swords], ["Top 10", profile.highlights.top10s, Medal]]} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function MatchCard({ match, detailed = false }: { match: PubgMatchSummary; detailed?: boolean }) {
  const topPlayers = match.participants.slice(0, detailed ? 32 : 5);
  return (
    <article className="rounded-lg border border-[#ececf3] bg-white p-4 shadow-[0_10px_24px_rgba(16,24,40,.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="font-mono text-sm font-black">{match.id}</h3><p className="mt-1 text-xs font-bold text-[#667085]">{match.map} · {match.mode} · {formatDuration(match.duration)}</p></div>
        <a href={`/pubg/match?id=${encodeURIComponent(match.id)}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3 text-xs font-black text-white"><Search className="h-4 w-4" /> Détail</a>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-[#f0f1f5]">
        {topPlayers.map((player) => (
          <div key={player.id} className="grid grid-cols-[46px_1fr_70px_90px] items-center gap-3 border-b border-[#f0f1f5] px-3 py-2 last:border-b-0">
            <b>#{player.win_place ?? "-"}</b>
            <span className="truncate text-sm font-black">{player.name}</span>
            <Stat label="Kills" value={player.kills} />
            <Stat label="Dégâts" value={Math.round(player.damage)} />
          </div>
        ))}
      </div>
    </article>
  );
}

function StatsGrid({ stats, compact = false }: { stats: Array<[string, string | number, typeof Trophy]>; compact?: boolean }) {
  return <div className={`grid gap-3 ${compact ? "mt-4 grid-cols-2" : "grid-cols-2 md:grid-cols-3"}`}>{stats.map(([label, value, Icon]) => <div key={label} className="rounded-lg border border-[#ececf3] bg-[#fbfcff] p-3 text-center"><Icon className="mx-auto h-5 w-5 text-[#ff2532]" /><p className="mt-2 text-[10px] font-black uppercase text-[#667085]">{label}</p><b className="mt-1 block text-lg">{value}</b></div>)}</div>;
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="mt-5 rounded-lg border border-[#ececf3] bg-white p-4 shadow-[0_12px_30px_rgba(16,24,40,.05)]"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-black"><Activity className="h-4 w-4 text-[#ff2532]" /> {title}</h2>{action}</div>{children}</section>;
}

function Action({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#ff2532] px-3 text-xs font-black text-white disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{label}</button>;
}

function findLeaderboardRank(entries: PubgLeaderboardEntry[], profile: PubgProfile | null) {
  if (!profile) return null;
  const accountId = profile.account_id?.toLowerCase();
  const names = [profile.name, profile.game_id].map((value) => value?.trim().toLowerCase()).filter(Boolean);

  return entries.find((entry) => {
    if (accountId && entry.account_id.toLowerCase() === accountId) return true;
    return names.includes(entry.name.trim().toLowerCase());
  }) ?? null;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-[11px] font-black uppercase text-[#667085]">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#d8dde7] bg-white px-3 text-sm font-black outline-none focus:border-[#ff2532]">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="text-[11px] font-black uppercase text-[#667085]">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#d8dde7] px-3 text-sm font-bold outline-none focus:border-[#ff2532]" placeholder={placeholder} /></label>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <span className="text-right"><small className="block text-[10px] font-black uppercase text-[#98a2b3]">{label}</small><b className="text-sm">{new Intl.NumberFormat("fr-FR").format(value)}</b></span>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-[#d7dce5] bg-[#fbfcff] p-6 text-center text-sm font-semibold text-[#667085]">{text}</div>;
}

function readStoredProfile() {
  try {
    const raw = localStorage.getItem("astral_pubg_profile");
    return raw ? JSON.parse(raw) as PubgProfile : null;
  } catch {
    return null;
  }
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(Math.max(seconds, 0) / 60);
  const remaining = Math.floor(Math.max(seconds, 0) % 60);
  return `${minutes}m ${String(remaining).padStart(2, "0")}s`;
}
