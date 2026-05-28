"use client";

import { useEffect, useState } from "react";
import { Activity, Bell, CalendarDays, CheckCircle2, Copy, Crown, Edit3, Eye, Gamepad2, Gift, LogOut, Mail, Medal, MoreHorizontal, Play, Search, Shield, Share2, Star, Swords, Trophy, Users, Zap } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { disconnectGoogle, getGoogleProfile } from "@/lib/api";
import { GoogleAuthButton } from "@/components/google-auth-button";

type ProfileState = Awaited<ReturnType<typeof getGoogleProfile>>;
type LocalSession = { token: string | null; name: string; avatar: string | null; email: string | null };

const stats = [
  ["MATCHS JOUÉS", "128", "+12%", Trophy],
  ["VICTOIRES", "42", "+8%", Shield],
  ["TOP 3", "78", "+15%", Medal],
  ["KILLS", "523", "+18%", Swords],
  ["TAUX K/D", "4.08", "+9%", Zap]
] as const;

const quickStats = [
  ["Meilleur rang", "HÉROÏQUE ÉLITE", Trophy],
  ["Classement saison", "#128 Afrique", Crown],
  ["MVP", "23 fois", Medal],
  ["Booyah", "42 fois", Star],
  ["Série de top 3", "15", Shield]
] as const;

const activities = [
  "A remporté le tournoi NEXY CUP #11",
  "Atteint le rang HÉROÏQUE ÉLITE",
  "A obtenu un nouveau badge MVP LEGEND",
  "A rejoint l'équipe NEXY ESports",
  "A publié un nouveau replay 1vs4 Clutch Insane"
];

const badges = ["MVP LEGEND", "BOOYAH MASTER", "KILL MACHINE", "TOURNOI WINNER", "SHARPSHOOTER", "SURVIVOR", "NEXY ORIGINAL"];

