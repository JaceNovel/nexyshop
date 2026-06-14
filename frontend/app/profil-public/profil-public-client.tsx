"use client";

import { useRef, useState } from "react";
import { BadgeCheck, ChevronDown, ChevronRight, Crown, Gamepad2, Globe2, Search, ShieldCheck, Swords, Trophy, Users, Zap } from "lucide-react";
import { getFortniteProfile, getFreeFireProfile, getLocalCodPublicProfile, getLocalFreeFirePublicProfile, getPubgProfile, type FortniteProfile, type FreeFireProfile, type PubgProfile, type PublicCodProfile, type PublicFreeFireProfile } from "@/lib/api";

type PublicLookup = {
  game: PublicGame;
  account_name: string;
  region: string;
  level: number;
  likes: number;
  account_created_at: string;
  last_login_at: string;
  br_max_rank: number;
  br_rank_points: number;
  cs_max_rank: number;
  cs_rank_points: number;
  title: string;
  profile: {
    equipped_outfit: { id: string; label: string; image?: string | null }[];
    equipped_skills: { id: string; label: string; image?: string | null }[];
    images: { title?: string | null; profile?: string | null };
  };
  guild: { name: string; level: number; members: number; capacity: number };
  captain: { nickname: string; level: number; xp: number; grade: number; rank_points: number; region: string };
  credit_score: { score: number; reward_state: string };
  pet: { level: number; xp: number };
  social: {
    hint: string;
    solo: StatBlock | null;
    duo: StatBlock | null;
    squad: StatBlock | null;
  };
  cod?: {
    username: string;
    activision_id: string;
    email: string;
    avatar_url?: string | null;
    has_codm_account: boolean;
    provider: string;
    verification_status: string;
    created_at: string;
    relationships: Array<Record<string, unknown>>;
    friend_feed: Array<Record<string, unknown>>;
  };
  pubg?: {
    account_id: string;
    game_id: string;
    platform: string;
    shard_id: string;
    avatar_url: string;
    rank_label: string;
    rank_tier: string;
    rank_score: number;
    matches: number;
    wins: number;
    kills: number;
    assists: number;
    damage: number;
    top10s: number;
    longest_kill: number;
    recent_matches: string[];
  };
  fortnite?: {
    account_id: string;
    name: string;
    account_type: string;
    avatar_url: string;
    level?: number | null;
    wins: number;
    matches: number;
    kills: number;
    deaths: number;
    kd?: number | null;
    win_rate?: number | null;
    minutes_played: number;
    score: number;
    top3: number;
    top5: number;
    top10: number;
    top25: number;
  };
};

type PublicGame = "free_fire" | "pubg" | "codm" | "fortnite";

type StatBlock = {
  matches_played: number;
  total_kills: number;
  total_wins: number;
  damage_dealt: number;
  deaths: number;
  distance_travelled: number;
  headshots_kills: number;
  headshots_hits: number;
  highest_kills_in_match: number;
  items_picked_up: number;
  revives: number;
  pets_killed: number;
  survival_time_seconds: number;
  top_n_times: number;
};

