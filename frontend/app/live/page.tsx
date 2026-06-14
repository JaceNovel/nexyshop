"use client";

import { useUser } from "@clerk/nextjs";
import {
  BadgeCheck,
  Bell,
  Clock3,
  Eye,
  Heart,
  Maximize,
  MessageCircle,
  Pause,
  Play,
  Send,
  Settings,
  Share2,
  Shield,
  Swords,
  Trophy,
  Users,
  Volume2,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { YouTubePlayer } from "@/components/youtube-player";
import { socket } from "@/lib/socket";

const streamImage = "https://wallpapercave.com/wp/wp7536967.jpg";
const giftImage = "https://img.icons8.com/color/192/gift.png";

type LiveTeam = { name: string; alive: number; hp: number; kills: number };
type LiveTeamDetail = LiveTeam & { captain: string };
type LiveRankingRow = { team: string; points: string; direction: "up" | "down" | "same" };

type ChatMessage = {
  name: string;
  text: string;
  avatar?: string;
  time: string;
  role?: "official" | "host" | "viewer" | "me";
};

type StoredFreeFireProfile = {
  nickname?: string | null;
};

type ChatIdentity = {
  name: string;
  avatar?: string;
};

const qualityOptions = [
  { value: "hd1080", label: "1080p" },
  { value: "hd720", label: "720p" },
  { value: "hd480", label: "480p HD" },
  { value: "medium", label: "360p" },
  { value: "small", label: "240p" }
];

const initialMessages: ChatMessage[] = [
  { name: "Astral Officiel", text: "Prochain round dans 5 min.", time: "il y a 1 min", role: "official" },
  { name: "ASTRAL10M", text: "Bienvenue sur le live de la grande finale Astral Cup !", avatar: "https://i.pravatar.cc/48?img=11", time: "il y a 2 min", role: "host" },
  { name: "GamerPro", text: "La rotation vers Peak est parfaite.", avatar: "https://i.pravatar.cc/48?img=12", time: "20:31", role: "viewer" },
  { name: "BlueX", text: "Le call de Shadow peut tout changer.", avatar: "https://i.pravatar.cc/48?img=32", time: "20:31", role: "viewer" },
  { name: "Astral Officiel", text: "Restez respectueux dans le chat.", time: "20:31", role: "official" },
  { name: "LeMonstre", text: "TM-MAFIA garde l’avantage au classement.", avatar: "https://i.pravatar.cc/48?img=15", time: "20:31", role: "viewer" },
  { name: "SarahFF", text: "Le clutch sur la colline était incroyable.", avatar: "https://i.pravatar.cc/48?img=47", time: "20:31", role: "viewer" }
];

const defaultTeams: LiveTeam[] = [
  { name: "TM-MAFIA", alive: 12, hp: 96, kills: 5 },
  { name: "TEAM SHADOW", alive: 8, hp: 78, kills: 3 },
  { name: "PRIME ELITE", alive: 6, hp: 58, kills: 2 },
  { name: "TEAM DRAGON", alive: 3, hp: 34, kills: 1 }
];

const defaultAliveTeams: LiveTeamDetail[] = [
  { name: "TM-MAFIA", alive: 12, hp: 96, kills: 5, captain: "TM-Delete!!" },
  { name: "TEAM SHADOW", alive: 8, hp: 78, kills: 3, captain: "ShadowX" },
  { name: "PRIME ELITE", alive: 6, hp: 58, kills: 2, captain: "Prime Sahel" },
  { name: "TEAM DRAGON", alive: 3, hp: 34, kills: 1, captain: "Dragon Ilyas" },
  { name: "ONLY GODS", alive: 3, hp: 31, kills: 1, captain: "Only Kero" },
  { name: "BAD BOYS", alive: 2, hp: 24, kills: 0, captain: "BB Zaki" }
];

const defaultRanking: LiveRankingRow[] = [
  { team: "TM-MAFIA", points: "52 PTS", direction: "up" },
  { team: "TEAM SHADOW", points: "41 PTS", direction: "up" },
  { team: "PRIME ELITE", points: "33 PTS", direction: "down" },
  { team: "TEAM DRAGON", points: "21 PTS", direction: "same" }
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const matches: Array<[string, string, string, string, LucideIcon]> = [
  ["16:00", "Round 4", "Bermuda", "4 équipes", Swords],
  ["16:45", "Round 5", "Bermuda", "4 équipes", Clock3],
  ["17:30", "Round 6", "Purgatory", "4 équipes", Swords],
  ["18:15", "Grande finale", "Bermuda", "Top 4", Trophy]
];

const liveStats: Array<[string, string, LucideIcon]> = [
  ["0", "Spectateurs", Users],
  ["12", "Équipes en vie", Shield],
  ["0", "Kills total", Trophy],
  ["03:21:45", "Durée du live", Clock3],
  ["Round 3/7", "En cours", Swords]
];

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function createBaselineViewers() {
  return 1 + Math.floor(Math.random() * 20);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.round(value)));
}

