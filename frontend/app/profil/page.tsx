"use client";

import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { Activity, CalendarDays, CheckCircle2, Copy, Crown, Edit3, Eye, Gamepad2, Gift, Globe2, Heart, LogOut, Medal, MoreHorizontal, Play, Shield, Share2, Star, Swords, Trophy, Users, Zap } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { disconnectGoogle, getFreeFireProfile, getGoogleProfile, requestFreeFireLikes } from "@/lib/api";
import { GoogleAuthButton } from "@/components/google-auth-button";

type ProfileState = Awaited<ReturnType<typeof getGoogleProfile>>;
type LocalSession = { token: string | null; name: string; avatar: string | null; email: string | null };
type StoredFreeFireProfile = {
  uid?: string | null;
  region?: string | null;
  nickname?: string | null;
  level?: number | null;
  likes?: number | null;
  br_rank_points?: number | null;
  cs_rank_points?: number | null;
  outfit_url?: string | null;
  banner_url?: string | null;
  rank?: { br?: number | null; cs?: number | null; season?: number | null } | null;
  guild?: Record<string, unknown> | null;
  account?: {
    AccountInfo?: Record<string, unknown>;
    AccountProfileInfo?: Record<string, unknown>;
    GuildInfo?: Record<string, unknown>;
    captainBasicInfo?: Record<string, unknown>;
    petInfo?: Record<string, unknown>;
    socialinfo?: Record<string, unknown>;
    creditScoreInfo?: Record<string, unknown>;
  } | null;
};

const matches = [
  ["Clutch 1vs4 Insane", "NEXY CUP #11", "18:47", "WIN"],
  ["Rush Squad Wipe", "NEXY CUP #11", "15:32", "WIN"],
  ["Full Gameplay", "NEXY CUP #10", "22:10", "TOP 3"],
  ["Highlights #7", "Entraînement", "12:05", "WIN"]
] as const;