const matches = [
  ["Clutch 1vs4 Insane", "NEXY CUP #11", "18:47", "WIN"],
  ["Rush Squad Wipe", "NEXY CUP #11", "15:32", "WIN"],
  ["Full Gameplay", "NEXY CUP #10", "22:10", "TOP 3"],
  ["Highlights #7", "Entraînement", "12:05", "WIN"]
] as const;

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [session, setSession] = useState<LocalSession>({ token: null, name: "NEXY_GAMER", avatar: null, email: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("nexy_sanctum_token");
    const storedName = localStorage.getItem("nexy_google_name") || "NEXY_GAMER";
    const storedAvatar = localStorage.getItem("nexy_google_avatar");

    setSession({ token: storedToken, name: storedName, avatar: storedAvatar, email: null });

    if (!storedToken) {
      setLoading(false);
      return;
    }

    getGoogleProfile(storedToken)
      .then((payload) => {
        setProfile(payload);
        setSession({
          token: storedToken,
          name: payload.google?.name ?? payload.user.name ?? storedName,
          avatar: payload.google?.avatar_url ?? payload.user.google_avatar_url ?? storedAvatar,
          email: payload.google?.email ?? payload.user.email ?? null
        });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function handleDisconnect() {
    if (session.token) {
      await disconnectGoogle(session.token).catch(() => undefined);
    }
    localStorage.removeItem("nexy_sanctum_token");
    localStorage.removeItem("nexy_google_name");
    localStorage.removeItem("nexy_google_avatar");
    setProfile(null);
    setSession({ token: null, name: "NEXY_GAMER", avatar: null, email: null });
  }

  if (!session.token && !loading) {
    return (
      <main className="min-h-screen bg-white text-[#111827]">
        <SiteHeader />
        <section className="w-full px-4 py-10 sm:px-6">
          <div className="rounded-lg border border-[#ececf3] bg-white p-8 shadow-[0_18px_45px_rgba(16,24,40,.07)]">
            <p className="text-xs font-black uppercase text-[#e52b2f]">Profil joueur</p>
            <h1 className="mt-3 text-4xl font-black tracking-normal">Connecte ton compte Google</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5b6170]">Une fois connecté, ta photo Google apparaîtra dans la navbar à la place de Connexion et Inscription, puis ouvrira cette page profil.</p>
            <div className="mt-6 max-w-[300px]">
              <GoogleAuthButton />
            </div>
          </div>
        </section>
      </main>
    );
  }

  const avatar = session.avatar;
  const name = session.name || "NEXY_GAMER";
  const email = session.email ?? profile?.google?.email ?? "Compte Google connecté";

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />

      <section className="w-full px-3 py-5 sm:px-5">
        <div className="mb-5 grid grid-cols-[minmax(0,1fr)_360px] items-center gap-5 max-lg:grid-cols-1">
          <label className="flex h-12 items-center rounded-lg border border-[#ececf3] bg-white px-4 shadow-[0_10px_28px_rgba(16,24,40,.05)]">
            <Search className="mr-3 h-5 w-5 text-[#6b7280]" />
            <input className="w-full bg-transparent text-sm outline-none" placeholder="Rechercher un joueur, une équipe, un tournoi..." />
          </label>
          <div className="flex items-center justify-end gap-4">
            <IconBadge icon={<Bell className="h-5 w-5" />} count={3} />
            <IconBadge icon={<Mail className="h-5 w-5" />} count={5} />
            <a href="/profil" className="flex items-center gap-3 rounded-full border border-[#ececf3] bg-white py-1 pl-1 pr-4 shadow-[0_10px_28px_rgba(16,24,40,.06)]">
              {avatar ? <img src={avatar} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-[#e52b2f]" /> : <AvatarFallback name={name} size="small" />}
              <span className="text-left">
                <b className="block max-w-[130px] truncate text-sm">{name}</b>
                <small className="flex items-center gap-1 text-xs text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> En ligne</small>
              </span>
            </a>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-lg border border-[#ececf3] bg-white shadow-[0_18px_45px_rgba(16,24,40,.07)]">
          <img src="https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1600&q=80" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[.18]" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/55" />
          <div className="relative grid min-h-[260px] gap-6 p-8 lg:grid-cols-[1fr_310px]">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="grid h-40 w-40 shrink-0 place-items-center rounded-full border-[6px] border-[#e52b2f] bg-white shadow-[0_20px_50px_rgba(229,43,47,.18)]">
                {avatar ? <img src={avatar} alt="" className="h-[136px] w-[136px] rounded-full object-cover" /> : <AvatarFallback name={name} size="large" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black tracking-normal">{name}</h1>
                  <CheckCircle2 className="h-6 w-6 fill-[#e52b2f] text-white" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-[#4b5563]">
                  <span className="rounded border border-[#e52b2f] bg-[#fff1f1] px-3 py-1 text-xs font-black text-[#e52b2f]">JOUEUR PRO</span>
                  <span>ID: 246810357</span>
                  <Copy className="h-4 w-4" />
                </div>
                <p className="mt-4 text-sm font-semibold text-[#4b5563]">Joueur Free Fire • Créateur de contenu • Compétiteur</p>
                <p className="mt-2 flex flex-wrap gap-4 text-sm text-[#4b5563]"><span>📍 Lomé, Togo</span><span>📅 Membre depuis mars 2023</span><span>{email}</span></p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#e52b2f] px-5 text-sm font-black text-white"><Edit3 className="h-4 w-4" /> MODIFIER LE PROFIL</button>
                  <button className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#d7dce5] bg-white px-5 text-sm font-black"><Share2 className="h-4 w-4" /> PARTAGER PROFIL</button>
                  <button onClick={handleDisconnect} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#d7dce5] bg-white px-4 text-sm font-black"><LogOut className="h-4 w-4" /> Déconnecter</button>
                  <button className="grid h-11 w-11 place-items-center rounded-lg border border-[#d7dce5] bg-white"><MoreHorizontal className="h-5 w-5" /></button>
                </div>
              </div>
            </div>

            <aside className="rounded-lg border border-[#ececf3] bg-white/90 p-5 shadow-[0_12px_30px_rgba(16,24,40,.06)]">
              <p className="text-xs font-black uppercase text-[#6b7280]">RANG ACTUEL</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="grid h-24 w-24 place-items-center rounded-lg bg-[#fff1f1] text-[#e52b2f]"><Crown className="h-14 w-14 fill-[#e52b2f]/20" /></div>
                <div>
                  <h2 className="text-2xl font-black">HÉROÏQUE</h2>
                  <p className="text-lg font-black text-[#e52b2f]">ÉLITE</p>
                  <p className="mt-2 text-sm font-bold text-[#4b5563]">🏆 3520 PTS</p>
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-[#ececf3]"><div className="h-2 w-[62%] rounded-full bg-[#e52b2f]" /></div>
              <div className="mt-2 flex justify-between text-xs font-bold text-[#6b7280]"><span>Prochain rang : <b className="text-[#e52b2f]">MAÎTRE</b></span><span>1480 / 4500</span></div>
            </aside>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.62fr_.8fr_.9fr]">
          <Panel title="STATISTIQUES PRINCIPALES" action="Saison actuelle">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {stats.map(([label, value, trend, Icon]) => (
                <div key={label} className="rounded-lg border border-[#ececf3] bg-white p-4 text-center shadow-[0_10px_24px_rgba(16,24,40,.04)]">
                  <Icon className="mx-auto h-7 w-7 text-[#e52b2f]" />
                  <p className="mt-3 text-[11px] font-black text-[#6b7280]">{label}</p>
                  <b className="mt-2 block text-2xl">{value}</b>
                  <span className="mt-2 block text-xs font-black text-[#e52b2f]">↗ {trend}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="APERÇU RAPIDE">
            <div className="space-y-3">
              {quickStats.map(([label, value, Icon]) => (
                <div key={label} className="grid grid-cols-[22px_1fr_auto] items-center gap-2 border-b border-[#f0f1f5] pb-2 text-sm">
                  <Icon className="h-4 w-4 text-[#e52b2f]" />
                  <span className="font-semibold text-[#4b5563]">{label}</span>
                  <b className="text-right text-xs">{value}</b>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="ÉQUIPE ACTUELLE">
            <div className="rounded-lg border border-[#ececf3] bg-[#fbfbff] p-4">
              <div className="flex gap-4">
                <div className="grid h-20 w-20 place-items-center rounded-lg bg-[#fff1f1] text-[#e52b2f]"><Shield className="h-12 w-12 fill-[#e52b2f]/20" /></div>
                <div>
                  <h3 className="font-black">NEXY ESPORTS <span className="rounded bg-[#e52b2f] px-2 py-1 text-[10px] text-white">LEADER</span></h3>
                  <p className="mt-2 text-xs text-[#6b7280]">ID Équipe: 99887766</p>
                  <p className="mt-1 text-xs text-[#6b7280]">Membre depuis 12/04/2024</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#ececf3] pt-4">
                <span><small className="block text-xs text-[#6b7280]">CLASSEMENT ÉQUIPE</small><b className="text-2xl">#3</b></span>
                <span><small className="block text-xs text-[#6b7280]">RÉGION</small><b>AFRIQUE</b></span>
              </div>
            </div>
          </Panel>

          <Panel title="ACTIVITÉ RÉCENTE" action="VOIR TOUT">
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <p key={activity} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 border-b border-[#f0f1f5] pb-2 text-sm">
                  <Trophy className="h-4 w-4 text-[#e52b2f]" />
                  <span>{activity}</span>
                  <small className="text-[#6b7280]">Il y a {index + 2} jours</small>
                </p>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[.75fr_1fr]">
          <Panel title="BADGES" action="VOIR TOUS">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              {badges.map((badge) => (
                <div key={badge} className="text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#fff1f1] text-[#e52b2f]"><Star className="h-9 w-9 fill-[#e52b2f]/20" /></div>
                  <p className="mt-2 text-[10px] font-black text-[#4b5563]">{badge}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="MATCHS RÉCENTS" action="VOIR TOUS">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {matches.map(([title, subtitle, duration, result], index) => (
                <article key={title}>
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-[#f3f4f6]">
                    <img src={`https://images.unsplash.com/photo-${["1542751110-97427bbecf20", "1511512578047-dfb367046420", "1542751371-adc38448a05e", "1550745165-9bc0b252726f"][index]}?auto=format&fit=crop&w=420&q=80`} alt="" className="h-full w-full object-cover" />
                    <span className={`absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-black text-white ${result === "TOP 3" ? "bg-[#a855f7]" : "bg-emerald-500"}`}>{result}</span>
                    <span className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] font-black text-[#111827] shadow">{duration}</span>
                    <span className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-[10px] font-black text-[#111827] shadow"><Play className="inline h-3 w-3" /> 4</span>
                  </div>
                  <h3 className="mt-2 line-clamp-1 text-sm font-black">{title}</h3>
                  <p className="text-xs font-black text-[#e52b2f]">{subtitle}</p>
                  <p className="mt-1 text-xs text-[#6b7280]"><Eye className="inline h-3 w-3" /> {index === 0 ? "102" : "85"} vues • il y a {index + 2} jours</p>
                </article>
              ))}
            </div>
          </Panel>
        </section>
      </section>
    </main>
  );
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: string }) {
  return (
    <section className="rounded-lg border border-[#ececf3] bg-white p-4 shadow-[0_12px_30px_rgba(16,24,40,.05)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-black"><Activity className="h-4 w-4 text-[#e52b2f]" /> {title}</h2>
        {action ? <button className="text-[10px] font-black text-[#6b7280]">{action}</button> : null}
      </div>
      {children}
    </section>
  );
}

function IconBadge({ icon, count }: { icon: React.ReactNode; count: number }) {
  return (
    <button className="relative grid h-10 w-10 place-items-center rounded-full border border-[#ececf3] bg-white">
      {icon}
      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#e52b2f] px-1 text-[10px] font-black text-white">{count}</span>
    </button>
  );
}

function AvatarFallback({ name, size }: { name: string; size: "small" | "large" }) {
  return <span className={`grid place-items-center rounded-full bg-[#e52b2f] font-black text-white ${size === "large" ? "h-[136px] w-[136px] text-5xl" : "h-11 w-11 text-sm"}`}>{name.slice(0, 1).toUpperCase()}</span>;
}