export default function LivePage() {
  const fallbackViewers = useRef(createBaselineViewers());
  const { user } = useUser();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [volume, setVolume] = useState(80);
  const [quality, setQuality] = useState("hd480");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [playerReloadKey, setPlayerReloadKey] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [nextRoundIn, setNextRoundIn] = useState(338);
  const [watchMinutes, setWatchMinutes] = useState(45);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [...initialMessages].reverse());
  const [chatIdentity, setChatIdentity] = useState<ChatIdentity>({ name: "Vous" });
  const [teamsModalOpen, setTeamsModalOpen] = useState(false);
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [challengeGame, setChallengeGame] = useState("Free Fire");
  const [challengePhone, setChallengePhone] = useState("");
  const [liveTeams, setLiveTeams] = useState<LiveTeam[]>(defaultTeams);
  const [aliveTeams, setAliveTeams] = useState<LiveTeamDetail[]>(defaultAliveTeams);
  const [ranking, setRanking] = useState<LiveRankingRow[]>(defaultRanking);
  const [liveViewers, setLiveViewers] = useState(fallbackViewers.current);
  const playerShellRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNextRoundIn((current) => (current > 0 ? current - 1 : 0));
      setWatchMinutes((current) => (isPlaying && current < 120 ? current + 1 : current));
    }, 5000);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    function refresh() {
      setLiveTeams(readJson<LiveTeam[]>("astral_live_teams", defaultTeams));
      setAliveTeams(readJson<LiveTeamDetail[]>("astral_live_alive_teams", defaultAliveTeams));
      setRanking(readJson<LiveRankingRow[]>("astral_live_ranking", defaultRanking));
      setChatIdentity(getCurrentChatIdentity(user));
    }

    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [user]);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  useEffect(() => {
    function updateViewers(payload: { viewers?: number }) {
      if (typeof payload.viewers === "number" && Number.isFinite(payload.viewers)) {
        setLiveViewers(Math.max(fallbackViewers.current, payload.viewers));
      }
    }

    socket.connect();
    socket.on("live:presence", updateViewers);
    socket.on("live:metrics", updateViewers);

    return () => {
      socket.off("live:presence", updateViewers);
      socket.off("live:metrics", updateViewers);
    };
  }, []);

  const totalKills = useMemo(() => liveTeams.reduce((sum, team) => sum + team.kills, 0), [liveTeams]);
  const watchPercent = Math.min(100, Math.round((watchMinutes / 120) * 100));
  const canClaimBonus = watchMinutes >= 120 && !bonusClaimed;

  function sendMessage() {
    const text = message.trim();
    if (!text) return;
    const identity = getCurrentChatIdentity(user);
    setChatIdentity(identity);
    setMessages((current) => [...current, { ...identity, text, time: "maintenant", role: "me" }]);
    setMessage("");
  }

  function togglePlayback() {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setPlayerReloadKey((value) => value + 1);
    setIsPlaying(true);
  }

  async function enterFullscreen() {
    const target = playerShellRef.current;
    if (!target) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }

    await target.requestFullscreen?.().catch(() => {});
  }

  return (
    <main className="min-h-screen bg-[#fbfbfd] text-[#111827]">
      <SiteHeader />

      <section className="mx-auto grid w-full max-w-[1880px] gap-3 px-3 py-3 sm:px-5 md:gap-5 md:py-5 xl:grid-cols-[230px_minmax(0,1fr)_330px] 2xl:grid-cols-[260px_minmax(0,1fr)_390px] 2xl:px-8">
        <aside className="grid gap-3 sm:grid-cols-3 xl:block xl:space-y-3">
          <Panel className="p-4 text-center">
            <span className="inline-flex rounded bg-[#e52b2f] px-3 py-1.5 text-[11px] font-black text-white shadow-[0_10px_26px_rgba(229,43,47,.25)]">EN DIRECT</span>
            <p className="mt-4 text-xs font-black uppercase text-[#667085]">Finale officielle Astral</p>
            <p className="mt-2 text-[30px] font-black leading-none tracking-[-2px]">FREE<span className="text-[#f59e0b]">F</span>IRE</p>
            <p className="mt-3 text-sm font-black text-[#ff313d]">Grande finale</p>
            <p className="mt-3 text-[11px] leading-5 text-[#667085]">BR Squad • Bermuda<br />Prize pool : 250 000 FCFA</p>
          </Panel>

          <Panel className="p-4 text-center">
            <p className="text-xs font-black uppercase">Round en cours</p>
            <p className="mt-2 text-[36px] font-black"><span className="text-[#ff313d]">3</span> / 7</p>
            <div className="my-3 h-px bg-[#e5e7eb]" />
            <p className="text-xs font-black uppercase">Prochain round</p>
            <p className="mt-1 text-[25px] font-black text-[#ff313d]">{formatTimer(nextRoundIn)}</p>
          </Panel>

          <Panel className="p-4">
            <p className="text-xs font-black uppercase">Équipes en vie</p>
            <div className="mt-3 space-y-3">
              {liveTeams.map((team, index) => (
                <div key={team.name} className="grid grid-cols-[20px_1fr_20px_34px] items-center gap-2 text-[12px]">
                  <span className="grid h-5 w-5 place-items-center rounded bg-[#e52b2f] text-[11px] font-black text-white">{index + 1}</span>
                  <b>{team.name}</b>
                  <b>{team.alive}</b>
                  <span className="h-3 rounded-sm bg-[#e5e7eb]"><span className="block h-full rounded-sm bg-[#22c55e]" style={{ width: `${team.hp}%` }} /></span>
                </div>
              ))}
            </div>
            <button onClick={() => setTeamsModalOpen(true)} className="interactive-button mt-4 h-9 w-full rounded bg-[#f5f3ff] text-[11px] font-black text-[#6d28d9]">VOIR TOUTES LES ÉQUIPES EN VIE</button>
          </Panel>

          <Panel className="relative min-h-[190px] overflow-hidden p-4 text-center sm:col-span-3 xl:col-span-1 xl:min-h-[250px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,43,47,.28),transparent_52%),linear-gradient(135deg,#ffffff,#fff5f5)]" />
            <div className="relative z-10 flex min-h-[190px] flex-col justify-end xl:min-h-[256px]">
              <p className="text-[21px] font-black leading-6">Défiez<br />Astral4Gamer</p>
              <p className="mt-4 text-xs font-black uppercase tracking-normal text-[#667085]">Récompense</p>
              <p className="text-[40px] font-black leading-none text-[#ff4b55]">4000</p>
              <p className="mt-1 font-black text-[#fde047]">Ticket : 2000 FCFA</p>
              <button onClick={() => setChallengeModalOpen(true)} className="interactive-button mt-4 h-12 rounded bg-[#e52b2f] text-sm font-black text-white shadow-[0_14px_28px_rgba(229,43,47,.22)]">RELEVER LE DÉFI</button>
            </div>
          </Panel>
        </aside>

        <section className="min-w-0 space-y-3">
          <Panel className="overflow-hidden">
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-3 py-2 md:px-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2 md:gap-3">
                <h1 className="text-[16px] font-black md:text-[20px]">Astral Cup #12 - Grande finale</h1>
                <span className="rounded bg-[#ef4444] px-2 py-1 text-[11px] font-black text-white">EN DIRECT</span>
                <span className="flex items-center gap-1 text-xs"><Eye className="h-4 w-4" /> {formatCount(liveViewers)}</span>
              </div>
              <div className="flex gap-2">
                <button className="interactive-button grid h-8 w-8 place-items-center rounded bg-[#f6f6f7] text-[#111827]" aria-label="Partager"><Share2 className="h-4 w-4" /></button>
                <button onClick={() => setIsSubscribed((value) => !value)} className={`interactive-button flex h-8 items-center gap-2 rounded px-3 text-[11px] font-black ${isSubscribed ? "bg-[#111827] text-white" : "bg-[#ef4444] text-white"}`}>
                  <Heart className={`h-4 w-4 ${isSubscribed ? "fill-white" : ""}`} />{isSubscribed ? "Abonné" : "S'abonner"}
                </button>
              </div>
            </div>

            <div
              ref={playerShellRef}
              onClick={() => setControlsVisible((value) => !value)}
              className="relative aspect-video cursor-pointer overflow-hidden bg-black"
            >
              <img src={streamImage} alt="Live Free Fire" className={`h-full w-full object-cover transition duration-500 ${isPlaying ? "scale-100" : "scale-[1.02] opacity-80"}`} />
              <div className="absolute inset-0">
                <YouTubePlayer
                  key={playerReloadKey}
                  videoId="M7lc1UVf-VE"
                  autoplay={isPlaying}
                  volume={volume}
                  playbackQuality={quality}
                  onProgress={(progress) => setVideoProgress(progress.percent)}
                  title="Live NEXY"
                  className="h-full"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />
              <div className={`absolute left-2 right-2 top-2 flex items-center justify-between text-white transition-opacity duration-200 md:left-4 md:right-4 md:top-3 ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                <div className="hidden items-center gap-4 text-xs font-black sm:flex"><span>Signal 17 ms</span><span>Zone 12%</span><span>NW 330 345 N 5 30 NE</span></div>
                <div className="ml-auto flex items-center gap-1.5 text-[10px] font-black md:gap-2 md:text-xs"><span className="bg-emerald-500 px-2 py-1">ALIVE 12</span><span className="bg-red-500 px-2 py-1">KILL {totalKills}</span><span>{qualityOptions.find((option) => option.value === quality)?.label}</span></div>
              </div>
              <div className={`absolute left-2 top-12 hidden w-[145px] space-y-1 text-[11px] font-black text-white transition-opacity duration-200 sm:block md:left-4 md:top-24 ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                {["TM-MAFIA", "TM-FozyAjay", "PRIME-Sahel", "DRAGON-Ilyas"].map((player, index) => (
                  <div key={player} className="flex bg-black/55"><span className="w-6 bg-[#e52b2f] text-center">{index + 1}</span><span className="px-2">{player}</span></div>
                ))}
              </div>
              {!isPlaying && <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center text-white"><span className="rounded-full bg-black/55 px-5 py-3 text-sm font-black">Live en pause</span></div>}
              <div className={`absolute bottom-12 left-3 hidden w-[180px] bg-black/70 p-2 text-white transition-opacity duration-200 sm:block md:bottom-14 md:left-[30%] ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                <b>TM-MAFIA</b><p className="text-[11px]">Eliminations: 5 • HP 200/200</p><div className="mt-1 h-2.5 bg-white"><span className="block h-full w-full bg-[#dbeafe]" /></div>
              </div>
              <div
                onClick={(event) => event.stopPropagation()}
                className={`absolute bottom-0 left-0 right-0 z-20 px-3 pb-2 text-white transition-opacity duration-200 md:px-5 md:pb-3 ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
              >
                <div className="h-1 rounded-full bg-white/35"><span className="block h-full rounded-full bg-[#ef4444] transition-[width] duration-300" style={{ width: `${videoProgress}%` }} /></div>
                <div className="mt-2 flex items-center gap-3 text-xs font-black md:mt-3 md:gap-4 md:text-sm">
                  <button onClick={togglePlayback} className="interactive-icon" aria-label={isPlaying ? "Mettre en pause" : "Reprendre le direct"}>{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
                  <label className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(event) => setVolume(Number(event.target.value))}
                      className="h-1 w-16 accent-[#ef4444] md:w-24"
                      aria-label="Volume du live"
                    />
                  </label>
                  <span className="hidden items-center gap-2 sm:flex"><span className="h-3 w-3 rounded-full bg-[#ef4444]" /> EN DIRECT</span>
                  <span className="relative ml-auto flex gap-5">
                    <button onClick={() => setSettingsOpen((value) => !value)} className="interactive-icon" aria-label="Paramètres vidéo"><Settings className="h-5 w-5" /></button>
                    {settingsOpen ? (
                      <span className="absolute bottom-8 right-8 w-36 rounded-lg border border-white/10 bg-black/85 p-2 text-xs shadow-[0_16px_38px_rgba(0,0,0,.35)]">
                        <b className="mb-2 block text-[10px] uppercase text-white/60">Résolution</b>
                        {qualityOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setQuality(option.value);
                              setSettingsOpen(false);
                            }}
                            className={`block w-full rounded px-2 py-1.5 text-left font-black ${quality === option.value ? "bg-[#ef4444] text-white" : "text-white hover:bg-white/10"}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </span>
                    ) : null}
                    <button onClick={enterFullscreen} className="interactive-icon" aria-label="Plein écran"><Maximize className="h-5 w-5" /></button>
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-[#edf0f4]">
            {liveStats.map(([value, label, Icon]) => (
              <div key={label as string} className="flex items-center gap-2 rounded bg-[#fbfbfd] px-2 py-2 lg:bg-transparent lg:px-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#fff5f5] text-[#e52b2f] md:h-10 md:w-10"><Icon className="h-4 w-4 md:h-5 md:w-5" /></span>
                <span><b className="text-sm">{label === "Spectateurs" ? formatCount(liveViewers) : label === "Kills total" ? totalKills : value}</b><br /><small className="text-[11px] text-[#4b5563]">{label}</small></span>
              </div>
            ))}
          </Panel>

          <Panel className="p-4">
            <h2 className="text-xs font-black uppercase text-[#667085]">Prochains matchs</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {matches.map(([time, title, map, teamCount, Icon]) => (
                <article key={title} className="soft-pop rounded-lg border border-[#edf0f4] bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff5f5] text-[#e52b2f]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <b className="text-sm">{time}</b>
                  </div>
                  <h3 className="mt-2 text-sm font-black">{title}</h3>
                  <p className="text-xs text-[#667085]">{map}</p>
                  <p className="mt-1 text-[11px] font-black uppercase text-[#ff313d]">{teamCount}</p>
                </article>
              ))}
            </div>
          </Panel>
        </section>

        <aside className="space-y-3">
          <Panel className="overflow-hidden">
            <div className="flex h-12 items-center justify-between border-b border-[#edf0f4] bg-white px-4"><h2 className="text-sm font-black">CHAT EN DIRECT</h2><b className="text-[#6d28d9]">{messages.length}</b></div>
            <div ref={chatScrollRef} className="max-h-[300px] space-y-3 overflow-y-auto px-3 py-4 xl:max-h-[390px]">
              {messages.map((chat, index) => (
                <ChatBubble key={`${chat.name}-${chat.text}-${index}`} chat={chat} />
              ))}
            </div>
            <div className="flex gap-2 border-t border-[#edf0f4] bg-white p-3">
              <input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendMessage()} className="h-11 flex-1 rounded-lg bg-[#f8fafc] px-3 text-sm outline-none transition focus:bg-white focus:shadow-[0_0_0_2px_rgba(109,40,217,.16)]" placeholder="Écrire un message..." />
              <button onClick={sendMessage} className="interactive-button flex h-11 items-center gap-2 rounded-lg bg-[#6d28d9] px-3 text-xs font-black text-white md:px-4"><Send className="h-4 w-4" /><span className="hidden sm:inline">ENVOYER</span></button>
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center justify-between"><h2 className="text-sm font-black">CLASSEMENT LIVE</h2><a href="/classement" className="interactive-button rounded bg-[#f5f3ff] px-2 py-2 text-[10px] font-black text-[#6d28d9]">COMPLET</a></div>
            <div className="mt-3 divide-y divide-[#edf0f4]">
              {ranking.map((row, index) => (
                <div key={`${index}-${row.team}`} className="grid grid-cols-[24px_1fr_62px_18px] py-2.5 text-[13px]">
                  <b>{index + 1}</b>
                  <b>{row.team}</b>
                  <span>{row.points}</span>
                  <span className={row.direction === "down" ? "text-red-500" : row.direction === "up" ? "text-emerald-600" : "text-[#9ca3af]"}>{row.direction === "up" ? "↑" : row.direction === "down" ? "↓" : "–"}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="relative overflow-hidden p-4">
            <img src={giftImage} alt="" className="absolute -right-2 bottom-1 h-28 w-28 object-contain opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,43,47,.18),transparent_52%),linear-gradient(135deg,#ffffff,#fff5f5)]" />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">BONUS LIVE</h2>
                  <p className="mt-2 max-w-[230px] text-sm text-[#4b5563]">Regardez la finale pour débloquer des crédits Astral.</p>
                </div>
                <Bell className="h-5 w-5 text-[#e52b2f]" />
              </div>
              <p className="mt-4 text-sm">Temps regardé : <b>{watchMinutes} / 120 min</b></p>
              <div className="mt-2 h-2 rounded-full bg-[#e5e7eb]"><span className="block h-full rounded-full bg-[#e52b2f]" style={{ width: `${watchPercent}%` }} /></div>
              <button disabled={!canClaimBonus} onClick={() => setBonusClaimed(true)} className={`interactive-button mt-4 h-10 rounded px-4 text-[11px] font-black text-white ${bonusClaimed ? "bg-emerald-600" : canClaimBonus ? "bg-[#e52b2f]" : "bg-[#9ca3af]"}`}>
                {bonusClaimed ? "RÉCOMPENSE RÉCUPÉRÉE" : canClaimBonus ? "RÉCUPÉRER MA RÉCOMPENSE" : "BONUS EN COURS"}
              </button>
            </div>
          </Panel>

          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-sm font-black"><MessageCircle className="h-4 w-4 text-[#ff313d]" /> Infos room</h2>
            <p className="mt-3 text-sm leading-6 text-[#667085]">Room ID et mot de passe envoyés aux capitaines 8 minutes avant chaque round. Les résultats sont validés par capture serveur et replay.</p>
          </Panel>
        </aside>
      </section>

      {teamsModalOpen && (
        <Modal title="Équipes encore en vie" onClose={() => setTeamsModalOpen(false)}>
          <div className="grid gap-3">
            {aliveTeams.map((team, index) => (
              <article key={team.name} className="rounded-lg border border-[#edf0f4] bg-white p-3 text-[#111827]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded bg-[#e52b2f] text-sm font-black text-white">{index + 1}</span>
                    <span><b>{team.name}</b><br /><small className="text-[#667085]">Capitaine : {team.captain}</small></span>
                  </div>
                  <b className="text-[#ff313d]">{team.alive} en vie</b>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="h-2 flex-1 rounded-full bg-[#edf0f4]"><span className="block h-full rounded-full bg-[#22c55e]" style={{ width: `${team.hp}%` }} /></span>
                  <b>{team.kills} kills</b>
                </div>
              </article>
            ))}
          </div>
        </Modal>
      )}

      {challengeModalOpen && (
        <Modal title="Relever le défi Astral4Gamer" onClose={() => setChallengeModalOpen(false)}>
          <div className="space-y-4">
            <p className="rounded-lg bg-[#f8fafc] p-3 text-sm text-[#374151]">Une personne serait choisie dans l'équipe pour vous affronter.</p>
            <div>
              <p className="mb-2 text-xs font-black uppercase text-[#6b7280]">Jeu</p>
              <div className="grid grid-cols-3 gap-2">
                {["Free Fire", "Call of Duty", "eFootball"].map((game) => (
                  <button
                    key={game}
                    onClick={() => setChallengeGame(game)}
                    className={`h-10 rounded border text-xs font-black ${
                      challengeGame === game
                        ? "border-[#e52b2f] bg-[#e52b2f] text-white"
                        : "border-[#edf0f4] bg-white text-[#111827] hover:bg-[#f8fafc]"
                    }`}
                  >
                    {game}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase text-[#6b7280]">Numéro de paiement</span>
              <input
                value={challengePhone}
                onChange={(event) => setChallengePhone(event.target.value)}
                className="h-11 w-full rounded-lg bg-[#f8fafc] px-3 text-sm text-[#111827] outline-none transition focus:bg-white focus:shadow-[0_0_0_2px_rgba(229,43,47,.18)] placeholder:text-[#9ca3af]"
                placeholder="Ex : 77 000 00 00"
              />
            </label>
            <button className="interactive-button h-12 w-full rounded-lg bg-[#e52b2f] text-sm font-black text-white shadow-[0_14px_28px_rgba(229,43,47,.22)]">PAYER 2000 FCFA</button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-lg border border-[#edf0f4] bg-white shadow-[0_2px_12px_rgba(16,24,40,.055)] ${className}`}>{children}</section>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4">
      <section className="w-full max-w-[520px] rounded-lg bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,.32)]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-black">{title}</h2>
          <button onClick={onClose} className="interactive-icon grid h-9 w-9 place-items-center rounded-full bg-[#f8fafc]"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ChatBubble({ chat }: { chat: ChatMessage }) {
  const isMe = chat.role === "me";
  const isOfficial = chat.role === "official";
  const isHost = chat.role === "host";

  return (
    <div className={`flex items-end gap-2 ${isMe ? "justify-end" : ""}`}>
      {!isMe && <ChatAvatar chat={chat} />}
      <div className={`max-w-[285px] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`mb-1 flex items-center gap-1.5 text-[12px] ${isMe ? "justify-end" : ""}`}>
          <b className={isOfficial ? "text-[#e52b2f]" : isHost ? "text-[#0891b2]" : "text-[#2563eb]"}>{chat.name}</b>
          {(isOfficial || isHost) && <BadgeCheck className="h-3.5 w-3.5 fill-[#0ea5e9] text-white" />}
          {isHost && <span className="rounded bg-[#f5f3ff] px-1.5 py-0.5 text-[9px] font-black text-[#6d28d9]">HÔTE</span>}
          <span className="text-[10px] text-[#6b7280]">{chat.time}</span>
        </div>
        <div className={`rounded-2xl px-3 py-2 text-[13px] leading-5 shadow-sm ${isMe ? "rounded-br-md bg-[#6d28d9] text-white" : isOfficial ? "rounded-bl-md border border-[#e9d5ff] bg-white text-[#111827]" : isHost ? "rounded-bl-md border border-[#bae6fd] bg-[#f0f9ff] text-[#0f172a]" : "rounded-bl-md bg-white text-[#111827]"}`}>
          {chat.text}
        </div>
      </div>
      {isMe && <ChatAvatar chat={chat} />}
    </div>
  );
}

function ChatAvatar({ chat }: { chat: ChatMessage }) {
  if (chat.avatar) {
    return <img src={chat.avatar} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />;
  }

  return (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#6d28d9] text-xs font-black text-white ring-2 ring-white">
      {(chat.name || "A").slice(0, 1).toUpperCase()}
    </span>
  );
}

function getCurrentChatIdentity(user?: {
  fullName?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  unsafeMetadata?: { free_fire?: StoredFreeFireProfile | null } | null;
} | null): ChatIdentity {
  const storedFreeFire = readJson<StoredFreeFireProfile | null>("astral_freefire_profile", null);
  const clerkFreeFire = user?.unsafeMetadata?.free_fire ?? null;
  const activeFreeFire = storedFreeFire ?? clerkFreeFire;
  const freeFireName = cleanPlayerName(activeFreeFire?.nickname);
  const accountName =
    cleanPlayerName(localStorage.getItem("nexy_google_name")) ??
    cleanPlayerName(user?.fullName) ??
    cleanPlayerName(user?.username) ??
    cleanPlayerName(user?.primaryEmailAddress?.emailAddress);
  const accountAvatar = usableAccountImage(localStorage.getItem("nexy_google_avatar")) ?? usableAccountImage(user?.imageUrl);

  return {
    name: freeFireName ?? accountName ?? "Vous",
    avatar: accountAvatar ?? undefined
  };
}

function cleanPlayerName(name?: string | null) {
  if (!name) return null;

  const cleaned = name.trim();
  if (!cleaned || cleaned.toLowerCase() === "null" || cleaned.toLowerCase() === "undefined") return null;

  return cleaned;
}

function usableAccountImage(url?: string | null) {
  if (!url) return null;

  const decoded = decodeURIComponent(url).toLowerCase();
  if (decoded.includes("not found") || decoded.includes("hl gaming official")) return null;

  return url;
}
