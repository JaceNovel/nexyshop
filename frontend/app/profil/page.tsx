"use client";

import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { Activity, BarChart3, CalendarDays, Camera, CheckCircle2, Crown, DollarSign, Edit3, Eye, Gamepad2, Gift, Globe2, Heart, LogOut, Medal, MoreHorizontal, Play, Shield, Star, Swords, Trophy, UploadCloud, Users, X, Zap, type LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { disconnectGoogle, getFreeFireProfile, getGoogleProfile, getRecentYoutubeVideos, requestFreeFireLikes, type FortniteProfile, type PubgProfile, type RecentYoutubeVideo } from "@/lib/api";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { CountryFlag } from "@/components/country-flag";
import { CopyToClipboardButton, ShareProfileButton } from "@/components/share-profile-button";

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
type StoredPubgProfile = Partial<PubgProfile> & {
  account_id?: string;
  game_id?: string;
  name?: string;
  avatar_url?: string;
};
type StoredFortniteProfile = Partial<FortniteProfile> & {
  account_id?: string;
  name?: string;
  avatar_url?: string;
};
type StoredCodProfile = {
  username?: string | null;
  cod_username?: string | null;
  activision_id?: string | null;
  email?: string | null;
  has_codm_account?: boolean | null;
  avatar_url?: string | null;
  linked?: boolean | null;
  provider?: string | null;
  verification_status?: string | null;
  account?: {
    uno_id?: string | null;
    user_id?: string | null;
    country?: string | null;
    date_of_birth?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
  relationships?: Array<{
    platform?: string | null;
    platform_username?: string | null;
    platform_id?: string | null;
    connected?: boolean | null;
    linked_at?: string | null;
  }> | null;
  friend_feed?: Array<{
    id?: string | number | null;
    title?: string | null;
    description?: string | null;
    type?: string | null;
    date?: string | null;
  }> | null;
  auth?: {
    device_id?: string | null;
    token_expires_at?: string | number | null;
    session_expires_at?: string | number | null;
  } | null;
  fetched_at?: number | null;
};

const GlobeIcon = Globe2;
const freeFireRankImages: Record<string, string> = {
  bronze: "/freefire-media/20240515_142140-removebg-preview.png",
  argent: "/freefire-media/REVIEWTEKNO-RANK-FF-SILVER-removebg-preview.png",
  or: "/freefire-media/REVIEWTEKNO-RANK-FF-GOLD-removebg-preview.png",
  platine: "/freefire-media/20240515_142106-removebg-preview.png",
  diamant: "/freefire-media/diamond-removebg-preview.png",
  heroique: "/freefire-media/fREE_FIRE_PNG_DE_MESTRE-removebg-preview.png",
  maitre: "/freefire-media/319484208331211-removebg-preview.png",
  "grand maitre": "/freefire-media/319484208331211-removebg-preview.png"
};
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
  const [pubgProfile, setPubgProfile] = useState<StoredPubgProfile | null>(null);
  const [fortniteProfile, setFortniteProfile] = useState<StoredFortniteProfile | null>(null);
  const [codProfile, setCodProfile] = useState<StoredCodProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [likesStatus, setLikesStatus] = useState<string | null>(null);
  const [likesLoading, setLikesLoading] = useState(false);
  const [recentVideos, setRecentVideos] = useState<RecentYoutubeVideo[]>([]);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [customBanner, setCustomBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const storedToken = localStorage.getItem("nexy_sanctum_token");
    const storedName = localStorage.getItem("nexy_google_name") || "NEXY_GAMER";
    const storedAvatar = localStorage.getItem("nexy_google_avatar");
    setCustomAvatar(localStorage.getItem("astral_profile_avatar_override"));
    setCustomBanner(localStorage.getItem("astral_profile_banner_override"));
    const storedFreeFire = readStoredFreeFireProfile();
    const storedPubg = readStoredPubgProfile();
    const storedFortnite = readStoredFortniteProfile();
    const storedCod = readStoredCodProfile();
    const clerkFreeFire = user?.unsafeMetadata?.free_fire as StoredFreeFireProfile | null | undefined;
    const clerkPubg = user?.unsafeMetadata?.pubg as StoredPubgProfile | null | undefined;
    const clerkFortnite = user?.unsafeMetadata?.fortnite as StoredFortniteProfile | null | undefined;
    const clerkCod = user?.unsafeMetadata?.call_of_duty as StoredCodProfile | null | undefined;
    const activeFreeFire = storedFreeFire ?? clerkFreeFire ?? null;
    const activePubg = storedPubg ?? clerkPubg ?? null;
    const activeFortnite = storedFortnite ?? clerkFortnite ?? null;
    const activeCod = storedCod ?? clerkCod ?? null;

		    setFreeFireProfile(activeFreeFire);
		    setPubgProfile(activePubg);
		    setFortniteProfile(activeFortnite);
		    setCodProfile(activeCod);

    if (!storedToken) {
      if (isSignedIn && user) {
        setSession({
          token: "clerk",
		          name: cleanPlayerName(activeFreeFire?.nickname) ?? user.fullName ?? user.username ?? storedName,
		          avatar: user.imageUrl ?? storedAvatar ?? null,
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

  useEffect(() => {
    let active = true;

    getRecentYoutubeVideos()
      .then((payload) => {
        if (active) setRecentVideos(payload.data.slice(0, 4));
      })
      .catch(() => {
        if (active) setRecentVideos([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!freeFireProfile?.uid || !freeFireProfile.region) return;
    if (freeFireProfile.nickname && freeFireProfile.level !== undefined && freeFireProfile.likes !== undefined) return;

    let active = true;

    getFreeFireProfile(freeFireProfile.uid, freeFireProfile.region, { persistAsCurrentUser: true })
      .then((payload) => {
        if (!active) return;

        setFreeFireProfile(payload);
        setSession((current) => ({
          ...current,
          name: cleanPlayerName(payload.nickname) ?? current.name
        }));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [freeFireProfile?.uid, freeFireProfile?.region, freeFireProfile?.nickname, freeFireProfile?.level, freeFireProfile?.likes]);

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
    localStorage.removeItem("astral_profile_avatar_override");
    localStorage.removeItem("astral_profile_banner_override");
    localStorage.removeItem("astral_favorite_game");
    localStorage.removeItem("astral_freefire_profile");
    localStorage.removeItem("astral_pubg_profile");
    localStorage.removeItem("astral_fortnite_profile");
    localStorage.removeItem("astral_cod_profile");
    setProfile(null);
    setFreeFireProfile(null);
    setPubgProfile(null);
    setFortniteProfile(null);
    setCodProfile(null);
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

  async function handleProfileImageUpload(kind: "avatar" | "banner", file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;

    try {
      const value = await compressProfileImage(file, kind);

      if (kind === "avatar") {
        writeLocalStorageImage("astral_profile_avatar_override", value);
        setCustomAvatar(value);
      } else {
        writeLocalStorageImage("astral_profile_banner_override", value);
        setCustomBanner(value);
      }
      window.dispatchEvent(new Event("astral-profile-updated"));
    } catch {
      window.alert("Image trop lourde. Choisis une image plus légère ou réessaie avec une image moins grande.");
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
  const avatar = customAvatar ?? accountAvatar;
  const banner = customBanner ?? accountAvatar;
  const name = cleanPlayerName(freeFireProfile?.nickname) ?? session.name ?? "NEXY_GAMER";
  const playerUid = freeFireProfile?.uid ?? "246810357";
  const rankPoints = numberFrom(freeFireProfile?.br_rank_points) ?? 0;
  const csRankPoints = numberFrom(freeFireProfile?.cs_rank_points) ?? 0;
  const brRank = getFreeFireRank(rankPoints);
  const csRank = getFreeFireRankByCode(numberFrom(freeFireProfile?.rank?.cs), csRankPoints);
  const email = session.email ?? profile?.google?.email ?? "Email non disponible";
  const metadata = user?.unsafeMetadata as Record<string, unknown> | null | undefined;
  const game = metadata?.game ?? metadata?.favorite_game ?? (typeof window !== "undefined" ? localStorage.getItem("astral_favorite_game") : null);
  const country = (user?.unsafeMetadata as Record<string, unknown> | null | undefined)?.country;
  const isPubg = typeof game === "string" && game.trim().toLowerCase() === "pubg";
  const isFortnite = typeof game === "string" && game.trim().toLowerCase() === "fortnite";
  const isCod = typeof game === "string" && ["call_of_duty", "call of duty", "cod"].includes(game.trim().toLowerCase());
  const shareUsername =
    user?.username ??
    (typeof email === "string" && email.includes("@") ? email.split("@")[0] : null) ??
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const accountInfo = freeFireProfile?.account?.AccountInfo;
  const profileInfo = freeFireProfile?.account?.AccountProfileInfo;
  const guildInfo = freeFireProfile?.guild ?? freeFireProfile?.account?.GuildInfo;
  const socialInfo = freeFireProfile?.account?.socialinfo;
  const creditScore = valueFrom(freeFireProfile?.account?.creditScoreInfo, "creditScore");
  const isFreeFire =
    typeof game === "string" ? ["free fire", "freefire", "ff"].includes(game.trim().toLowerCase()) : true;
  const freeFireCreatedAt = isFreeFire ? valueFrom(accountInfo, "AccountCreateTime") : null;
  const memberSince = freeFireCreatedAt
    ? `Compte Free Fire créé le ${formatUnixDateTime(freeFireCreatedAt)}`
    : user?.createdAt
      ? `Membre depuis ${new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(user.createdAt))}`
      : null;
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

  if (isPubg && pubgProfile?.account_id) {
    return (
      <PubgProfileView
        profile={pubgProfile}
        session={session}
        email={email}
        country={typeof country === "string" ? country : null}
        avatar={customAvatar ?? usableAccountImage(session.avatar) ?? pubgProfile.avatar_url ?? null}
        banner={customBanner ?? pubgProfile.avatar_url ?? usableAccountImage(session.avatar)}
        onEdit={() => setEditProfileOpen(true)}
        onDisconnect={handleDisconnect}
        editOpen={editProfileOpen}
        onCloseEdit={() => setEditProfileOpen(false)}
        onUpload={handleProfileImageUpload}
      />
    );
  }

  if (isFortnite && fortniteProfile?.account_id) {
    return (
      <FortniteProfileView
        profile={fortniteProfile}
        session={session}
        email={email}
        country={typeof country === "string" ? country : null}
        avatar={customAvatar ?? usableAccountImage(session.avatar) ?? fortniteProfile.avatar_url ?? null}
        banner={customBanner ?? fortniteProfile.avatar_url ?? usableAccountImage(session.avatar)}
        onEdit={() => setEditProfileOpen(true)}
        onDisconnect={handleDisconnect}
        editOpen={editProfileOpen}
        onCloseEdit={() => setEditProfileOpen(false)}
        onUpload={handleProfileImageUpload}
      />
    );
  }

  if (isCod && codProfile?.username) {
    return (
      <CodProfileView
        profile={codProfile}
        session={session}
        email={email}
        country={typeof country === "string" ? country : null}
        avatar={customAvatar ?? usableAccountImage(session.avatar) ?? codProfile.avatar_url ?? null}
        banner={customBanner ?? codProfile.avatar_url ?? usableAccountImage(session.avatar)}
        onEdit={() => setEditProfileOpen(true)}
        onDisconnect={handleDisconnect}
        editOpen={editProfileOpen}
        onCloseEdit={() => setEditProfileOpen(false)}
        onUpload={handleProfileImageUpload}
      />
    );
  }

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
                  <CopyToClipboardButton value={playerUid} className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10" label="Copier l’ID" />
                </div>
                <p className="mt-4 text-sm font-semibold text-white/78">
                  Joueur {typeof game === "string" && game.trim() ? game.trim() : "Free Fire"} • Créateur de contenu • Compétiteur
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/70">
                  {typeof country === "string" && country.trim() ? (
                    <CountryFlag code={country} label={country} />
                  ) : null}
                  {memberSince ? <span>📅 {memberSince}</span> : null}
                  <span>{email}</span>
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
		                  <button type="button" onClick={() => setEditProfileOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#e52b2f] px-5 text-sm font-black text-white"><Edit3 className="h-4 w-4" /> MODIFIER LE PROFIL</button>
	                  <ShareProfileButton
                      username={shareUsername}
                      className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
                    />
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
	                        <button type="button" onClick={() => { setEditProfileOpen(true); setProfileMenuOpen(false); }} className="flex h-11 w-full items-center gap-3 whitespace-nowrap px-4 text-left transition hover:bg-white/10">
	                          <Edit3 className="h-4 w-4 text-[#ff5961]" />
	                          Changer photo de la bannière
	                        </button>
	                        <button type="button" onClick={() => { setEditProfileOpen(true); setProfileMenuOpen(false); }} className="flex h-11 w-full items-center gap-3 whitespace-nowrap px-4 text-left transition hover:bg-white/10">
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
	        {editProfileOpen ? (
		          <EditProfileModal
		            avatar={avatar}
		            banner={banner}
		            gameKind="free_fire"
		            onClose={() => setEditProfileOpen(false)}
		            onUpload={handleProfileImageUpload}
		          />
	        ) : null}
	
	        <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.62fr_.8fr_.9fr]">
          <Panel title="STATISTIQUES PRINCIPALES" action="Saison actuelle">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
	              {realStats.map(([label, value, detail, Icon], index) => (
	                <div key={label} className="relative overflow-hidden rounded-lg border border-[#ececf3] bg-white p-4 pt-6 text-center shadow-[0_10px_24px_rgba(16,24,40,.04)]">
                    <div className={`absolute inset-x-0 top-0 h-2 ${["bg-[#e52b2f]", "bg-[#ff5a66]", "bg-[#ffb703]", "bg-[#2563eb]", "bg-[#10b981]"][index]}`} />
                    <div className={`absolute inset-x-0 top-2 h-14 opacity-10 ${["bg-[#e52b2f]", "bg-[#ff5a66]", "bg-[#ffb703]", "bg-[#2563eb]", "bg-[#10b981]"][index]}`} />
	                  <Icon className="relative mx-auto h-7 w-7 text-[#e52b2f]" />
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

          <Panel title="MATCHS RÉCENTS" action="VOIR TOUS" actionHref="/replays">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recentVideos.length > 0 ? recentVideos.map((video) => {
                const href = video.url ?? video.watch_url ?? "/replays";
                const external = href.startsWith("http");

                return (
                <a key={video.youtube_video_id ?? video.slug ?? video.title} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="group block">
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-[#f3f4f6]">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full place-items-center bg-[#111827] text-xs font-black text-white/70">YOUTUBE</div>
                    )}
                    <span className="absolute left-2 top-2 rounded bg-[#e52b2f] px-2 py-1 text-[10px] font-black uppercase text-white">{video.category ?? "Replay"}</span>
                    <span className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] font-black text-[#111827] shadow">{formatDuration(video.duration_seconds)}</span>
                    <span className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-[10px] font-black text-[#111827] shadow"><Play className="inline h-3 w-3" /> Voir</span>
                  </div>
                  <h3 className="mt-2 line-clamp-1 text-sm font-black transition group-hover:text-[#e52b2f]">{video.title}</h3>
                  <p className="text-xs font-black text-[#e52b2f]">YouTube</p>
                  <p className="mt-1 text-xs text-[#6b7280]"><Eye className="inline h-3 w-3" /> {displayValue(video.views_count)} vues • {formatRelativeDate(video.published_at)}</p>
                </a>
                );
              }) : (
                <div className="col-span-full rounded-lg border border-dashed border-[#e5e7eb] bg-[#f9fafb] p-6 text-center text-sm font-semibold text-[#6b7280]">
                  Aucune vidéo YouTube synchronisée pour le moment.
                </div>
              )}
            </div>
          </Panel>
        </section>
      </section>
    </main>
  );
}

function PubgProfileView({
  profile,
  session,
  email,
  country,
  avatar,
  banner,
  onEdit,
  onDisconnect,
  editOpen,
  onCloseEdit,
  onUpload
}: {
  profile: StoredPubgProfile;
  session: LocalSession;
  email: string;
  country: string | null;
  avatar: string | null;
  banner: string | null | undefined;
  onEdit: () => void;
  onDisconnect: () => void;
  editOpen: boolean;
  onCloseEdit: () => void;
  onUpload: (kind: "avatar" | "banner", file: File | null) => void;
}) {
  const name = cleanPlayerName(profile.name) ?? session.name ?? "PUBG_PLAYER";
  const highlights = profile.highlights ?? { matches: 0, wins: 0, kills: 0, assists: 0, damage: 0, top10s: 0, longestKill: 0 };
  const rank = profile.rank ?? { label: "Bronze", tier: "Synchronise ton compte", score: 0, progress: 8 };
  const kd = highlights.matches > 0 ? (highlights.kills / Math.max(highlights.matches - highlights.wins, 1)).toFixed(2) : "0.00";
  const averageDamage = highlights.matches > 0 ? Math.round(highlights.damage / highlights.matches) : 0;
  const recentMatches = (profile.recent_matches ?? []).slice(0, 5);
  const playerId = profile.account_id ?? profile.game_id ?? "N/A";

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />
      <section className="w-full px-3 py-5 sm:px-5">
        <section className="relative overflow-hidden rounded-lg border border-[#111827] bg-[#070b12] text-white shadow-[0_24px_60px_rgba(0,0,0,.22)]">
          {banner ? <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-18" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(110deg,#070b12_0%,rgba(7,11,18,.96)_42%,rgba(229,43,47,.34)_100%)]" />
          <div className="relative grid min-h-[330px] gap-6 p-7 lg:grid-cols-[1fr_340px]">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="grid h-36 w-36 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/8 shadow-[0_20px_46px_rgba(229,43,47,.16)]">
                {avatar ? <img src={avatar} alt="" className="h-28 w-28 rounded-lg object-cover" /> : <AvatarFallback name={name} size="large" />}
              </div>
              <div>
                <p className="text-xs font-black uppercase text-[#ff5961]">Compte PUBG synchronisé</p>
                <h1 className="mt-2 text-4xl font-black tracking-normal">{name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-white/75">
                  <span className="rounded bg-[#ff2532] px-3 py-1 text-xs font-black text-white">PUBG</span>
                  <span>{profile.platform ?? "steam"}</span>
                  <span>ID: {playerId}</span>
                  <CopyToClipboardButton value={playerId} className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10" label="Copier l’ID" />
                </div>
                <p className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/70">
                  {country ? <CountryFlag code={country} label={country} /> : null}
                  <span>{email}</span>
                  <span>{recentMatches.length} matchs récents trouvés</span>
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={onEdit} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#ff2532] px-5 text-sm font-black text-white"><Edit3 className="h-4 w-4" /> MODIFIER LE PROFIL</button>
                  <a href="/pubg" className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"><BarChart3 className="h-4 w-4" /> PUBG HUB</a>
                  <button type="button" onClick={onDisconnect} className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-black text-white/80"><LogOut className="h-4 w-4" /> Déconnecté</button>
                </div>
              </div>
            </div>
            <aside className="relative overflow-hidden rounded-lg border border-white/15 bg-black/38 p-5 shadow-[0_20px_48px_rgba(0,0,0,.26)]">
              <p className="text-xs font-black uppercase text-white/58">Grade PUBG</p>
              <div className="mt-5 flex items-center gap-4">
                <span className="grid h-24 w-24 place-items-center rounded-lg bg-[linear-gradient(135deg,#ff2532,#facc15,#111827)] text-4xl font-black text-white shadow-[0_16px_34px_rgba(255,37,50,.28)]">{rank.label.slice(0, 1)}</span>
                <div>
                  <h2 className="text-3xl font-black uppercase">{rank.label}</h2>
                  <p className="mt-1 text-sm font-bold text-white/70">{rank.tier}</p>
                  <p className="mt-2 text-sm font-black text-[#ff5961]">{displayValue(rank.score)} pts</p>
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-white/14">
                <div className="h-2 rounded-full bg-[#ff2532]" style={{ width: `${Math.min(Math.max(rank.progress, 8), 100)}%` }} />
              </div>
            </aside>
          </div>
        </section>

        {editOpen ? <EditProfileModal avatar={avatar} banner={banner ?? avatar} gameKind="pubg" onClose={onCloseEdit} onUpload={onUpload} /> : null}

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.8fr]">
          <Panel title="STATISTIQUES PUBG" action="Lifetime">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {([
                ["MATCHS", highlights.matches, Trophy],
                ["VICTOIRES", highlights.wins, Crown],
                ["KILLS", highlights.kills, Swords],
                ["K/D", kd, Activity],
                ["DÉGÂTS/MATCH", averageDamage, Zap],
                ["TOP 10", highlights.top10s, Medal]
              ] as Array<[string, string | number, LucideIcon]>).map(([label, value, Icon]) => (
                <div key={String(label)} className="rounded-lg border border-[#ececf3] bg-white p-4 text-center shadow-[0_10px_24px_rgba(16,24,40,.04)]">
                  <Icon className="mx-auto h-6 w-6 text-[#ff2532]" />
                  <p className="mt-3 text-[10px] font-black text-[#6b7280]">{label}</p>
                  <b className="mt-2 block text-xl">{displayValue(value)}</b>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="ACCÈS PUBG">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["/pubg/historique", "Historique des matchs", "Derniers matchs, cartes et participants"],
                ["/pubg/classement", "Classement TOP 500", "Par saison, région et mode de jeu"],
                ["/pubg/match", "Chercher un match", "Kills, dégâts, équipes et placement"],
                ["/pubg/comparateur", "Comparateur joueur", "Stats côte à côte"]
              ].map(([href, title, text]) => (
                <a key={href} href={href} className="rounded-lg border border-[#ececf3] bg-[#fbfcff] p-4 transition hover:border-[#ff2532] hover:shadow-[0_12px_28px_rgba(16,24,40,.08)]">
                  <p className="text-sm font-black text-[#111827]">{title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#667085]">{text}</p>
                </a>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5">
          <Panel title="DERNIERS MATCHS PUBG" action="VOIR TOUT" actionHref="/pubg/historique">
            <div className="grid gap-3 md:grid-cols-5">
              {recentMatches.length ? recentMatches.map((matchId) => (
                <a key={matchId} href={`/pubg/match?id=${encodeURIComponent(matchId)}`} className="rounded-lg border border-[#ececf3] bg-[#070b12] p-4 text-white transition hover:-translate-y-0.5">
                  <p className="text-[10px] font-black uppercase text-[#ff5961]">Match ID</p>
                  <p className="mt-2 truncate font-mono text-xs font-black">{matchId}</p>
                </a>
              )) : (
                <div className="rounded-lg border border-dashed border-[#d7dce5] bg-[#fbfcff] p-6 text-sm font-semibold text-[#667085] md:col-span-5">Aucun match récent retourné par PUBG pour le moment.</div>
              )}
            </div>
          </Panel>
        </section>
      </section>
    </main>
  );
}

function CodProfileView({
  profile,
  session,
  email,
  country,
  avatar,
  banner,
  onEdit,
  onDisconnect,
  editOpen,
  onCloseEdit,
  onUpload
}: {
  profile: StoredCodProfile;
  session: LocalSession;
  email: string;
  country: string | null;
  avatar: string | null;
  banner: string | null | undefined;
  onEdit: () => void;
  onDisconnect: () => void;
  editOpen: boolean;
  onCloseEdit: () => void;
  onUpload: (kind: "avatar" | "banner", file: File | null) => void;
}) {
  const name = cleanPlayerName(profile.username) ?? session.name ?? "COD_PLAYER";
  const codUsername = profile.cod_username ?? profile.username ?? profile.activision_id ?? "N/A";
  const activisionId = profile.activision_id ?? (profile.has_codm_account ? codUsername : "En attente");
  const createdAt = profile.account?.created_at ?? (profile.fetched_at ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(profile.fetched_at)) : "En attente");
  const accountMode = profile.has_codm_account ? "Compte CODM existant" : "Nouveau profil CODM";
  const verificationStatus = profile.verification_status === "pending_api_verification" ? "Vérification en attente" : profile.linked ? "Compte lié" : "Profil créé";
  const relationships = Array.isArray(profile.relationships) ? profile.relationships.filter(Boolean) : [];
  const friendFeed = Array.isArray(profile.friend_feed) ? profile.friend_feed.filter(Boolean).slice(0, 6) : [];
  const accountDetails = [
    ["UNO ID", profile.account?.uno_id],
    ["User ID", profile.account?.user_id],
    ["Pays COD", profile.account?.country],
    ["Date de naissance", profile.account?.date_of_birth],
    ["Créé le", profile.account?.created_at],
    ["Mis à jour", profile.account?.updated_at],
    ["Expiration session", profile.auth?.session_expires_at],
    ["Expiration token", profile.auth?.token_expires_at]
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />
      <section className="w-full px-3 py-5 sm:px-5">
        <section className="relative overflow-hidden rounded-lg border border-[#111827] bg-[#080a0f] text-white shadow-[0_24px_60px_rgba(0,0,0,.22)]">
          {banner ? <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-16" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(110deg,#080a0f_0%,rgba(8,10,15,.94)_48%,rgba(37,99,235,.28)_100%)]" />
          <div className="relative grid min-h-[320px] gap-6 p-7 lg:grid-cols-[1fr_330px]">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="grid h-36 w-36 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/8 shadow-[0_20px_46px_rgba(37,99,235,.18)]">
                {avatar ? <img src={avatar} alt="" className="h-28 w-28 rounded-lg object-cover" /> : <AvatarFallback name={name} size="large" />}
              </div>
              <div>
                <p className="text-xs font-black uppercase text-[#60a5fa]">Compte Call of Duty lié</p>
                <h1 className="mt-2 text-4xl font-black tracking-normal">{name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-white/75">
                  <span className="rounded bg-[#2563eb] px-3 py-1 text-xs font-black text-white">CALL OF DUTY</span>
                  <span>Pseudo COD: {codUsername}</span>
                  <CopyToClipboardButton value={codUsername} className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10" label="Copier le pseudo" />
                </div>
                <p className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/70">
                  {country ? <CountryFlag code={country} label={country} /> : null}
                  <span>{email}</span>
                  <span>Statut: {verificationStatus}</span>
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={onEdit} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#2563eb] px-5 text-sm font-black text-white"><Edit3 className="h-4 w-4" /> MODIFIER LE PROFIL</button>
                  <button type="button" onClick={onDisconnect} className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-black text-white/80"><LogOut className="h-4 w-4" /> Déconnecté</button>
                </div>
              </div>
            </div>
            <aside className="relative overflow-hidden rounded-lg border border-white/15 bg-black/38 p-5 shadow-[0_20px_48px_rgba(0,0,0,.26)]">
              <p className="text-xs font-black uppercase text-white/58">Identité Astral4Gamer</p>
              <div className="mt-5 flex items-center gap-4">
                <img src="/e2fa10ef-9138-42dd-a2a1-3a6eb8e60ec1-profile_image-300x300-removebg-preview.png" alt="" className="h-32 w-32 shrink-0 object-contain drop-shadow-[0_16px_34px_rgba(229,43,47,.24)]" />
                <div className="min-w-0">
                  <div className="grid gap-2 text-sm font-bold text-white/76">
                    <p className="truncate"><span className="text-white/48">Pseudo:</span> {name}</p>
                    <p className="truncate"><span className="text-white/48">Activision ID:</span> {activisionId}</p>
                    <p className="truncate"><span className="text-white/48">Création:</span> {createdAt}</p>
                  </div>
                  <p className="mt-3 text-xs font-bold text-[#93c5fd]">{verificationStatus}</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {editOpen ? <EditProfileModal avatar={avatar} banner={banner ?? avatar} gameKind="codm" onClose={onCloseEdit} onUpload={onUpload} /> : null}

        <section className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <Panel title="DONNÉES CALL OF DUTY">
            <div className="space-y-3">
              {([
                ["Pseudo", name, Gamepad2],
                ["ID Activision", activisionId, Shield],
                ["Date de création", createdAt, CalendarDays],
                ["Type de compte", accountMode, Users],
                ["Fournisseur", profile.provider ?? "Activision", GlobeIcon],
                ["Statut", verificationStatus, CheckCircle2]
              ] as Array<[string, string, LucideIcon]>).map(([label, value, Icon]) => (
                <div key={String(label)} className="grid grid-cols-[22px_1fr_auto] items-center gap-2 border-b border-[#f0f1f5] pb-2 text-sm">
                  <Icon className="h-4 w-4 text-[#2563eb]" />
                  <span className="font-semibold text-[#4b5563]">{label}</span>
                  <b className="max-w-[180px] truncate text-right text-xs">{String(value)}</b>
                </div>
              ))}
            </div>
          </Panel>

          {accountDetails.length ? (
            <Panel title="DÉTAILS DU COMPTE">
              <div className="grid gap-3 md:grid-cols-2">
                {accountDetails.map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-[#ececf3] bg-[#fbfcff] p-3">
                    <p className="text-[10px] font-black uppercase text-[#667085]">{label}</p>
                    <b className="mt-1 block truncate text-sm text-[#111827]">{String(value)}</b>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </section>

        {relationships.length ? (
          <section className="mt-5">
            <Panel title="PLATEFORMES LIÉES">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {relationships.map((relationship, index) => (
                  <div key={`${relationship.platform ?? "platform"}-${index}`} className="rounded-lg border border-[#ececf3] bg-white p-4 shadow-[0_10px_24px_rgba(16,24,40,.04)]">
                    <p className="text-[10px] font-black uppercase text-[#2563eb]">{relationship.platform ?? "Plateforme"}</p>
                    <h3 className="mt-2 truncate text-sm font-black">{relationship.platform_username ?? relationship.platform_id ?? "Compte lié"}</h3>
                    <p className="mt-2 text-xs font-semibold text-[#667085]">{relationship.connected === false ? "Non connecté" : "Connecté"}</p>
                    {relationship.linked_at ? <p className="mt-1 text-[11px] font-bold text-[#98a2b3]">{relationship.linked_at}</p> : null}
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        ) : null}

        {friendFeed.length ? (
          <section className="mt-5">
            <Panel title="ACTIVITÉ CALL OF DUTY">
              <div className="space-y-3">
                {friendFeed.map((event, index) => (
                  <div key={String(event.id ?? index)} className="grid gap-1 rounded-lg border border-[#ececf3] bg-[#fbfcff] p-4">
                    <p className="text-[10px] font-black uppercase text-[#2563eb]">{event.type ?? "Activité"}</p>
                    <h3 className="text-sm font-black text-[#111827]">{event.title ?? "Événement Call of Duty"}</h3>
                    {event.description ? <p className="text-xs font-semibold leading-5 text-[#667085]">{event.description}</p> : null}
                    {event.date ? <p className="text-[11px] font-bold text-[#98a2b3]">{event.date}</p> : null}
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function FortniteProfileView({
  profile,
  session,
  email,
  country,
  avatar,
  banner,
  onEdit,
  onDisconnect,
  editOpen,
  onCloseEdit,
  onUpload
}: {
  profile: StoredFortniteProfile;
  session: LocalSession;
  email: string;
  country: string | null;
  avatar: string | null;
  banner: string | null | undefined;
  onEdit: () => void;
  onDisconnect: () => void;
  editOpen: boolean;
  onCloseEdit: () => void;
  onUpload: (kind: "avatar" | "banner", file: File | null) => void;
}) {
  const name = cleanPlayerName(profile.name) ?? session.name ?? "FORTNITE_PLAYER";
  const accountId = profile.account_id ?? "N/A";
  const matches = numberFrom(profile.matches) ?? 0;
  const wins = numberFrom(profile.wins) ?? 0;
  const kills = numberFrom(profile.kills) ?? 0;
  const deaths = numberFrom(profile.deaths) ?? 0;
  const kd = profile.kd ?? (deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills);
  const winRate = profile.win_rate ?? (matches > 0 ? Number(((wins / matches) * 100).toFixed(1)) : 0);

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />
      <section className="w-full px-3 py-5 sm:px-5">
        <section className="relative overflow-hidden rounded-lg border border-[#32106d] bg-[#14051f] text-white shadow-[0_24px_60px_rgba(76,29,149,.25)]">
          {banner ? <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-18" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(110deg,#14051f_0%,rgba(20,5,31,.95)_45%,rgba(124,58,237,.36)_100%)]" />
          <div className="relative grid min-h-[330px] gap-6 p-7 lg:grid-cols-[1fr_340px]">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="grid h-36 w-36 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/8 shadow-[0_20px_46px_rgba(124,58,237,.18)]">
                {avatar ? <img src={avatar} alt="" className="h-28 w-28 rounded-xl object-cover" /> : <AvatarFallback name={name} size="large" />}
              </div>
              <div>
                <p className="text-xs font-black uppercase text-[#c4b5fd]">Compte Fortnite synchronisé</p>
                <h1 className="mt-2 text-4xl font-black tracking-normal">{name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-white/75">
                  <span className="rounded bg-[#7c3aed] px-3 py-1 text-xs font-black text-white">FORTNITE</span>
                  <span>ID: {accountId}</span>
                  <CopyToClipboardButton value={accountId} className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10" label="Copier l’ID" />
                </div>
                <p className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/70">
                  {country ? <CountryFlag code={country} label={country} /> : null}
                  <span>{email}</span>
                  <span>Type: {(profile.account_type ?? "epic").toUpperCase()}</span>
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={onEdit} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#7c3aed] px-5 text-sm font-black text-white"><Edit3 className="h-4 w-4" /> MODIFIER LE PROFIL</button>
                  <button type="button" onClick={onDisconnect} className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-black text-white/80"><LogOut className="h-4 w-4" /> Déconnecté</button>
                </div>
              </div>
            </div>
            <aside className="relative overflow-hidden rounded-lg border border-white/15 bg-black/38 p-5 shadow-[0_20px_48px_rgba(0,0,0,.26)]">
              <p className="text-xs font-black uppercase text-white/58">Niveau Battle Royale</p>
              <div className="mt-5 flex items-center gap-4">
                <span className="grid h-24 w-24 place-items-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#22d3ee,#facc15)] text-4xl font-black text-white shadow-[0_16px_34px_rgba(124,58,237,.28)]">F</span>
                <div>
                  <h2 className="text-3xl font-black uppercase">Niveau {displayValue(profile.level)}</h2>
                  <p className="mt-1 text-sm font-bold text-white/70">{displayValue(profile.score)} score</p>
                  <p className="mt-2 text-sm font-black text-[#c4b5fd]">{displayValue(profile.minutes_played)} min jouées</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {editOpen ? <EditProfileModal avatar={avatar} banner={banner ?? avatar} gameKind="fortnite" onClose={onCloseEdit} onUpload={onUpload} /> : null}

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.8fr]">
          <Panel title="STATISTIQUES FORTNITE" action="Lifetime">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {([
                ["MATCHS", matches, Trophy],
                ["VICTOIRES", wins, Crown],
                ["KILLS", kills, Swords],
                ["K/D", kd, Activity],
                ["WIN RATE", `${winRate}%`, Zap],
                ["TOP 10", profile.top10 ?? 0, Medal]
              ] as Array<[string, string | number, LucideIcon]>).map(([label, value, Icon]) => (
                <div key={String(label)} className="rounded-lg border border-[#ececf3] bg-white p-4 text-center shadow-[0_10px_24px_rgba(16,24,40,.04)]">
                  <Icon className="mx-auto h-6 w-6 text-[#7c3aed]" />
                  <p className="mt-3 text-[10px] font-black text-[#6b7280]">{label}</p>
                  <b className="mt-2 block text-xl">{displayValue(value)}</b>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="DONNÉES DU COMPTE">
            <div className="space-y-3">
              {([
                ["Pseudo", name, Gamepad2],
                ["ID Fortnite", accountId, Shield],
                ["Type", (profile.account_type ?? "epic").toUpperCase(), GlobeIcon],
                ["Niveau", displayValue(profile.level), Trophy],
                ["Score", displayValue(profile.score), Star],
                ["Top 25", displayValue(profile.top25), Medal]
              ] as Array<[string, string, LucideIcon]>).map(([label, value, Icon]) => (
                <div key={String(label)} className="grid grid-cols-[22px_1fr_auto] items-center gap-2 border-b border-[#f0f1f5] pb-2 text-sm">
                  <Icon className="h-4 w-4 text-[#7c3aed]" />
                  <span className="font-semibold text-[#4b5563]">{label}</span>
                  <b className="text-right text-xs">{value}</b>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </section>
    </main>
  );
}

function Panel({ title, children, action, actionHref }: { title: string; children: React.ReactNode; action?: string; actionHref?: string }) {
  return (
    <section className="rounded-lg border border-[#ececf3] bg-white p-4 shadow-[0_12px_30px_rgba(16,24,40,.05)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-black"><Activity className="h-4 w-4 text-[#e52b2f]" /> {title}</h2>
        {action ? (
          actionHref ? (
            <a href={actionHref} className="text-[10px] font-black text-[#6b7280] transition hover:text-[#e52b2f]">{action}</a>
          ) : (
            <button className="text-[10px] font-black text-[#6b7280]">{action}</button>
          )
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EditProfileModal({
  avatar,
  banner,
  gameKind,
  onClose,
  onUpload
}: {
  avatar: string | null;
  banner: string | null;
  gameKind: "free_fire" | "pubg" | "codm" | "fortnite";
  onClose: () => void;
  onUpload: (kind: "avatar" | "banner", file: File | null) => void;
}) {
  const updateCopy = profileUpdateCopy(gameKind);

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-[#1f2937] bg-white text-[#111827] shadow-[0_28px_80px_rgba(0,0,0,.45)]">
        <div className="flex items-center justify-between border-b border-[#ececf3] px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase text-[#e52b2f]">Profil Astral4Gamer</p>
            <h2 className="text-xl font-black">Modifier le profil</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg border border-[#ececf3] hover:bg-[#f8fafc]" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr]">
	          <ProfileImageEditor
	            title="Photo de profil"
	            description="Par défaut, c'est la photo de ton compte Astral4Gamer."
	            image={avatar}
            kind="avatar"
            onUpload={onUpload}
          />
	          <ProfileImageEditor
	            title="Photo de bannière"
	            description="Par défaut, la bannière utilise aussi l'image de ton compte Astral4Gamer."
	            image={banner}
            kind="banner"
            onUpload={onUpload}
          />
        </div>

        <div className="mx-5 mb-5 rounded-lg border border-[#ffd7d7] bg-[#fff5f5] p-4">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e52b2f] text-white">
              <DollarSign className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-black">{updateCopy.title}</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#5b6170]">
                {updateCopy.description}
              </p>
              <button type="button" className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-[#111827] px-4 text-xs font-black text-white">
                <Zap className="h-4 w-4" />
                {updateCopy.button}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function profileUpdateCopy(gameKind: "free_fire" | "pubg" | "codm" | "fortnite") {
  if (gameKind === "pubg") {
    return {
      title: "Mise à jour du profil PUBG : 1$",
      description: "Changer tes images est gratuit. Relancer la synchronisation des données PUBG comme le grade, les statistiques lifetime et les derniers matchs est une action payante de 1$.",
      button: "Mettre à jour PUBG - 1$"
    };
  }

  if (gameKind === "codm") {
    return {
      title: "Mise à jour du profil CODM : 1$",
      description: "Changer tes images est gratuit. Relancer la synchronisation des données Call of Duty Mobile comme l'ID Activision, les plateformes liées et l'activité du compte est une action payante de 1$.",
      button: "Mettre à jour CODM - 1$"
    };
  }

  if (gameKind === "fortnite") {
    return {
      title: "Mise à jour du profil Fortnite : 1$",
      description: "Changer tes images est gratuit. Relancer la synchronisation des données Fortnite comme les victoires, kills, K/D, niveau et score est une action payante de 1$.",
      button: "Mettre à jour Fortnite - 1$"
    };
  }

  return {
    title: "Mise à jour du profil Free Fire : 1$",
    description: "Changer tes images est gratuit. Relancer la synchronisation des données Free Fire comme le niveau, les likes, les rangs, la guilde et les statistiques est une action payante de 1$.",
    button: "Mettre à jour Free Fire - 1$"
  };
}

function ProfileImageEditor({
  title,
  description,
  image,
  kind,
  onUpload
}: {
  title: string;
  description: string;
  image: string | null;
  kind: "avatar" | "banner";
  onUpload: (kind: "avatar" | "banner", file: File | null) => void;
}) {
  return (
    <div className="rounded-lg border border-[#ececf3] bg-[#fbfcff] p-4">
      <div className={kind === "avatar" ? "mx-auto grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-[#e52b2f]" : "relative h-32 overflow-hidden rounded-lg bg-[#111827]"}>
        {image ? (
          <img src={image} alt="" className={kind === "avatar" ? "h-full w-full object-cover" : "h-full w-full object-cover opacity-80"} />
        ) : (
          <Camera className="h-8 w-8 text-white" />
        )}
      </div>
      <h3 className="mt-4 text-sm font-black">{title}</h3>
      <p className="mt-1 min-h-10 text-xs font-semibold leading-5 text-[#667085]">{description}</p>
      <label className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#e52b2f] px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(229,43,47,.18)]">
        <UploadCloud className="h-4 w-4" />
        Choisir une image
        <input type="file" accept="image/*" className="hidden" onChange={(event) => onUpload(kind, event.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}

function compressProfileImage(file: File, kind: "avatar" | "banner") {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    const maxSize = kind === "avatar" ? 512 : 1280;
    const quality = kind === "avatar" ? 0.82 : 0.76;

    image.onload = () => {
      try {
        const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * ratio));
        const height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Canvas indisponible"));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/webp", quality);
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image invalide"));
    };

    image.src = objectUrl;
  });
}

function writeLocalStorageImage(key: string, value: string) {
  const previous = localStorage.getItem(key);

  try {
    localStorage.removeItem(key);
    localStorage.setItem(key, value);
  } catch (error) {
    if (previous) {
      try {
        localStorage.setItem(key, previous);
      } catch {
        localStorage.removeItem(key);
      }
    }
    throw error;
  }
}

function AvatarFallback({ name, size }: { name: string; size: "small" | "large" }) {
  return <span className={`grid place-items-center rounded-full bg-[#e52b2f] font-black text-white ${size === "large" ? "h-[136px] w-[136px] text-5xl" : "h-11 w-11 text-sm"}`}>{name.slice(0, 1).toUpperCase()}</span>;
}

function RankEmblem({ rank }: { rank: ReturnType<typeof getFreeFireRank> }) {
  const image = rankImageFor(rank.name);

  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center overflow-visible">
      <div className="absolute inset-[-18px] rounded-full bg-[radial-gradient(circle,rgba(255,49,61,.50)_0%,rgba(229,43,47,.22)_34%,transparent_68%)] blur-xl animate-[rankGlow_2.8s_ease-in-out_infinite]" />
      <div className="absolute inset-[-8px] rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,.36),transparent,rgba(229,43,47,.38),transparent)] opacity-70 blur-md animate-[rankSpin_6s_linear_infinite]" />
      <div className="absolute h-20 w-20 rounded-full bg-white/12 blur-2xl animate-[rankPulse_1.9s_ease-in-out_infinite]" />
      <img src={image} alt={`Grade ${rank.name}`} className="relative z-10 max-h-28 max-w-28 object-contain drop-shadow-[0_0_18px_rgba(255,49,61,.55)]" />
      <style jsx>{`
        @keyframes rankGlow {
          0%, 100% { opacity: .46; transform: scale(.92); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes rankSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes rankPulse {
          0%, 100% { opacity: .18; transform: scale(.78); }
          50% { opacity: .72; transform: scale(1.16); }
        }
      `}</style>
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
  const image = rankImageFor(badge.name);

  return (
    <div className="relative mx-auto grid h-16 w-16 place-items-center">
      <img src={image} alt={`Grade ${badge.name}`} className="max-h-16 max-w-16 object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,.22)]" />
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

function readStoredPubgProfile(): StoredPubgProfile | null {
  try {
    const raw = localStorage.getItem("astral_pubg_profile");
    return raw ? JSON.parse(raw) as StoredPubgProfile : null;
  } catch {
    return null;
  }
}

function readStoredFortniteProfile(): StoredFortniteProfile | null {
  try {
    const raw = localStorage.getItem("astral_fortnite_profile");
    return raw ? JSON.parse(raw) as StoredFortniteProfile : null;
  } catch {
    return null;
  }
}

function readStoredCodProfile(): StoredCodProfile | null {
  try {
    const raw = localStorage.getItem("astral_cod_profile");
    return raw ? JSON.parse(raw) as StoredCodProfile : null;
  } catch {
    return null;
  }
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

  if (decoded.includes("not found") || decoded.includes("hl%20gaming%20official") || decoded.includes("hl gaming official")) {
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

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "date inconnue";

  const date = new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) return "date inconnue";

  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays <= 0) return "aujourd’hui";
  if (diffDays === 1) return "il y a 1 jour";
  if (diffDays < 30) return `il y a ${diffDays} jours`;

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatUnix(value: unknown) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(numeric * 1000));
}

function formatUnixDateTime(value: unknown) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "N/A";
  }

  const date = new Date(numeric * 1000);

  const datePart = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  const timePart = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date);

  return `${datePart} ${timePart}`;
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

function rankImageFor(name: string) {
  const key = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return freeFireRankImages[key] ?? freeFireRankImages.bronze;
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