const GlobeIcon = Globe2;
const freeFireRankScale = [
  { name: "Bronze", subLabel: "I-III", threshold: 1000, next: 1300, nextName: "Argent", gradient: "from-[#8c4b24] via-[#d27a3a] to-[#5b2a16]" },
  { name: "Argent", subLabel: "I-III", threshold: 1300, next: 1600, nextName: "Or", gradient: "from-[#8b98a8] via-[#f5f7fb] to-[#56616e]" },
  { name: "Or", subLabel: "I-IV", threshold: 1600, next: 2100, nextName: "Platine", gradient: "from-[#a66b00] via-[#ffd166] to-[#6f4200]" },
  { name: "Platine", subLabel: "I-IV", threshold: 2100, next: 2600, nextName: "Diamant", gradient: "from-[#0f766e] via-[#67e8f9] to-[#134e4a]" },
  { name: "Diamant", subLabel: "I-IV", threshold: 2600, next: 3200, nextName: "Heroique", gradient: "from-[#1d4ed8] via-[#93c5fd] to-[#111827]" },
  { name: "Heroique", subLabel: "Elite", threshold: 3200, next: 3500, nextName: "Maitre", gradient: "from-[#7f1d1d] via-[#ef4444] to-[#111827]" },
  { name: "Maitre", subLabel: "Elite", threshold: 3500, next: 4000, nextName: "Grand Maitre", gradient: "from-[#7c2d12] via-[#f97316] to-[#450a0a]" },
  { name: "Grand Maitre", subLabel: "Top global", threshold: 4000, next: null, nextName: "Top classement", gradient: "from-[#581c87] via-[#facc15] to-[#0f172a]" }
] as const;

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [session, setSession] = useState<LocalSession>({ token: null, name: "NEXY_GAMER", avatar: null, email: null });
  const [freeFireProfile, setFreeFireProfile] = useState<StoredFreeFireProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [likesStatus, setLikesStatus] = useState<string | null>(null);
  const [likesLoading, setLikesLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    const storedToken = localStorage.getItem("nexy_sanctum_token");
    const storedName = localStorage.getItem("nexy_google_name") || "NEXY_GAMER";
    const storedAvatar = localStorage.getItem("nexy_google_avatar");
    const storedFreeFire = readStoredFreeFireProfile();
    const clerkFreeFire = user?.unsafeMetadata?.free_fire as StoredFreeFireProfile | null | undefined;
    const activeFreeFire = storedFreeFire ?? clerkFreeFire ?? null;

	    setFreeFireProfile(activeFreeFire);

	    if (shouldRefreshFreeFireProfile(activeFreeFire) && activeFreeFire?.uid && activeFreeFire.region) {
	      getFreeFireProfile(activeFreeFire.uid, activeFreeFire.region)
	        .then((freshProfile) => {
	          localStorage.setItem("astral_freefire_profile", JSON.stringify(freshProfile));
	          setFreeFireProfile(freshProfile);
	        })
	        .catch(() => undefined);
	    }

    if (!storedToken) {
      if (isSignedIn && user) {
        setSession({
          token: "clerk",
	          name: cleanPlayerName(activeFreeFire?.nickname) ?? user.fullName ?? user.username ?? storedName,
	          avatar: user.imageUrl ?? storedAvatar ?? activeFreeFire?.outfit_url ?? null,
          email: user.primaryEmailAddress?.emailAddress ?? null
        });
      } else {
        setSession({ token: null, name: storedName, avatar: storedAvatar, email: null });
      }
      setLoading(false);
      return;
    }

    setSession({ token: storedToken, name: storedName, avatar: storedAvatar, email: null });

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
  }, [isLoaded, isSignedIn, user]);

  async function handleDisconnect() {
    if (session.token && session.token !== "clerk") {
      await disconnectGoogle(session.token).catch(() => undefined);
    }
    if (isSignedIn) {
      await signOut().catch(() => undefined);
    }
    localStorage.removeItem("nexy_sanctum_token");
    localStorage.removeItem("nexy_google_name");
    localStorage.removeItem("nexy_google_avatar");
    localStorage.removeItem("astral_favorite_game");
    localStorage.removeItem("astral_freefire_profile");
    setProfile(null);
    setFreeFireProfile(null);
    setSession({ token: null, name: "NEXY_GAMER", avatar: null, email: null });
  }

  async function handleLikesRequest() {
    if (!freeFireProfile?.uid || !freeFireProfile.region) {
      setLikesStatus("ID Free Fire introuvable.");
      return;
    }

    setLikesLoading(true);
    setLikesStatus(null);

    try {
      const payload = await requestFreeFireLikes(freeFireProfile.uid, freeFireProfile.region, 100);
      setLikesStatus(payload.message ?? "Commande de 100 likes prête.");
    } catch (error) {
      setLikesStatus(error instanceof Error ? error.message : "Commande de likes impossible.");
    } finally {
      setLikesLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-[#111827]">
        <SiteHeader />
        <section className="w-full px-4 py-10 sm:px-6">
          <div className="rounded-lg border border-[#ececf3] bg-white p-8 shadow-[0_18px_45px_rgba(16,24,40,.07)]">
            <p className="text-xs font-black uppercase text-[#e52b2f]">Profil joueur</p>
            <h1 className="mt-3 text-3xl font-black tracking-normal">Chargement du profil...</h1>
          </div>
        </section>
      </main>
    );
  }

  if (!session.token && !loading) {
    return (
      <main className="min-h-screen bg-white text-[#111827]">
        <SiteHeader />
        <section className="w-full px-4 py-10 sm:px-6">
          <div className="rounded-lg border border-[#ececf3] bg-white p-8 shadow-[0_18px_45px_rgba(16,24,40,.07)]">
            <p className="text-xs font-black uppercase text-[#e52b2f]">Profil joueur</p>
            <h1 className="mt-3 text-4xl font-black tracking-normal">Connecte ton compte Google</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5b6170]">Une fois connecté, ton profil joueur apparaîtra dans la navbar à la place du bouton Connexion.</p>
            <div className="mt-6 max-w-[300px]">
              <GoogleAuthButton />
            </div>
          </div>
        </section>
      </main>
    );
  }

  const accountAvatar = usableAccountImage(session.avatar);
  const avatar = accountAvatar ?? usableImage(freeFireProfile?.outfit_url, "avatar");
  const banner = usableImage(freeFireProfile?.banner_url, "banner") ?? accountAvatar;
  const name = cleanPlayerName(freeFireProfile?.nickname) ?? session.name ?? "NEXY_GAMER";
  const playerUid = freeFireProfile?.uid ?? "246810357";
  const rankPoints = numberFrom(freeFireProfile?.br_rank_points) ?? 0;
  const csRankPoints = numberFrom(freeFireProfile?.cs_rank_points) ?? 0;
  const brRank = getFreeFireRank(rankPoints);
  const csRank = getFreeFireRankByCode(numberFrom(freeFireProfile?.rank?.cs), csRankPoints);
  const email = session.email ?? profile?.google?.email ?? "Compte Google connecté";
  const accountInfo = freeFireProfile?.account?.AccountInfo;
  const profileInfo = freeFireProfile?.account?.AccountProfileInfo;
  const guildInfo = freeFireProfile?.guild ?? freeFireProfile?.account?.GuildInfo;
  const socialInfo = freeFireProfile?.account?.socialinfo;
  const creditScore = valueFrom(freeFireProfile?.account?.creditScoreInfo, "creditScore");
  const equippedOutfit = Array.isArray(profileInfo?.EquippedOutfit) ? profileInfo.EquippedOutfit.length : null;
  const equippedSkills = Array.isArray(profileInfo?.EquippedSkills) ? profileInfo.EquippedSkills.length / 4 : null;
  const realStats = [
    ["NIVEAU", displayValue(freeFireProfile?.level), "Compte", Trophy],
    ["LIKES", displayValue(freeFireProfile?.likes), "Garena", Heart],
    ["POINTS BR", displayValue(freeFireProfile?.br_rank_points), "Battle Royale", Crown],
    ["POINTS CS", displayValue(freeFireProfile?.cs_rank_points), "Clash Squad", Swords],
    ["SCORE CRÉDIT", displayValue(creditScore), "Fair-play", Shield]
  ] as const;
  const realQuickStats = [
    ["Région", (freeFireProfile?.region ?? valueFrom(accountInfo, "AccountRegion") ?? "N/A").toString().toUpperCase(), GlobeIcon],
    ["Saison", displayValue(valueFrom(accountInfo, "AccountSeasonId")), CalendarDays],
    ["Badges BP", displayValue(valueFrom(accountInfo, "AccountBPBadges")), Medal],
    ["Tenue équipée", equippedOutfit ? `${equippedOutfit} éléments` : "N/A", Shield],
    ["Compétences", equippedSkills ? `${equippedSkills} slots` : "N/A", Zap]
  ] as const;
  const realActivities = [
    `Dernière connexion Free Fire : ${formatUnix(valueFrom(accountInfo, "AccountLastLogin"))}`,
    `Compte créé le ${formatUnix(valueFrom(accountInfo, "AccountCreateTime"))}`,
    `Version active : ${displayValue(valueFrom(accountInfo, "ReleaseVersion"))}`,
    `Préférence de mode : ${displayValue(valueFrom(socialInfo, "ModePreference"))}`,
    `Signature : ${displayValue(valueFrom(socialInfo, "AccountSignature"))}`
  ];
  const rankProgress = `${Math.min(Math.max(brRank.progress, 8), 100)}%`;
  const earnedRankBadges = getEarnedRankBadges(rankPoints);

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />

      <section className="w-full px-3 py-5 sm:px-5">
        <section className="relative overflow-hidden rounded-lg border border-[#1f2937] bg-black text-white shadow-[0_24px_60px_rgba(0,0,0,.22)]">
          {banner ? (
            <>
              <img src={banner} alt="" className="absolute right-0 top-1/2 h-[150%] w-[58%] -translate-y-1/2 object-cover opacity-35 blur-[1px] saturate-125" />
              <img src={banner} alt="" className="absolute right-[18%] top-1/2 h-[78%] w-auto -translate-y-1/2 rounded-full object-cover opacity-15 blur-2xl" />
            </>
          ) : (
            <img src="https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1600&q=80" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 grayscale" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/88 to-black/48" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35" />
          <div className="relative grid min-h-[340px] gap-6 p-8 lg:grid-cols-[1fr_310px]">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="grid h-40 w-40 shrink-0 place-items-center rounded-full border-[6px] border-[#e52b2f] bg-white/10 shadow-[0_20px_50px_rgba(229,43,47,.25)]">
                {avatar ? <img src={avatar} alt="" className="h-[136px] w-[136px] rounded-full object-cover" /> : <AvatarFallback name={name} size="large" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black tracking-normal">{name}</h1>
                  <CheckCircle2 className="h-6 w-6 fill-[#e52b2f] text-white" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-white/78">
                  <span className="rounded border border-[#e52b2f] bg-[#e52b2f] px-3 py-1 text-xs font-black text-white">JOUEUR PRO</span>
                  <span>ID: {playerUid}</span>
                  <Copy className="h-4 w-4" />
                </div>
                <p className="mt-4 text-sm font-semibold text-white/78">Joueur Free Fire • Créateur de contenu • Compétiteur</p>
                <p className="mt-2 flex flex-wrap gap-4 text-sm text-white/70"><span>📍 Lomé, Togo</span><span>📅 Membre depuis mars 2023</span><span>{email}</span></p>
                <div className="mt-6 flex flex-wrap gap-3">
	                  <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#e52b2f] px-5 text-sm font-black text-white"><Edit3 className="h-4 w-4" /> MODIFIER LE PROFIL</button>
	                  <button className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"><Share2 className="h-4 w-4" /> PARTAGER PROFIL</button>
		                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setProfileMenuOpen((current) => !current)}
                      className="grid h-11 w-11 place-items-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/15"
                      aria-label="Options du profil"
                      aria-expanded={profileMenuOpen}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {profileMenuOpen ? (
                      <div className="absolute bottom-[52px] left-0 z-50 w-[310px] overflow-hidden rounded-lg border border-white/15 bg-[#0a0f18] py-2 text-sm font-black text-white shadow-[0_18px_44px_rgba(0,0,0,.42)]">
                        <button type="button" className="flex h-11 w-full items-center gap-3 whitespace-nowrap px-4 text-left transition hover:bg-white/10">
                          <Edit3 className="h-4 w-4 text-[#ff5961]" />
                          Changer photo de la bannière
                        </button>
                        <button type="button" className="flex h-11 w-full items-center gap-3 whitespace-nowrap px-4 text-left transition hover:bg-white/10">
                          <Edit3 className="h-4 w-4 text-[#ff5961]" />
                          Modifier photo de profil
                        </button>
                        <button type="button" onClick={handleDisconnect} className="flex h-11 w-full items-center gap-3 whitespace-nowrap border-t border-white/10 px-4 text-left text-[#ff5961] transition hover:bg-white/10">
                          <LogOut className="h-4 w-4" />
                          Déconnecté
                        </button>
                      </div>
                    ) : null}
	                  </div>
	                </div>
	                {likesStatus ? <p className="mt-3 max-w-xl rounded-lg border border-white/12 bg-white/10 px-4 py-3 text-sm font-bold text-white/80">{likesStatus}</p> : null}
	              </div>
            </div>

            <aside className="relative overflow-hidden rounded-lg border border-white/15 bg-[#080b10]/82 p-5 shadow-[0_20px_48px_rgba(0,0,0,.35)] backdrop-blur">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(229,43,47,.16),transparent_35%),linear-gradient(135deg,rgba(255,255,255,.08),transparent_45%)]" />
              <div className="relative">
                <p className="text-xs font-black uppercase text-white/58">RANG ACTUEL BR</p>
                <div className="mt-4 flex items-center gap-4">
                  <RankEmblem rank={brRank} />
                  <div>
                    <h2 className="text-2xl font-black uppercase">{brRank.name}</h2>
                    <p className="text-lg font-black uppercase text-[#ff313d]">{brRank.subLabel}</p>
                    <p className="mt-2 text-sm font-bold text-white/72">🏆 {displayValue(rankPoints)} PTS</p>
                  </div>
                </div>
                <div className="mt-5 h-2 rounded-full bg-white/14">
                  <div className="h-2 rounded-full bg-[#ff2532]" style={{ width: rankProgress }} />
                </div>
                <div className="mt-2 flex justify-between gap-3 text-xs font-bold text-white/60">
                  <span>Prochain rang : <b className="text-[#ff5961]">{brRank.nextName}</b></span>
                  <span>{brRank.remainingText}</span>
                </div>
                <div className="mt-4 rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-xs font-bold text-white/70">
                  Rang CS : <b className="text-white">{csRank.name}</b> · {displayValue(csRankPoints)} pts
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.62fr_.8fr_.9fr]">
          <Panel title="STATISTIQUES PRINCIPALES" action="Saison actuelle">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
	              {realStats.map(([label, value, detail, Icon]) => (
	                <div key={label} className="rounded-lg border border-[#ececf3] bg-white p-4 text-center shadow-[0_10px_24px_rgba(16,24,40,.04)]">
	                  <Icon className="mx-auto h-7 w-7 text-[#e52b2f]" />
	                  <p className="mt-3 text-[11px] font-black text-[#6b7280]">{label}</p>
	                  <b className="mt-2 block text-2xl">{value}</b>
	                  <span className="mt-2 block text-xs font-black text-[#e52b2f]">{detail}</span>
	                </div>
	              ))}
            </div>
          </Panel>

          <Panel title="APERÇU RAPIDE">
            <div className="space-y-3">
	              {realQuickStats.map(([label, value, Icon]) => (
	                <div key={label} className="grid grid-cols-[22px_1fr_auto] items-center gap-2 border-b border-[#f0f1f5] pb-2 text-sm">
                  <Icon className="h-4 w-4 text-[#e52b2f]" />
                  <span className="font-semibold text-[#4b5563]">{label}</span>
                  <b className="text-right text-xs">{value}</b>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="GUILDE ACTUELLE">
            <div className="relative overflow-hidden rounded-lg border border-[#1f2937] bg-[#0a0f18] p-4 text-white shadow-[0_14px_34px_rgba(0,0,0,.16)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(229,43,47,.22),transparent_30%),linear-gradient(135deg,rgba(255,255,255,.08),transparent_42%)]" />
              <div className="relative flex gap-4">
                <GuildEmblem />
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black uppercase">{displayValue(valueFrom(guildInfo, "GuildName"))} <span className="rounded bg-[#e52b2f] px-2 py-1 text-[10px] text-white">GUILDE</span></h3>
                  <p className="mt-2 text-xs text-white/62">ID Guilde: {displayValue(valueFrom(guildInfo, "GuildID"))}</p>
                  <p className="mt-1 text-xs text-white/62">Membres: {displayValue(valueFrom(guildInfo, "GuildMember"))} / {displayValue(valueFrom(guildInfo, "GuildCapacity"))}</p>
                </div>
              </div>
              <div className="relative mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <span><small className="block text-xs text-white/48">NIVEAU GUILDE</small><b className="text-2xl">{displayValue(valueFrom(guildInfo, "GuildLevel"))}</b></span>
                <span><small className="block text-xs text-white/48">RÉGION</small><b>{(freeFireProfile?.region ?? "N/A").toString().toUpperCase()}</b></span>
              </div>
            </div>
          </Panel>

          <Panel title="ACTIVITÉ RÉCENTE" action="VOIR TOUT">
            <div className="space-y-3">
	              {realActivities.map((activity, index) => (
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
          <Panel title="BADGES DE RANG BR" action="VOIR TOUS">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              {earnedRankBadges.map((badge) => (
                <div key={badge.name} className="text-center">
                  <RankBadge badge={badge} />
                  <p className="mt-2 text-[10px] font-black uppercase text-[#4b5563]">{badge.name}</p>
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

function AvatarFallback({ name, size }: { name: string; size: "small" | "large" }) {
  return <span className={`grid place-items-center rounded-full bg-[#e52b2f] font-black text-white ${size === "large" ? "h-[136px] w-[136px] text-5xl" : "h-11 w-11 text-sm"}`}>{name.slice(0, 1).toUpperCase()}</span>;
}

function RankEmblem({ rank }: { rank: ReturnType<typeof getFreeFireRank> }) {
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center">
      <div className={`absolute inset-2 rotate-45 rounded-[18px] border border-white/20 bg-gradient-to-br ${rank.gradient} shadow-[0_0_28px_rgba(229,43,47,.42)]`} />
      <div className="absolute inset-5 rotate-45 rounded-[12px] border border-white/20 bg-black/45" />
      <Crown className="relative h-14 w-14 fill-white/12 text-white drop-shadow-[0_0_12px_rgba(255,255,255,.30)]" />
      <Star className="absolute bottom-2 right-3 h-5 w-5 fill-[#ffd166] text-[#ffd166]" />
    </div>
  );
}

function GuildEmblem() {
  return (
    <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/45 shadow-[0_12px_28px_rgba(229,43,47,.20)]">
      <div className="absolute inset-2 rotate-45 rounded-xl bg-gradient-to-br from-[#ff2532] via-[#58111a] to-[#111827]" />
      <Shield className="relative h-12 w-12 fill-white/8 text-white drop-shadow-[0_0_12px_rgba(255,255,255,.25)]" />
      <Swords className="absolute bottom-2 right-2 h-5 w-5 text-[#ff5961]" />
    </div>
  );
}

function RankBadge({ badge }: { badge: { name: string; gradient: string } }) {
  return (
    <div className="relative mx-auto grid h-16 w-16 place-items-center">
      <div className={`absolute inset-1 rotate-45 rounded-xl border border-white/30 bg-gradient-to-br ${badge.gradient} shadow-[0_8px_22px_rgba(0,0,0,.20)]`} />
      <div className="absolute inset-4 rotate-45 rounded-md bg-black/25" />
      <Crown className="relative h-8 w-8 fill-white/12 text-white drop-shadow-[0_0_8px_rgba(255,255,255,.28)]" />
      <Star className="absolute bottom-1 right-1 h-4 w-4 fill-[#ffd166] text-[#ffd166]" />
    </div>
  );
}

function readStoredFreeFireProfile(): StoredFreeFireProfile | null {
  try {
    const raw = localStorage.getItem("astral_freefire_profile");
    return raw ? JSON.parse(raw) as StoredFreeFireProfile : null;
  } catch {
    return null;
  }
}

function shouldRefreshFreeFireProfile(profile: StoredFreeFireProfile | null) {
  if (!profile?.uid || !profile.region) {
    return false;
  }

  return !profile.account || !profile.guild || !profile.br_rank_points;
}

function usableImage(url?: string | null, kind: "avatar" | "banner" = "avatar") {
  if (!url) return null;

  const decoded = decodeURIComponent(url).toLowerCase();

  if (decoded.includes("not found") || decoded.includes("hl%20gaming%20official") || decoded.includes("hl gaming official")) {
    return null;
  }

  if (kind === "avatar" && decoded.includes("/freefire-media/")) {
    return null;
  }

  return url;
}

function usableAccountImage(url?: string | null) {
  if (!url) return null;

  const decoded = decodeURIComponent(url).toLowerCase();

  if (decoded.includes("img.clerk.com") || decoded.includes("images.clerk.dev") || decoded.includes("avatar")) {
    return null;
  }

  return url;
}

function cleanPlayerName(name?: string | null) {
  if (!name) return null;

  const cleaned = name
    .replace(/[\u2000-\u200f\u2028-\u202f\u205f-\u206f\u3000]/g, " ")
    .replace(/[^\p{L}\p{N}\s._-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || name.trim() || null;
}

function valueFrom(source: Record<string, unknown> | null | undefined, key: string) {
  return source?.[key] as string | number | boolean | null | undefined;
}

function numberFrom(value: unknown) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/A";

  if (typeof value === "number") {
    return new Intl.NumberFormat("fr-FR").format(value);
  }

  return String(value);
}

function formatUnix(value: unknown) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(numeric * 1000));
}

function getFreeFireRank(points: number) {
  const rank = [...freeFireRankScale].reverse().find((item) => points >= item.threshold) ?? freeFireRankScale[0];
  const next = rank.next;
  const progress = next ? ((points - rank.threshold) / (next - rank.threshold)) * 100 : 100;

  return {
    ...rank,
    progress,
    remainingText: next ? `${Math.max(next - points, 0)} pts` : "Top"
  };
}

function getEarnedRankBadges(points: number) {
  return freeFireRankScale.filter((rank) => points >= rank.threshold);
}

function getFreeFireRankByCode(code: number | null, points: number) {
  if (!code) {
    return getFreeFireRank(points);
  }

  if (code >= 321) return { ...getFreeFireRank(4000), name: "Grand Maitre", subLabel: "CS" };
  if (code >= 320) return { ...getFreeFireRank(3500), name: "Maitre", subLabel: "CS" };
  if (code >= 319) return { ...getFreeFireRank(3200), name: "Heroique", subLabel: "CS" };
  if (code >= 315) return { ...getFreeFireRank(2600), name: "Diamant", subLabel: "CS" };
  if (code >= 311) return { ...getFreeFireRank(2100), name: "Platine", subLabel: "CS" };
  if (code >= 307) return { ...getFreeFireRank(1600), name: "Or", subLabel: "CS" };
  if (code >= 304) return { ...getFreeFireRank(1300), name: "Argent", subLabel: "CS" };

  return { ...getFreeFireRank(1000), name: "Bronze", subLabel: "CS" };
}