const mockProfilesById: Record<string, PublicLookup> = {
  "904590059": {
    game: "free_fire",
    account_name: "ASTRALᅠPRV",
    region: "MOI",
    level: 70,
    likes: 13781,
    account_created_at: "14/08/2020 13:43:53",
    last_login_at: "29/05/2026 13:41:31",
    br_max_rank: 315,
    br_rank_points: 2665,
    cs_max_rank: 313,
    cs_rank_points: 49,
    title: "904590059",
    profile: {
      images: {
        title: "https://via.placeholder.com/560x260/0b0f18/ff1f2f?text=TITRE+(exemple)",
        profile: "https://via.placeholder.com/560x260/0b0f18/ff1f2f?text=PROFIL+(exemple)"
      },
      equipped_outfit: [
        { id: "203000543", label: "Veste Astral Shadow", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Outfit" },
        { id: "204000859", label: "Masque Oni Rouge", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Outfit" },
        { id: "203049044", label: "Gants Cyber", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Outfit" },
        { id: "211034006", label: "Pantalon Tactical", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Outfit" },
        { id: "211000309", label: "Bottes Phantom", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Outfit" },
        { id: "205041039", label: "Sac Astral", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Outfit" },
        { id: "214000101", label: "Badge Elite", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Badge" }
      ],
      equipped_skills: [
        { id: "16", label: "Sprint (Niv. 4)", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Skill" },
        { id: "7406", label: "Mur gloo +", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Skill" },
        { id: "5206", label: "Précision", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Skill" },
        { id: "4306", label: "Médikit rapide", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Skill" }
      ]
    },
    guild: { name: "ᴘʀɪᴠɪʟᴇɢᴇ.", level: 5, members: 12, capacity: 55 },
    captain: { nickname: "OnlyᅠICEᅠPRV", level: 70, xp: 3031439, grade: 318, rank_points: 3060, region: "MOI" },
    credit_score: { score: 100, reward_state: "REWARD_STATE_UNCLAIMED" },
    pet: { level: 4, xp: 540 },
    social: {
      hint: "Ouvre le suivi pour voir les statistiques (exemple).",
      solo: {
        matches_played: 120,
        total_kills: 860,
        total_wins: 22,
        damage_dealt: 255400,
        deaths: 98,
        distance_travelled: 143210,
        headshots_kills: 210,
        headshots_hits: 540,
        highest_kills_in_match: 17,
        items_picked_up: 3890,
        revives: 41,
        pets_killed: 12,
        survival_time_seconds: 180420,
        top_n_times: 44
      },
      duo: {
        matches_played: 62,
        total_kills: 410,
        total_wins: 11,
        damage_dealt: 132800,
        deaths: 54,
        distance_travelled: 80210,
        headshots_kills: 98,
        headshots_hits: 240,
        highest_kills_in_match: 13,
        items_picked_up: 1804,
        revives: 33,
        pets_killed: 5,
        survival_time_seconds: 91420,
        top_n_times: 21
      },
      squad: {
        matches_played: 180,
        total_kills: 1290,
        total_wins: 37,
        damage_dealt: 410200,
        deaths: 152,
        distance_travelled: 220110,
        headshots_kills: 280,
        headshots_hits: 610,
        highest_kills_in_match: 21,
        items_picked_up: 5202,
        revives: 140,
        pets_killed: 26,
        survival_time_seconds: 260120,
        top_n_times: 67
      }
    }
  }
};

function normalizeId(value: string) {
  return value.trim().replace(/\s+/g, "");
}

const defaultRegion = "me";
const supportedRegions = ["me", "br", "sg", "ru", "id", "tw", "us", "vn", "th", "pk", "bd", "cis", "in"];
const codLogo = "/e2fa10ef-9138-42dd-a2a1-3a6eb8e60ec1-profile_image-300x300-removebg-preview.png";

const gameOptions: Array<{ id: PublicGame; label: string; hint: string; placeholder: string; empty: string; logo?: string }> = [
  {
    id: "free_fire",
    label: "Free Fire",
    hint: "ID joueur et région",
    placeholder: "ID du joueur",
    empty: "Aucun profil public trouvé pour cet ID.",
    logo: "/icons/free-fire-logo.svg"
  },
  {
    id: "pubg",
    label: "PUBG",
    hint: "Pseudo ou ID PUBG",
    placeholder: "Pseudo PUBG ou ID joueur",
    empty: "Aucun profil PUBG trouvé pour cet identifiant.",
    logo: "/icons/pubg-logo.svg"
  },
  {
    id: "fortnite",
    label: "Fortnite",
    hint: "ID de compte",
    placeholder: "ID de compte Epic/Fortnite",
    empty: "Aucun profil Fortnite trouvé pour cet ID.",
    logo: "/icons/fortnite-logo.svg"
  },
  {
    id: "codm",
    label: "Call of Duty",
    hint: "Bientôt disponible",
    placeholder: "Call of Duty bientôt disponible",
    empty: "Call of Duty n’est pas encore disponible sur la recherche publique.",
    logo: codLogo
  }
];

function publicGameLabel(game: PublicGame) {
  return gameOptions.find((option) => option.id === game)?.label ?? "Jeu";
}

function publicGameOption(game: PublicGame) {
  return gameOptions.find((option) => option.id === game) ?? gameOptions[0];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function hasAnyStat(stats: Record<string, unknown>) {
  return Object.values(stats).some((value) => Number.isFinite(Number(value)) && Number(value) > 0);
}

function mapStats(value: unknown): StatBlock | null {
  const stats = asRecord(value);

  if (!hasAnyStat(stats)) {
    return null;
  }

  return {
    matches_played: asNumber(stats.matchesPlayed ?? stats.matches_played ?? stats.MatchPlayed),
    total_kills: asNumber(stats.kills ?? stats.total_kills ?? stats.TotalKills),
    total_wins: asNumber(stats.wins ?? stats.total_wins ?? stats.TotalWins),
    damage_dealt: asNumber(stats.damage ?? stats.damage_dealt ?? stats.Damage),
    deaths: asNumber(stats.deaths ?? stats.Deaths),
    distance_travelled: asNumber(stats.distanceTravelled ?? stats.distance_travelled ?? stats.DistanceTravelled),
    headshots_kills: asNumber(stats.headshotKills ?? stats.headshots_kills ?? stats.HeadshotKills),
    headshots_hits: asNumber(stats.headshotHits ?? stats.headshots_hits ?? stats.HeadshotHits),
    highest_kills_in_match: asNumber(stats.highestKills ?? stats.highest_kills_in_match ?? stats.HighestKills),
    items_picked_up: asNumber(stats.itemsPickedUp ?? stats.items_picked_up ?? stats.ItemsPickedUp),
    revives: asNumber(stats.revives ?? stats.Revives),
    pets_killed: asNumber(stats.petsKilled ?? stats.pets_killed ?? stats.PetsKilled),
    survival_time_seconds: asNumber(stats.survivalTime ?? stats.survival_time_seconds ?? stats.SurvivalTime),
    top_n_times: asNumber(stats.topNTimes ?? stats.top_n_times ?? stats.TopNTimes)
  };
}

function mapHlProfile(profile: FreeFireProfile): PublicLookup {
  const account = asRecord(profile.account);
  const accountInfo = asRecord(account.AccountInfo);
  const guildInfo = asRecord(profile.guild ?? account.GuildInfo);
  const captainInfo = asRecord(account.captainBasicInfo ?? account.CaptainBasicInfo);
  const socialStats = asRecord(profile.stats);

  return {
    game: "free_fire",
    account_name: profile.nickname || asString(accountInfo.AccountName, `FF_${profile.uid}`),
    region: (profile.region || defaultRegion).toUpperCase(),
    level: asNumber(profile.level ?? accountInfo.AccountLevel),
    likes: asNumber(profile.likes ?? accountInfo.AccountLikes),
    account_created_at: asString(accountInfo.AccountCreateTime ?? accountInfo.createAt),
    last_login_at: asString(accountInfo.AccountLastLogin ?? accountInfo.lastLoginAt),
    br_max_rank: asNumber(profile.rank?.br ?? accountInfo.BrMaxRank),
    br_rank_points: asNumber(profile.br_rank_points ?? accountInfo.BrRankPoint),
    cs_max_rank: asNumber(profile.rank?.cs ?? accountInfo.CsMaxRank),
    cs_rank_points: asNumber(profile.cs_rank_points ?? accountInfo.CsRankPoint),
    title: profile.uid,
    profile: {
      images: {
        title: profile.banner_url ?? null,
        profile: profile.outfit_url ?? null
      },
      equipped_outfit: [],
      equipped_skills: []
    },
    guild: {
      name: asString(guildInfo.GuildName ?? guildInfo.guildName),
      level: asNumber(guildInfo.GuildLevel ?? guildInfo.guildLevel),
      members: asNumber(guildInfo.GuildMember ?? guildInfo.guildMember),
      capacity: asNumber(guildInfo.GuildCapacity ?? guildInfo.guildCapacity)
    },
    captain: {
      nickname: asString(captainInfo.nickname ?? captainInfo.AccountName),
      level: asNumber(captainInfo.level ?? captainInfo.AccountLevel),
      xp: asNumber(captainInfo.exp ?? captainInfo.AccountExp),
      grade: asNumber(captainInfo.rank ?? captainInfo.BrMaxRank),
      rank_points: asNumber(captainInfo.rankingPoints ?? captainInfo.BrRankPoint),
      region: asString(captainInfo.region ?? profile.region, defaultRegion).toUpperCase()
    },
    credit_score: { score: asNumber(account.creditScore ?? accountInfo.creditScore, 100), reward_state: asString(account.rewardState, "—") },
    pet: { level: asNumber(account.petInfo ? asRecord(account.petInfo).level : null), xp: asNumber(account.petInfo ? asRecord(account.petInfo).exp : null) },
    social: {
      hint: "Statistiques publiques disponibles selon les données du joueur.",
      solo: mapStats(socialStats.soloStats ?? socialStats.solo),
      duo: mapStats(socialStats.duoStats ?? socialStats.duo),
      squad: mapStats(socialStats.squadStats ?? socialStats.squad)
    }
  };
}

function mapLocalProfile(profile: PublicFreeFireProfile): PublicLookup {
  const freeFire = profile.free_fire ?? {};
  const guild = asRecord(freeFire.guild);
  const rank = asRecord(freeFire.rank);

  return {
    game: "free_fire",
    account_name: asString(profile.display_name ?? freeFire.nickname ?? profile.username),
    region: asString(freeFire.region ?? profile.country, defaultRegion).toUpperCase(),
    level: asNumber(freeFire.level),
    likes: asNumber(freeFire.likes),
    account_created_at: asString(profile.created_at),
    last_login_at: "—",
    br_max_rank: asNumber(rank.br ?? profile.rank),
    br_rank_points: asNumber(freeFire.br_rank_points ?? profile.points),
    cs_max_rank: asNumber(rank.cs),
    cs_rank_points: asNumber(freeFire.cs_rank_points),
    title: asString(freeFire.uid ?? profile.player_uid),
    profile: {
      images: {
        title: freeFire.banner_url ?? null,
        profile: freeFire.outfit_url ?? profile.avatar ?? null
      },
      equipped_outfit: [],
      equipped_skills: []
    },
    guild: {
      name: asString(guild.GuildName ?? profile.guild),
      level: asNumber(guild.GuildLevel),
      members: asNumber(guild.GuildMember),
      capacity: asNumber(guild.GuildCapacity)
    },
    captain: { nickname: "—", level: 0, xp: 0, grade: 0, rank_points: 0, region: asString(freeFire.region, defaultRegion).toUpperCase() },
    credit_score: { score: 100, reward_state: "—" },
    pet: { level: 0, xp: 0 },
    social: {
      hint: "Profil trouvé immédiatement dans la base Astral4Gamer.",
      solo: mapStats(null),
      duo: mapStats(null),
      squad: mapStats(null)
    }
  };
}

function readLocalCodPublicProfile(id: string): PublicLookup | null {
  try {
    const raw = localStorage.getItem("astral_cod_profile");
    const profile = raw ? JSON.parse(raw) as NonNullable<PublicCodProfile["call_of_duty"]> : null;
    if (!profile) return null;

    const candidates = [profile.activision_id, profile.cod_username, profile.username]
      .map((value) => normalizeComparable(String(value ?? "")))
      .filter(Boolean);

    if (!candidates.includes(normalizeComparable(id))) {
      return null;
    }

    return mapCodProfile({
      source: "local",
      username: String(profile.cod_username ?? profile.username ?? profile.activision_id ?? id),
      display_name: String(profile.cod_username ?? profile.username ?? profile.activision_id ?? id),
      avatar: profile.avatar_url ?? localStorage.getItem("astral_profile_avatar_override"),
      game: "call_of_duty",
      player_uid: profile.activision_id ?? profile.cod_username ?? profile.username ?? id,
      rank: null,
      points: 0,
      guild: null,
      wins: 0,
      tournaments_won: 0,
      kd_ratio: null,
      badges: [],
      country: null,
      call_of_duty: profile,
      created_at: profile.account?.created_at ? String(profile.account.created_at) : null
    });
  } catch {
    return null;
  }
}

function mapCodProfile(profile: PublicCodProfile): PublicLookup {
  const cod = profile.call_of_duty ?? {};
  const account = asRecord(cod.account);
  const username = asString(cod.cod_username ?? cod.username ?? profile.display_name ?? profile.username);
  const activisionId = asString(cod.activision_id ?? profile.player_uid ?? username);
  const createdAt = asString(account.created_at ?? profile.created_at);

  return {
    game: "codm",
    account_name: username,
    region: asString(profile.country, "—").toUpperCase(),
    level: 0,
    likes: 0,
    account_created_at: createdAt,
    last_login_at: "—",
    br_max_rank: 0,
    br_rank_points: 0,
    cs_max_rank: 0,
    cs_rank_points: 0,
    title: activisionId,
    profile: {
      images: {
        title: null,
        profile: cod.avatar_url ?? profile.avatar ?? null
      },
      equipped_outfit: [],
      equipped_skills: []
    },
    guild: { name: "—", level: 0, members: 0, capacity: 0 },
    captain: { nickname: "—", level: 0, xp: 0, grade: 0, rank_points: 0, region: "—" },
    credit_score: { score: 0, reward_state: "—" },
    pet: { level: 0, xp: 0 },
    social: {
      hint: "Profil Call of Duty Mobile public lié à Astral4Gamer.",
      solo: null,
      duo: null,
      squad: null
    },
    cod: {
      username,
      activision_id: activisionId,
      email: asString(cod.email, "Masqué"),
      avatar_url: cod.avatar_url ?? profile.avatar,
      has_codm_account: Boolean(cod.has_codm_account),
      provider: asString(cod.provider, "Activision"),
      verification_status: asString(cod.verification_status, cod.linked ? "Compte lié" : "Profil créé"),
      created_at: createdAt,
      relationships: Array.isArray(cod.relationships) ? cod.relationships : [],
      friend_feed: Array.isArray(cod.friend_feed) ? cod.friend_feed : []
    }
  };
}

function mapPubgProfile(profile: PubgProfile): PublicLookup {
  return {
    game: "pubg",
    account_name: profile.name,
    region: profile.platform.toUpperCase(),
    level: 0,
    likes: 0,
    account_created_at: "—",
    last_login_at: "—",
    br_max_rank: 0,
    br_rank_points: profile.rank.score,
    cs_max_rank: 0,
    cs_rank_points: 0,
    title: profile.account_id,
    profile: {
      images: {
        title: null,
        profile: profile.avatar_url
      },
      equipped_outfit: [],
      equipped_skills: []
    },
    guild: { name: "—", level: 0, members: 0, capacity: 0 },
    captain: { nickname: "—", level: 0, xp: 0, grade: 0, rank_points: 0, region: profile.shard_id.toUpperCase() },
    credit_score: { score: 0, reward_state: "—" },
    pet: { level: 0, xp: 0 },
    social: {
      hint: "Profil PUBG public lié à Astral4Gamer.",
      solo: null,
      duo: null,
      squad: null
    },
    pubg: {
      account_id: profile.account_id,
      game_id: profile.name,
      platform: profile.platform,
      shard_id: profile.shard_id,
      avatar_url: profile.avatar_url,
      rank_label: profile.rank.label,
      rank_tier: profile.rank.tier,
      rank_score: profile.rank.score,
      matches: profile.highlights.matches,
      wins: profile.highlights.wins,
      kills: profile.highlights.kills,
      assists: profile.highlights.assists,
      damage: profile.highlights.damage,
      top10s: profile.highlights.top10s,
      longest_kill: profile.highlights.longestKill,
      recent_matches: profile.recent_matches
    }
  };
}

function mapFortniteProfile(profile: FortniteProfile): PublicLookup {
  return {
    game: "fortnite",
    account_name: profile.name,
    region: profile.account_type.toUpperCase(),
    level: asNumber(profile.level),
    likes: 0,
    account_created_at: "—",
    last_login_at: "—",
    br_max_rank: 0,
    br_rank_points: asNumber(profile.score),
    cs_max_rank: 0,
    cs_rank_points: 0,
    title: profile.account_id,
    profile: {
      images: {
        title: null,
        profile: profile.avatar_url
      },
      equipped_outfit: [],
      equipped_skills: []
    },
    guild: { name: "—", level: 0, members: 0, capacity: 0 },
    captain: { nickname: "—", level: 0, xp: 0, grade: 0, rank_points: 0, region: profile.account_type.toUpperCase() },
    credit_score: { score: 0, reward_state: "—" },
    pet: { level: 0, xp: 0 },
    social: {
      hint: "Profil Fortnite public récupéré.",
      solo: null,
      duo: null,
      squad: null
    },
    fortnite: {
      account_id: profile.account_id,
      name: profile.name,
      account_type: profile.account_type,
      avatar_url: profile.avatar_url,
      level: profile.level,
      wins: profile.wins,
      matches: profile.matches,
      kills: profile.kills,
      deaths: profile.deaths,
      kd: profile.kd,
      win_rate: profile.win_rate,
      minutes_played: profile.minutes_played,
      score: profile.score,
      top3: profile.top3,
      top5: profile.top5,
      top10: profile.top10,
      top25: profile.top25
    }
  };
}

function normalizeComparable(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

export function ProfilPublicClient() {
  const [game, setGame] = useState<PublicGame>("free_fire");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState(defaultRegion);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const characterImage = "/ChatGPT%20Image%2029%20mai%202026%2C%2014_34_08.png";
  const hasDetailedStats = Boolean(selected?.social.solo || selected?.social.duo || selected?.social.squad);
  const activeGame = publicGameOption(game);

  async function handleSearch() {
    const id = normalizeId(query);

    if (!id) return;

    setSubmitted(id);
    setSelected(null);
    setError(null);
    setLoading(true);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    try {
      if (game === "codm") {
        throw new Error(activeGame.empty);
      }

      if (game === "pubg") {
        const profile = await getPubgProfile(id);
        setSelected(mapPubgProfile(profile));
        return;
      }

      if (game === "fortnite") {
        const profile = await getFortniteProfile(id);
        setSelected(mapFortniteProfile(profile));
        return;
      }

      try {
        const profile = await getFreeFireProfile(id, region);
        setSelected(mapHlProfile(profile));
        return;
      } catch {
        const localProfile = await getLocalFreeFirePublicProfile(id);

        if (localProfile) {
          setSelected(mapLocalProfile(localProfile));
          return;
        }
      }

      throw new Error(activeGame.empty);
    } catch (exception) {
      setError(exception instanceof Error && exception.message ? exception.message : activeGame.empty);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#111827]">
      <section className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#6b7280] sm:text-sm">
          <a href="/" className="hover:text-[#e52b2f]">Accueil</a>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#111827]">Profil public</span>
        </div>

        <section className="relative z-20 mt-4 grid gap-5 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-[0_20px_60px_rgba(16,24,40,.08)] sm:mt-6 sm:rounded-2xl sm:p-6 lg:grid-cols-[1fr_380px] lg:gap-8 lg:p-8">
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={characterImage} alt="" className="h-full w-full object-cover object-right opacity-[0.18]" />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/40" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight sm:text-4xl">Profil public</h1>
              <BadgeCheck className="h-5 w-5 fill-[#e52b2f] text-white sm:h-6 sm:w-6" />
            </div>
            <p className="mt-2 max-w-xl text-xs font-semibold leading-5 text-[#6b7280] sm:mt-3 sm:text-sm">
              Choisissez un jeu, saisissez l’identifiant du joueur, puis consultez les informations publiques disponibles.
            </p>

            <div className="relative z-30 mt-5 rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-[0_18px_50px_rgba(16,24,40,.08)] sm:mt-7 sm:p-6">
              <p className="text-sm font-black text-[#111827] sm:text-base">Rechercher un joueur</p>
              <label className="mt-3 block sm:hidden">
                <span className="mb-2 block text-xs font-black text-[#111827]">Jeu</span>
                <span className="flex h-11 items-center gap-2 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 shadow-[0_8px_20px_rgba(16,24,40,.045)]">
                  {activeGame.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activeGame.logo} alt="" className="h-7 w-7 shrink-0 rounded-lg object-contain" />
                  ) : (
                    <Gamepad2 className="h-5 w-5 text-[#e52b2f]" />
                  )}
                  <select
                    value={game}
                    onChange={(event) => {
                      const nextGame = event.target.value as PublicGame;
                      setGame(nextGame);
                      setQuery("");
                      setSelected(null);
                      setSubmitted(nextGame === "codm" ? "call-of-duty" : null);
                      setError(nextGame === "codm" ? publicGameOption(nextGame).empty : null);
                      setRegionOpen(false);
                    }}
                    className="h-full min-w-0 flex-1 appearance-none bg-transparent text-[13px] font-black text-[#111827] outline-none"
                  >
                    {gameOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#e52b2f]" />
                </span>
              </label>

              <div className="mt-4 hidden gap-3 sm:grid sm:grid-cols-3">
                {gameOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setGame(option.id);
                      setQuery("");
                      setSelected(null);
                      setSubmitted(option.id === "codm" ? "call-of-duty" : null);
                      setError(option.id === "codm" ? option.empty : null);
                      setRegionOpen(false);
                    }}
                    className={`flex h-[74px] items-center gap-3 rounded-xl border px-4 text-left transition ${
                      game === option.id
                        ? "border-[#e52b2f] bg-[#fff1f2] shadow-[0_14px_34px_rgba(229,43,47,.14)]"
                        : "border-[#e5e7eb] bg-white hover:border-[#fecaca] hover:bg-[#fff7f7]"
                    }`}
                    aria-pressed={game === option.id}
                  >
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${game === option.id ? "bg-white" : "bg-[#f3f4f6]"}`}>
                      {option.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={option.logo} alt="" className="h-9 w-9 object-contain" />
                      ) : (
                        <Gamepad2 className={`h-6 w-6 ${game === option.id ? "text-[#e52b2f]" : "text-[#6b7280]"}`} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-[#111827]">{option.label}</span>
                      <span className="mt-1 block truncate text-[11px] font-bold text-[#6b7280]">{option.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:mt-4 sm:flex sm:items-center sm:gap-3">
                <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 shadow-[0_8px_20px_rgba(16,24,40,.045)] focus-within:border-[#e52b2f] sm:h-12 sm:gap-3 sm:px-4">
                  <Search className="h-4 w-4 shrink-0 text-[#9ca3af] sm:h-5 sm:w-5" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={game === "codm"}
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none placeholder:text-[#9ca3af] disabled:cursor-not-allowed sm:text-sm"
                    placeholder={activeGame.placeholder}
                  />
                </label>
                {game === "free_fire" ? (
                <div className="relative min-w-0">
                  <button
                    type="button"
                    onClick={() => setRegionOpen((open) => !open)}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#e52b2f] bg-white px-4 text-[13px] font-black uppercase text-[#111827] shadow-[0_8px_20px_rgba(16,24,40,.045)] transition hover:bg-[#fff1f2] sm:h-12 sm:min-w-[88px] sm:text-sm"
                    aria-haspopup="listbox"
                    aria-expanded={regionOpen}
                  >
                    {region.toUpperCase()}
                    <ChevronDown className={`h-4 w-4 text-[#e52b2f] transition ${regionOpen ? "rotate-180" : ""}`} />
                  </button>
                  {regionOpen ? (
                    <div className="absolute left-0 right-0 top-[50px] z-[120] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-1 shadow-[0_20px_44px_rgba(16,24,40,.16)] sm:left-auto sm:top-[54px] sm:w-44" role="listbox">
                      <div className="max-h-64 overflow-y-auto pr-1">
                        {supportedRegions.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setRegion(item);
                              setRegionOpen(false);
                            }}
                            className={`flex h-9 w-full items-center justify-between rounded-lg px-3 text-left text-xs font-black uppercase transition ${
                              region === item ? "bg-[#e52b2f] text-white" : "text-[#111827] hover:bg-[#fff1f2] hover:text-[#e52b2f]"
                            }`}
                            role="option"
                            aria-selected={region === item}
                          >
                            <span>{item.toUpperCase()}</span>
                            {region === item ? <BadgeCheck className="h-4 w-4" /> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                ) : null}
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={loading || game === "codm"}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#e52b2f] px-5 text-[13px] font-black text-white shadow-[0_14px_30px_rgba(229,43,47,.22)] transition hover:bg-[#c91f27] disabled:cursor-not-allowed disabled:bg-[#fca5a5] disabled:shadow-none sm:h-12 sm:w-auto sm:px-6 sm:text-sm"
                >
                  {loading ? "Recherche..." : "Rechercher"} <span aria-hidden>→</span>
                </button>
              </div>
              <p className="mt-2 text-[11px] font-semibold leading-4 text-[#6b7280] sm:mt-3 sm:text-xs">
                {game === "codm" ? "Call of Duty n’est pas encore disponible. Cette recherche sera activée plus tard." : `Recherche active: ${publicGameLabel(game)}.`}
              </p>
            </div>
          </div>

          <div className="relative z-10 hidden items-end justify-end lg:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={characterImage} alt="" className="h-[360px] w-auto select-none object-contain" />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-center text-2xl font-black">Que pouvez-vous voir ?</h2>
          <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-[#e52b2f]" />

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <InfoCard icon={<Trophy className="h-6 w-6 text-[#e52b2f]" />} title="Statistiques du joueur" text="Consultez les données publiques disponibles selon le jeu." />
            <InfoCard icon={<Zap className="h-6 w-6 text-[#e52b2f]" />} title="Rang actuel" text="Découvrez les rangs et points disponibles selon le jeu." />
            <InfoCard icon={<Globe2 className="h-6 w-6 text-[#e52b2f]" />} title="Historique des tournois" text="Voir les tournois joués et les performances Astral4Gamer." />
            <InfoCard icon={<BadgeCheck className="h-6 w-6 text-[#e52b2f]" />} title="Succès & badges" text="Consultez les badges et récompenses obtenus." />
            <InfoCard icon={<Users className="h-6 w-6 text-[#e52b2f]" />} title="Comptes liés" text="Affichez les informations publiques du compte lié." />
          </div>

          <div className="mt-7 flex items-start gap-4 rounded-2xl border border-[#fde2e2] bg-[#fff1f2] p-6">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#e52b2f] shadow-[0_12px_26px_rgba(229,43,47,.18)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-[#111827]">Sécurité & confidentialité</p>
              <p className="mt-1 text-sm font-semibold text-[#6b7280]">
                Seules les informations publiques des joueurs sont affichées. Les données privées et sensibles restent protégées.
              </p>
            </div>
          </div>
        </section>

        {submitted ? (
          <section
            ref={resultRef}
            className="relative left-1/2 mt-10 w-screen -translate-x-1/2 scroll-mt-24 rounded-none border-y border-[#e5e7eb] bg-white shadow-[0_20px_60px_rgba(16,24,40,.08)]"
          >
            <div className="w-full px-6 py-8">
            {loading ? (
              <div className="text-center">
                <p className="text-lg font-black">Recherche du joueur...</p>
                <p className="mt-2 text-sm font-semibold text-[#6b7280]">Vérification du profil public.</p>
              </div>
            ) : selected ? (
              selected.game === "codm" && selected.cod ? (
                <CodPublicResult selected={selected} submitted={submitted} />
              ) : selected.game === "pubg" && selected.pubg ? (
                <PubgPublicResult selected={selected} submitted={submitted} />
              ) : selected.game === "fortnite" && selected.fortnite ? (
                <FortnitePublicResult selected={selected} submitted={submitted} />
              ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black tracking-widest text-[#6b7280]">RÉSULTAT</p>
                    <h3 className="mt-2 text-2xl font-black">{selected.account_name}</h3>
                    <p className="mt-2 text-sm font-semibold text-[#6b7280]">ID: <span className="font-mono font-black text-[#111827]">{submitted}</span></p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#fff1f2] px-4 py-2 text-xs font-black text-[#e52b2f]">
                    <BadgeCheck className="h-4 w-4" /> Profil public
                  </span>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-3">
                  <DataCard title="Informations du compte">
                    <KeyValue k="Nom du compte" v={selected.account_name} />
                    <KeyValue k="Région du compte" v={selected.region} />
                    <KeyValue k="Niveau de compte" v={String(selected.level)} />
                    <KeyValue k="Mentions J’aime" v={String(selected.likes)} />
                    <KeyValue k="Temps de création" v={selected.account_created_at} />
                    <KeyValue k="Dernière connexion" v={selected.last_login_at} />
                    <KeyValue k="Rang Br Max" v={String(selected.br_max_rank)} />
                    <KeyValue k="Points BR" v={String(selected.br_rank_points)} />
                    <KeyValue k="Rang Cs Max" v={String(selected.cs_max_rank)} />
                    <KeyValue k="Points CS" v={String(selected.cs_rank_points)} />
                    <KeyValue k="Titre" v={selected.title} />
                  </DataCard>

                  <DataCard title="Profil">
                    <div className="grid gap-3">
                      <MediaCard label="Titre" src={selected.profile.images.title ?? undefined} />
                      <MediaCard label="Profil" src={selected.profile.images.profile ?? undefined} />
                    </div>
                    <RichChipList label="Unité équipée" items={selected.profile.equipped_outfit} />
                    <RichChipList label="Compétences équipées" items={selected.profile.equipped_skills} />
                  </DataCard>

                  <DataCard title="Guilde">
                    <KeyValue k="Nom de la guilde" v={selected.guild.name} />
                    <KeyValue k="Niveau de guilde" v={String(selected.guild.level)} />
                    <KeyValue k="Membres" v={String(selected.guild.members)} />
                    <KeyValue k="Capacité" v={String(selected.guild.capacity)} />
                    <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
                      <p className="text-xs font-black tracking-widest text-[#6b7280]">CAPITAINE</p>
                      <p className="mt-2 text-sm font-black text-[#111827]">{selected.captain.nickname}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-[#6b7280]">
                        <span>Niveau: <b className="text-[#111827]">{selected.captain.level}</b></span>
                        <span>XP: <b className="text-[#111827]">{selected.captain.xp}</b></span>
                        <span>Grade: <b className="text-[#111827]">{selected.captain.grade}</b></span>
                        <span>Pts: <b className="text-[#111827]">{selected.captain.rank_points}</b></span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[#e5e7eb] bg-white p-4">
                        <p className="text-xs font-black tracking-widest text-[#6b7280]">CRÉDIT</p>
                        <p className="mt-2 text-lg font-black text-[#111827]">{selected.credit_score.score}</p>
                        <p className="mt-1 text-[11px] font-semibold text-[#6b7280]">{selected.credit_score.reward_state}</p>
                      </div>
                      <div className="rounded-xl border border-[#e5e7eb] bg-white p-4">
                        <p className="text-xs font-black tracking-widest text-[#6b7280]">ANIMAL</p>
                        <p className="mt-2 text-sm font-black text-[#111827]">Niveau {selected.pet.level}</p>
                        <p className="mt-1 text-[11px] font-semibold text-[#6b7280]">XP {selected.pet.xp}</p>
                      </div>
                    </div>
                  </DataCard>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <DataCard title="Statistiques des joueurs">
                    <p className="text-xs font-semibold text-[#6b7280]">{selected.social.hint}</p>
                    {hasDetailedStats ? (
                      <>
                        {selected.social.solo ? (
                          <ExpandableSection title="Statistiques solo" icon={<Crown className="h-4 w-4 text-[#e52b2f]" />}>
                            <StatGrid stats={selected.social.solo} />
                          </ExpandableSection>
                        ) : null}
                        {selected.social.duo ? (
                          <ExpandableSection title="Statistiques duo" icon={<Users className="h-4 w-4 text-[#e52b2f]" />}>
                            <StatGrid stats={selected.social.duo} />
                          </ExpandableSection>
                        ) : null}
                        {selected.social.squad ? (
                          <ExpandableSection title="Statistiques de l’effectif" icon={<Swords className="h-4 w-4 text-[#e52b2f]" />}>
                            <StatGrid stats={selected.social.squad} />
                          </ExpandableSection>
                        ) : null}
                      </>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-[#e5e7eb] bg-[#f9fafb] p-5 text-sm font-semibold text-[#6b7280]">
                        Les statistiques détaillées de matchs ne sont pas disponibles publiquement pour ce joueur.
                      </div>
                    )}
                  </DataCard>

                  <DataCard title="Résumé rapide">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MiniStat icon={<Gamepad2 className="h-4 w-4 text-[#e52b2f]" />} label="Mode" value="Battle Royale / Clash Squad" />
                      <MiniStat icon={<Trophy className="h-4 w-4 text-[#e52b2f]" />} label="Niveau" value={String(selected.level)} />
                      <MiniStat icon={<Zap className="h-4 w-4 text-[#e52b2f]" />} label="Likes" value={String(selected.likes)} />
                      <MiniStat icon={<ShieldCheck className="h-4 w-4 text-[#e52b2f]" />} label="Crédit" value={String(selected.credit_score.score)} />
                    </div>
                    <p className="mt-4 text-xs font-semibold text-[#6b7280]">
                      Les informations affichées sont publiques et peuvent varier selon les données disponibles.
                    </p>
                  </DataCard>
                </div>

                <p className="mt-6 text-xs font-semibold text-[#6b7280]">
                  Certaines statistiques peuvent rester indisponibles si elles ne sont pas publiques pour ce joueur.
                </p>
              </>
              )
            ) : (
              <div className="text-center">
                <p className="text-lg font-black">Aucun joueur trouvé</p>
                <p className="mt-2 text-sm font-semibold text-[#6b7280]">{error ?? activeGame.empty}</p>
              </div>
            )}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_50px_rgba(16,24,40,.06)]">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff1f2]">{icon}</div>
      <p className="mt-4 text-sm font-black text-[#111827]">{title}</p>
      <p className="mt-2 text-xs font-semibold text-[#6b7280]">{text}</p>
    </div>
  );
}

function CodPublicResult({ selected, submitted }: { selected: PublicLookup; submitted: string }) {
  const cod = selected.cod;
  if (!cod) return null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-widest text-[#6b7280]">RÉSULTAT CODM</p>
          <h3 className="mt-2 text-2xl font-black">{cod.username}</h3>
          <p className="mt-2 text-sm font-semibold text-[#6b7280]">Activision ID: <span className="font-mono font-black text-[#111827]">{cod.activision_id || submitted}</span></p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#eef6ff] px-4 py-2 text-xs font-black text-[#2563eb]">
          <BadgeCheck className="h-4 w-4" /> Profil CODM public
        </span>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <DataCard title="Compte Call of Duty Mobile">
          <div className="flex items-center gap-4 rounded-xl border border-[#eef2f7] bg-[#fbfdff] p-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#111827]">
              {cod.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cod.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-white">{cod.username.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-lg font-black text-[#111827]">{cod.username}</h4>
              <p className="mt-1 truncate text-xs font-bold text-[#667085]">{cod.activision_id}</p>
            </div>
          </div>
          <KeyValue k="Pseudo" v={cod.username} />
          <KeyValue k="Activision ID" v={cod.activision_id} />
          <KeyValue k="Date de création" v={cod.created_at} />
          <KeyValue k="Type de compte" v={cod.has_codm_account ? "Compte CODM existant" : "Nouveau profil CODM"} />
          <KeyValue k="Fournisseur" v={cod.provider} />
          <KeyValue k="Statut" v={cod.verification_status} />
        </DataCard>

        <DataCard title="Données disponibles">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat icon={<Gamepad2 className="h-4 w-4 text-[#2563eb]" />} label="Jeu" value="Call of Duty Mobile" />
            <MiniStat icon={<ShieldCheck className="h-4 w-4 text-[#2563eb]" />} label="Vérification" value={cod.verification_status} />
            <MiniStat icon={<Users className="h-4 w-4 text-[#2563eb]" />} label="Plateformes" value={String(cod.relationships.length)} />
            <MiniStat icon={<Zap className="h-4 w-4 text-[#2563eb]" />} label="Activité" value={String(cod.friend_feed.length)} />
          </div>
          <p className="mt-4 text-xs font-semibold text-[#6b7280]">
            Les données avancées apparaissent uniquement lorsqu’elles sont disponibles pour ce compte.
          </p>
        </DataCard>
      </div>

      {cod.relationships.length ? (
        <div className="mt-4">
          <DataCard title="Plateformes liées">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cod.relationships.map((relationship, index) => (
                <div key={index} className="rounded-xl border border-[#eef2f7] bg-[#fbfdff] p-4">
                  <p className="text-[10px] font-black uppercase text-[#2563eb]">{asString(relationship.platform, "Plateforme")}</p>
                  <p className="mt-2 truncate text-sm font-black text-[#111827]">{asString(relationship.platform_username ?? relationship.platform_id, "Compte lié")}</p>
                  <p className="mt-1 text-xs font-semibold text-[#667085]">{relationship.connected === false ? "Non connecté" : "Connecté"}</p>
                </div>
              ))}
            </div>
          </DataCard>
        </div>
      ) : null}

      {cod.friend_feed.length ? (
        <div className="mt-4">
          <DataCard title="Activité Call of Duty">
            {cod.friend_feed.map((event, index) => (
              <div key={index} className="rounded-xl border border-[#eef2f7] bg-[#fbfdff] p-4">
                <p className="text-[10px] font-black uppercase text-[#2563eb]">{asString(event.type, "Activité")}</p>
                <p className="mt-2 text-sm font-black text-[#111827]">{asString(event.title, "Événement Call of Duty")}</p>
                {event.description ? <p className="mt-1 text-xs font-semibold text-[#667085]">{String(event.description)}</p> : null}
              </div>
            ))}
          </DataCard>
        </div>
      ) : null}
    </>
  );
}

function PubgPublicResult({ selected, submitted }: { selected: PublicLookup; submitted: string }) {
  const pubg = selected.pubg;
  if (!pubg) return null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-widest text-[#6b7280]">RÉSULTAT PUBG</p>
          <h3 className="mt-2 text-2xl font-black">{pubg.game_id}</h3>
          <p className="mt-2 text-sm font-semibold text-[#6b7280]">ID compte: <span className="font-mono font-black text-[#111827]">{pubg.account_id || submitted}</span></p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#fff7ed] px-4 py-2 text-xs font-black text-[#c2410c]">
          <BadgeCheck className="h-4 w-4" /> Profil PUBG public
        </span>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <DataCard title="Compte PUBG">
          <div className="flex items-center gap-4 rounded-xl border border-[#eef2f7] bg-[#fbfdff] p-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#111827]">
              {pubg.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pubg.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Gamepad2 className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-lg font-black text-[#111827]">{pubg.game_id}</h4>
              <p className="mt-1 truncate text-xs font-bold text-[#667085]">{pubg.platform.toUpperCase()} · {pubg.shard_id}</p>
            </div>
          </div>
          <KeyValue k="Pseudo" v={pubg.game_id} />
          <KeyValue k="ID compte" v={pubg.account_id} />
          <KeyValue k="Plateforme" v={pubg.platform.toUpperCase()} />
          <KeyValue k="Shard" v={pubg.shard_id} />
          <KeyValue k="Rang" v={`${pubg.rank_label} ${pubg.rank_tier}`.trim()} />
          <KeyValue k="Points" v={String(pubg.rank_score)} />
        </DataCard>

        <DataCard title="Statistiques PUBG">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat icon={<Gamepad2 className="h-4 w-4 text-[#c2410c]" />} label="Matchs" value={String(pubg.matches)} />
            <MiniStat icon={<Trophy className="h-4 w-4 text-[#c2410c]" />} label="Victoires" value={String(pubg.wins)} />
            <MiniStat icon={<Zap className="h-4 w-4 text-[#c2410c]" />} label="Kills" value={String(pubg.kills)} />
            <MiniStat icon={<Users className="h-4 w-4 text-[#c2410c]" />} label="Assists" value={String(pubg.assists)} />
            <MiniStat icon={<ShieldCheck className="h-4 w-4 text-[#c2410c]" />} label="Top 10" value={String(pubg.top10s)} />
            <MiniStat icon={<Globe2 className="h-4 w-4 text-[#c2410c]" />} label="Dégâts" value={String(Math.round(pubg.damage))} />
          </div>
        </DataCard>
      </div>

      {pubg.recent_matches.length ? (
        <div className="mt-4">
          <DataCard title="Derniers matchs">
            <div className="grid gap-2">
              {pubg.recent_matches.slice(0, 8).map((matchId) => (
                <div key={matchId} className="flex items-center justify-between gap-3 rounded-xl border border-[#eef2f7] bg-[#fbfdff] p-4">
                  <span className="truncate font-mono text-xs font-black text-[#111827]">{matchId}</span>
                  <a href={`/pubg/match?id=${encodeURIComponent(matchId)}`} className="shrink-0 rounded-lg bg-[#111827] px-3 py-2 text-xs font-black text-white">Détail</a>
                </div>
              ))}
            </div>
          </DataCard>
        </div>
      ) : null}
    </>
  );
}

function FortnitePublicResult({ selected, submitted }: { selected: PublicLookup; submitted: string }) {
  const fortnite = selected.fortnite;
  if (!fortnite) return null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-widest text-[#6b7280]">RÉSULTAT FORTNITE</p>
          <h3 className="mt-2 text-2xl font-black">{fortnite.name}</h3>
          <p className="mt-2 text-sm font-semibold text-[#6b7280]">ID compte: <span className="font-mono font-black text-[#111827]">{fortnite.account_id || submitted}</span></p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#f5f3ff] px-4 py-2 text-xs font-black text-[#7c3aed]">
          <BadgeCheck className="h-4 w-4" /> Profil Fortnite public
        </span>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <DataCard title="Compte Fortnite">
          <div className="flex items-center gap-4 rounded-xl border border-[#eef2f7] bg-[#fbfdff] p-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#111827]">
              {fortnite.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fortnite.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Gamepad2 className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-lg font-black text-[#111827]">{fortnite.name}</h4>
              <p className="mt-1 truncate text-xs font-bold text-[#667085]">{fortnite.account_type.toUpperCase()}</p>
            </div>
          </div>
          <KeyValue k="Pseudo" v={fortnite.name} />
          <KeyValue k="ID compte" v={fortnite.account_id} />
          <KeyValue k="Type de compte" v={fortnite.account_type.toUpperCase()} />
          <KeyValue k="Niveau" v={String(fortnite.level ?? "—")} />
          <KeyValue k="Score" v={String(fortnite.score)} />
        </DataCard>

        <DataCard title="Statistiques Fortnite">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat icon={<Gamepad2 className="h-4 w-4 text-[#7c3aed]" />} label="Matchs" value={String(fortnite.matches)} />
            <MiniStat icon={<Trophy className="h-4 w-4 text-[#7c3aed]" />} label="Victoires" value={String(fortnite.wins)} />
            <MiniStat icon={<Zap className="h-4 w-4 text-[#7c3aed]" />} label="Kills" value={String(fortnite.kills)} />
            <MiniStat icon={<Swords className="h-4 w-4 text-[#7c3aed]" />} label="K/D" value={String(fortnite.kd ?? "—")} />
            <MiniStat icon={<Crown className="h-4 w-4 text-[#7c3aed]" />} label="Win rate" value={fortnite.win_rate !== null && fortnite.win_rate !== undefined ? `${fortnite.win_rate}%` : "—"} />
            <MiniStat icon={<ShieldCheck className="h-4 w-4 text-[#7c3aed]" />} label="Top 10" value={String(fortnite.top10)} />
          </div>
        </DataCard>
      </div>
    </>
  );
}

function DataCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_50px_rgba(16,24,40,.06)]">
      <p className="text-sm font-black text-[#111827]">{title}</p>
      <div className="mt-4 grid gap-2">{children}</div>
    </div>
  );
}

function KeyValue({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#eef2f7] bg-[#fbfdff] px-3 py-2">
      <span className="text-xs font-semibold text-[#6b7280]">{k}</span>
      <span className="text-xs font-black text-[#111827]">{v}</span>
    </div>
  );
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#6b7280]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="inline-flex items-center rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-[11px] font-black text-[#111827]">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function RichChipList({ label, items }: { label: string; items: { id: string; label: string; image?: string | null }[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-[#6b7280]">{label}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-[#0b0f18]">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="h-10 w-10 object-cover" />
              ) : (
                <span className="text-[10px] font-black text-white/80">IMG</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-[#111827]">{item.label}</p>
              <p className="mt-0.5 font-mono text-[11px] font-bold text-[#6b7280]">{item.id}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaCard({ label, src }: { label: string; src?: string }) {
  const imageSrc = src ? improveImageResolution(src) : undefined;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <p className="text-xs font-black tracking-widest text-[#6b7280]">{label.toUpperCase()}</p>
        <span className="rounded-full bg-[#fff1f2] px-2 py-1 text-[10px] font-black text-[#e52b2f]">Image</span>
      </div>
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt="" className="h-[140px] w-full object-cover" />
      ) : (
        <div className="grid h-[140px] place-items-center bg-[#0b0f18] text-xs font-black text-white/70">Aucune image</div>
      )}
    </div>
  );
}

function improveImageResolution(src: string) {
  return src
    .replace(/\/s\d+\//, "/s1600/")
    .replace(/=s\d+(-[a-z-]+)?/i, "=s1600")
    .replace(/([?&]w=)\d+/i, "$11600")
    .replace(/([?&]width=)\d+/i, "$11600")
    .replace(/([?&]h=)\d+/i, "$1900")
    .replace(/([?&]height=)\d+/i, "$1900");
}

function ExpandableSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="inline-flex items-center gap-2 text-sm font-black text-[#111827]">{icon}{title}</span>
        <ChevronDown className={`h-5 w-5 text-[#6b7280] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="border-t border-[#e5e7eb] p-4">{children}</div> : null}
    </div>
  );
}

function StatGrid({ stats }: { stats: StatBlock | null }) {
  if (!stats) {
    return (
      <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-[#f9fafb] p-4 text-sm font-semibold text-[#6b7280]">
        Statistiques non disponibles publiquement pour ce joueur.
      </div>
    );
  }

  const rows: { k: string; v: string }[] = [
    { k: "Matchs joués", v: String(stats.matches_played) },
    { k: "Total des éliminations", v: String(stats.total_kills) },
    { k: "Total des victoires", v: String(stats.total_wins) },
    { k: "Dégâts infligés", v: String(stats.damage_dealt) },
    { k: "Décès", v: String(stats.deaths) },
    { k: "Distance parcourue", v: String(stats.distance_travelled) },
    { k: "Tirs à la tête tués", v: String(stats.headshots_kills) },
    { k: "Tirs à la tête portés", v: String(stats.headshots_hits) },
    { k: "Plus haut kills (match)", v: String(stats.highest_kills_in_match) },
    { k: "Objets récupérés", v: String(stats.items_picked_up) },
    { k: "Revives terminées", v: String(stats.revives) },
    { k: "Animaux tués", v: String(stats.pets_killed) },
    { k: "Temps de survie (s)", v: String(stats.survival_time_seconds) },
    { k: "Top N Times", v: String(stats.top_n_times) }
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((row) => (
        <KeyValue key={row.k} k={row.k} v={row.v} />
      ))}
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff1f2]">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-black tracking-widest text-[#6b7280]">{label.toUpperCase()}</p>
        <p className="mt-1 truncate text-sm font-black text-[#111827]">{value}</p>
      </div>
    </div>
  );
}
