const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.astral4gamer.com";
export const API_BASE_URL = API_URL;
const FREE_FIRE_PROFILE_CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const PUBG_PROFILE_CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const FORTNITE_PROFILE_CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const pendingFreeFireProfiles = new Map<string, Promise<FreeFireProfile>>();
const pendingPubgProfiles = new Map<string, Promise<PubgProfile>>();
const pendingFortniteProfiles = new Map<string, Promise<FortniteProfile>>();

export type CatalogVariation = {
  id?: number | string;
  variation_id?: string | null;
  name: string;
  price: number;
  currency: string;
};

export type CatalogRequiredField = {
  key: string;
  label?: string;
  type?: string;
  options?: Array<Record<string, unknown>>;
};

export type CatalogProduct = {
  id: number;
  name: string;
  game: string;
  sku?: string;
  public_reference?: string;
  price: number;
  currency: string;
  image_url?: string | null;
  description?: string | null;
  delivery?: string;
  requires_uid?: boolean;
  required_fields?: CatalogRequiredField[];
  amounts?: string[];
  variations?: CatalogVariation[];
  category?: string | null;
  type?: string | null;
  price_range?: { min: number; max: number } | null;
  permalink?: string | null;
  supplier: string;
  variation_id?: string | null;
};

export async function getCatalogProducts(perPage = 32, params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams({ per_page: String(perPage) });
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });

  const response = await fetch(`${API_URL}/api/products?${query}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error("Catalogue indisponible");
  }

  return response.json() as Promise<{
    data: CatalogProduct[];
    links?: { first?: string | null; last?: string | null; prev?: string | null; next?: string | null };
    meta?: { current_page?: number; last_page?: number; per_page?: number; total?: number };
  }>;
}

export async function getCatalogProduct(id: string | number) {
  const response = await fetch(`${API_URL}/api/products/${id}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error("Produit indisponible");
  }

  return response.json() as Promise<{ data: CatalogProduct; recommended: CatalogProduct[] }>;
}

export type Tournament = {
  id: number;
  title: string;
  mode: string;
  status: string;
  starts_at: string;
  prize_pool: number;
  room_id?: string | null;
  rules?: Record<string, unknown> | null;
  teams_count?: number;
  teams?: Array<{ id: number; name: string; points: number; kills: number; status: string }>;
};

export type TournamentTeam = {
  id: number;
  tournament_id: number;
  guild_id?: number | null;
  name: string;
  captain_user_id?: number | null;
  status: string;
  points: number;
  kills: number;
  metadata?: Record<string, unknown> | null;
};

export async function getTournaments() {
  const response = await fetch(`${API_URL}/api/tournaments`, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Tournois indisponibles");
  }

  return response.json() as Promise<{ data: Tournament[] }>;
}

export async function getTournament(id: string | number) {
  const response = await fetch(`${API_URL}/api/tournaments/${id}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error("Tournoi indisponible");
  }

  return response.json() as Promise<Tournament>;
}

export type PartnershipRequestPayload = {
  name: string;
  company_name?: string;
  email: string;
  discord?: string;
  country?: string;
  type: string;
  audience?: string;
  network_url?: string;
  message: string;
  expected_earning?: string;
};

export async function submitPartnershipRequest(payload: PartnershipRequestPayload) {
  const response = await fetch(`${API_URL}/api/partnership-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message ?? "Demande partenariat impossible pour le moment.");
  }

  return body as { status: string; reference: string; message: string };
}

export type CommunityActionResponse = {
  message?: string;
  status?: string;
  youtube_video_id?: string;
  channel_id?: string;
};

async function submitCommunityAction(path: string, token: string | null, payload?: Record<string, unknown>) {
  if (!token) {
    throw new Error("Connecte-toi avec Google pour utiliser cette action.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
    credentials: "include",
    body: JSON.stringify(payload ?? {})
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message ?? "Action communauté impossible pour le moment.");
  }

  return body as CommunityActionResponse;
}

export function shareCommunityProfile(token: string | null, payload: { game?: string; message?: string }) {
  return submitCommunityAction("/api/community/profile-share", token, payload);
}

export function searchCommunityTeam(token: string | null, payload: { game: string; role?: string; region?: string; discord?: string; message?: string }) {
  return submitCommunityAction("/api/community/team-search", token, payload);
}

export function shareCommunityClip(token: string | null, payload: { replay_id?: number; youtube_video_id?: string; title?: string; message?: string }) {
  return submitCommunityAction("/api/community/clips", token, payload);
}

export function likeYoutubeVideo(token: string | null, youtubeVideoId: string) {
  return submitCommunityAction("/api/community/youtube/like", token, { youtube_video_id: youtubeVideoId });
}

export function subscribeYoutubeChannel(token: string | null) {
  return submitCommunityAction("/api/community/youtube/subscribe", token);
}

export function trackYoutubeShare(token: string | null, youtubeVideoId: string, platform = "web") {
  return submitCommunityAction("/api/community/youtube/share", token, { youtube_video_id: youtubeVideoId, platform });
}

export async function getMyTournaments(token: string | null) {
  if (!token) return { data: [] as Tournament[] };

  const response = await fetch(`${API_URL}/api/user/tournaments`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    return { data: [] as Tournament[] };
  }

  return response.json() as Promise<{ data: Tournament[] }>;
}

export type DiamondDuelPlayer = {
  id: number | null;
  name: string;
  avatar: string | null;
  rank: string;
};

export type DiamondDuel = {
  id: number;
  status: "open" | "matched" | "active" | "completed" | "cancelled";
  stake: number;
  prize_pool: number;
  mode: string;
  map: string;
  created_at: string | null;
  accepted_at: string | null;
  creator: DiamondDuelPlayer;
  opponent: DiamondDuelPlayer | null;
};

export type DiamondDuelStats = {
  duels_today: number;
  diamonds_distributed: number;
  active_players: number;
  average_win_rate: number;
};

export async function getDiamondDuels(limit = 5, status?: string) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (status) query.set("status", status);

  const response = await fetch(`${API_URL}/api/diamond-duels?${query}`, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Duels indisponibles");
  }

  return response.json() as Promise<{ stats: DiamondDuelStats; available: DiamondDuel[] }>;
}

export async function getMyDiamondDuels(token: string | null) {
  if (!token) return { data: [] as DiamondDuel[] };

  const response = await fetch(`${API_URL}/api/user/diamond-duels`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    return { data: [] as DiamondDuel[] };
  }

  return response.json() as Promise<{ data: DiamondDuel[] }>;
}

export async function createDiamondDuel(token: string | null, payload: { stake: number; mode: string; map: string }) {
  if (!token) throw new Error("Connecte-toi pour créer un duel.");

  const response = await fetch(`${API_URL}/api/diamond-duels`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message ?? "Impossible de créer le duel.");
  return data as { data: DiamondDuel };
}

export async function duelAction(token: string | null, duelId: number, action: "join" | "accept" | "decline") {
  if (!token) throw new Error("Connecte-toi pour continuer.");

  const response = await fetch(`${API_URL}/api/diamond-duels/${duelId}/${action}`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    credentials: "include"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message ?? "Action impossible.");
  return data as { data: DiamondDuel };
}

export function joinDiamondDuel(token: string | null, duelId: number) {
  return duelAction(token, duelId, "join");
}

export function acceptDiamondDuel(token: string | null, duelId: number) {
  return duelAction(token, duelId, "accept");
}

export function declineDiamondDuel(token: string | null, duelId: number) {
  return duelAction(token, duelId, "decline");
}

export type TournamentSlot = {
  id: string;
  label: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
};

export async function getTournamentSlots(date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await fetch(`${API_URL}/api/calendar/tournament-slots${query}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    return { data: [] as TournamentSlot[] };
  }

  return response.json() as Promise<{ data: TournamentSlot[] }>;
}

export async function requestTournamentCreation(token: string, payload: {
  title: string;
  game: string;
  mode: string;
  team_type: string;
  slot: { starts_at: string; ends_at: string };
  region: string;
  platform: string;
  phone: string;
  participants: number;
  reward_amount: number;
  reward_unit: string;
  funding: "astral" | "self";
  description?: string;
  cover_image?: string | null;
}) {
  const response = await fetch(`${API_URL}/api/tournament-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Création du tournoi impossible.");
  }

  return data as {
    data: Tournament;
    checkout_url?: string | null;
    payment?: { id: number; reference: string; status: string; amount: number; currency: string } | null;
    payment_status?: string | null;
  };
}

export async function registerTournamentTeam(token: string, tournamentId: string | number, payload: {
  name: string;
  tag?: string | null;
  guild_id?: number | null;
  region?: string | null;
  country?: string | null;
  description?: string | null;
  contact_whatsapp?: string | null;
  instagram?: string | null;
  discord?: string | null;
  logo?: string | null;
  members?: Array<{ role: string; nickname?: string | null; uid?: string | null; whatsapp?: string | null }>;
}) {
  const response = await fetch(`${API_URL}/api/tournaments/${tournamentId}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Création de l’équipe impossible.");
  }

  return data as TournamentTeam;
}

export type Leaderboards = {
  top_players: Array<{ id: number; name: string; points: number; kills: number; guild_id?: number | null }>;
  top_killers: Array<{ id: number; name: string; points: number; kills: number; guild_id?: number | null }>;
  top_guilds: Array<{ guild_id: number | null; points: number; kills: number }>;
};

export type GenshinItem = {
  id?: number | string;
  name: string;
  slug: string;
  kind?: "characters" | "weapons" | "artifacts";
  rarity?: number | null;
  vision?: string | null;
  weapon?: string | null;
  type?: string | null;
  role?: string | null;
  birthday?: string | null;
  obtain?: string | null;
  description?: string | null;
  stat?: string | null;
  recommended_for?: string | null;
  bonus?: string | null;
  compatible?: string[] | null;
  image_url?: string | null;
};

export type GenshinBuild = {
  character: string;
  role: string;
  weapon: string;
  artifact: string;
  tip: string;
};

export type GenshinOverview = {
  data: {
    characters: GenshinItem[];
    weapons: GenshinItem[];
    artifacts: GenshinItem[];
    guides: Array<{ title: string; slug: string; excerpt: string }>;
    builds: GenshinBuild[];
    events: Array<{ title: string; label: string; description: string }>;
  };
  stats: { characters: number; weapons: number; artifacts: number; guides: number; builds: number };
  usage?: unknown;
};

export type UpcomingGame = {
  gameName: string;
  gameUrl: string;
  releaseDate?: string | null;
  gameImage?: string | null;
  price?: string | null;
  credits?: string | null;
};

export type SteamNewsItem = {
  appid: number;
  app_name: string;
  category?: string | null;
  title: string;
  excerpt?: string | null;
  url?: string | null;
  author?: string | null;
  date?: string | null;
  feedlabel?: string | null;
};

export type UpcomingGamesResponse = {
  result: UpcomingGame[];
  steam_news?: SteamNewsItem[];
  usage?: { usedToday?: number; dailyLimit?: number; remainingToday?: number } | null;
  stale?: boolean;
};

export async function getGenshinOverview() {
  const response = await fetch(`${API_URL}/api/genshin/overview`, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Données Genshin indisponibles");
  }

  return response.json() as Promise<GenshinOverview>;
}

export async function getUpcomingGames() {
  const response = await fetch(`${API_URL}/api/games/upcoming`, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Jeux à venir indisponibles");
  }

  return response.json() as Promise<UpcomingGamesResponse>;
}

export async function getLeaderboards() {
  const response = await fetch(`${API_URL}/api/leaderboards`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 30 }
  });

  if (!response.ok) {
    throw new Error("Classements indisponibles");
  }

  return response.json() as Promise<Leaderboards>;
}

export async function createGuestOrder(payload: { product_id: number; variation_id?: string | null; game_uid: string; nickname: string; quantity?: number; supplier_fields?: Record<string, string> }) {
  const response = await fetch(`${API_URL}/api/orders/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validation = data?.errors && typeof data.errors === "object"
      ? Object.values(data.errors).flat().find((value) => typeof value === "string")
      : null;
    throw new Error(validation || data?.message || "Commande impossible pour le moment");
  }

  return data;
}

export async function initiateMonerooPayment(payload: {
  order_id: number;
  customer: { email: string; first_name: string; last_name: string; phone?: string };
  methods?: string[];
}) {
  const response = await fetch(`${API_URL}/api/payments/moneroo/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validation = data?.errors && typeof data.errors === "object"
      ? Object.values(data.errors).flat().find((value) => typeof value === "string")
      : null;
    throw new Error(validation || data?.message || "Initialisation paiement impossible");
  }

  if (!data?.checkout_url || typeof data.checkout_url !== "string") {
    throw new Error("Le prestataire de paiement n'a pas renvoyé de lien de paiement.");
  }

  return data as { payment: { id: number; reference: string; status: string }; checkout_url: string };
}

export async function verifyGameUid(game: string, uid: string) {
  const response = await fetch(`${API_URL}/api/player/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ game, uid })
  });

  if (!response.ok) {
    throw new Error("Verification UID impossible");
  }

  return response.json() as Promise<{ nickname: string; avatar?: string; uid: string }>;
}

export type FreeFireProfile = {
  uid: string;
  region: string;
  nickname: string;
  level?: number | null;
  likes?: number | null;
  br_rank_points?: number | null;
  cs_rank_points?: number | null;
  rank?: { br?: number | null; cs?: number | null; season?: number | null };
  guild?: Record<string, unknown> | null;
  stats?: Record<string, unknown> | null;
  avatar_url?: string | null;
  outfit_url?: string | null;
  banner_url?: string | null;
  account?: Record<string, unknown> | null;
  usage?: Record<string, unknown> | null;
  fetched_at?: number;
};

export type PublicFreeFireProfile = {
  source?: "local";
  username: string;
  display_name?: string | null;
  avatar: string | null;
  game?: string | null;
  player_uid?: string | null;
  rank: string | null;
  points: number;
  guild: string | null;
  wins: number;
  tournaments_won: number;
  kd_ratio: number | null;
  badges: unknown[];
  country: string | null;
  free_fire?: Partial<FreeFireProfile> | null;
  created_at: string | null;
};

export type PublicCodProfile = {
  source?: "local";
  username: string;
  display_name?: string | null;
  avatar: string | null;
  game?: string | null;
  player_uid?: string | null;
  rank: string | null;
  points: number;
  guild: string | null;
  wins: number;
  tournaments_won: number;
  kd_ratio: number | null;
  badges: unknown[];
  country: string | null;
  call_of_duty?: {
    username?: string | null;
    cod_username?: string | null;
    activision_id?: string | null;
    email?: string | null;
    has_codm_account?: boolean | null;
    avatar_url?: string | null;
    linked?: boolean | null;
    provider?: string | null;
    verification_status?: string | null;
    account?: Record<string, unknown> | null;
    relationships?: Array<Record<string, unknown>> | null;
    friend_feed?: Array<Record<string, unknown>> | null;
    auth?: Record<string, unknown> | null;
    fetched_at?: number | null;
  } | null;
  created_at: string | null;
};

export async function getLocalFreeFirePublicProfile(uid: string) {
  const response = await fetchWithLocalFallback(
    `${API_URL}/api/public/freefire-profiles/${encodeURIComponent(uid.trim())}`,
    `/api/public/freefire-profiles/${encodeURIComponent(uid.trim())}`,
    {
      headers: { Accept: "application/json" },
      credentials: "include"
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<PublicFreeFireProfile>;
}

export async function getLocalCodPublicProfile(activisionId: string) {
  const response = await fetchWithLocalFallback(
    `${API_URL}/api/public/cod-profiles/${encodeURIComponent(activisionId.trim())}`,
    `/api/public/cod-profiles/${encodeURIComponent(activisionId.trim())}`,
    {
      headers: { Accept: "application/json" },
      credentials: "include"
    }
  );

  if (!response.ok) {
    if (response.status === 503) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message ?? "Recherche centrale Call of Duty non configurée.");
    }

    return null;
  }

  return response.json() as Promise<PublicCodProfile>;
}

export async function validateFreeFireUid(uid: string, region: string) {
  const response = await fetchWithLocalFallback(`${API_URL}/api/freefire/validate`, "/api/freefire/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ uid, region })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message ?? "ID incorrect");
  }

  return response.json() as Promise<{ uid: string; region: string; nickname: string; level?: number | null; verified: boolean }>;
}

export async function getFreeFireProfile(uid: string, region: string, options?: { persistAsCurrentUser?: boolean }) {
  const normalizedUid = uid.trim();
  const normalizedRegion = region.trim().toLowerCase();
  const cacheKey = freeFireProfileCacheKey(normalizedUid, normalizedRegion);
  const cachedProfile = readFreeFireProfileCache(cacheKey);

  if (cachedProfile) {
    return cachedProfile;
  }

  const pendingProfile = pendingFreeFireProfiles.get(cacheKey);

  if (pendingProfile) {
    return pendingProfile;
  }

  const request = fetchFreeFireProfile(normalizedUid, normalizedRegion, options).finally(() => {
    pendingFreeFireProfiles.delete(cacheKey);
  });

  pendingFreeFireProfiles.set(cacheKey, request);

  return request;
}

async function fetchFreeFireProfile(uid: string, region: string, options?: { persistAsCurrentUser?: boolean }) {
  const response = await fetchWithLocalFallback(`${API_URL}/api/freefire/profile`, "/api/freefire/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ uid, region })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message ?? "Profil Free Fire indisponible");
  }

  const profile = await response.json() as FreeFireProfile;
  const cachedProfile = { ...profile, fetched_at: Date.now() };
  writeFreeFireProfileCache(freeFireProfileCacheKey(uid, region), cachedProfile, options);

  return cachedProfile;
}

export async function getFreeFireLikesQuote() {
  const response = await fetchWithLocalFallback(`${API_URL}/api/freefire/likes/quote`, "/api/freefire/likes/quote", {
    headers: { Accept: "application/json" },
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Offre likes indisponible");
  }

  return response.json() as Promise<{ likes: number; max_per_day: number; amount: number; currency: string; message: string }>;
}

export async function requestFreeFireLikes(uid: string, region: string, likes = 100) {
  const response = await fetchWithLocalFallback(`${API_URL}/api/freefire/likes/request`, "/api/freefire/likes/request", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ uid, region, likes })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message ?? "Commande de likes impossible");
  }

  return payload as {
    status: string;
    quote?: { likes: number; max_per_day: number; amount: number; currency: string; message: string };
    uid: string;
    region: string;
    message: string;
  };
}

export type PubgProfile = {
  account_id: string;
  game_id: string;
  name: string;
  platform: string;
  shard_id: string;
  title_id?: string | null;
  avatar_url: string;
  rank: { label: string; tier: string; score: number; progress: number };
  lifetime: Record<string, Record<string, number>>;
  highlights: {
    matches: number;
    wins: number;
    kills: number;
    assists: number;
    damage: number;
    top10s: number;
    longestKill: number;
  };
  recent_matches: string[];
  fetched_at?: number;
};

export type PubgMatchSummary = {
  id: string;
  map: string;
  mode: string;
  created_at: string;
  duration: number;
  shard_id: string;
  participants: Array<{
    id: string;
    name: string;
    account_id: string;
    team_id: number | null;
    rank: number | null;
    kills: number;
    assists: number;
    damage: number;
    time_survived: number;
    win_place: number | null;
  }>;
};

export type PubgLeaderboardEntry = {
  rank: number;
  account_id: string;
  name: string;
  avatar_url: string;
  stats: Record<string, number>;
};

export type FortniteProfile = {
  account_id: string;
  name: string;
  account_type: string;
  level?: number | null;
  progress?: number | null;
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
  stats?: Record<string, unknown> | null;
  raw?: Record<string, unknown> | null;
  avatar_url: string;
  fetched_at?: number;
};

export async function getFortniteProfile(accountId: string, options?: { persistAsCurrentUser?: boolean }) {
  const normalized = accountId.trim();
  const cacheKey = `astral_fortnite_profile_${normalized.toLowerCase()}`;
  const cached = readFortniteProfileCache(cacheKey);
  if (cached) return cached;

  const pending = pendingFortniteProfiles.get(cacheKey);
  if (pending) return pending;

  const request = fetchFortniteProfile(normalized, options).finally(() => pendingFortniteProfiles.delete(cacheKey));
  pendingFortniteProfiles.set(cacheKey, request);
  return request;
}

async function fetchFortniteProfile(accountId: string, options?: { persistAsCurrentUser?: boolean }) {
  const response = await fetchWithLocalFallback(`${API_URL}/api/fortnite/profile`, "/api/fortnite/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ account_id: accountId })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "Profil Fortnite indisponible");
  const profile = { ...(payload as FortniteProfile), fetched_at: Date.now() };
  writeFortniteProfileCache(`astral_fortnite_profile_${accountId.toLowerCase()}`, profile, options);
  return profile;
}

export async function getPubgProfile(gameId: string, options?: { persistAsCurrentUser?: boolean }) {
  const normalized = gameId.trim();
  const cacheKey = `astral_pubg_profile_${normalized.toLowerCase()}`;
  const cached = readPubgProfileCache(cacheKey);
  if (cached) return cached;

  const pending = pendingPubgProfiles.get(cacheKey);
  if (pending) return pending;

  const request = fetchPubgProfile(normalized, options).finally(() => pendingPubgProfiles.delete(cacheKey));
  pendingPubgProfiles.set(cacheKey, request);
  return request;
}

async function fetchPubgProfile(gameId: string, options?: { persistAsCurrentUser?: boolean }) {
  const response = await fetchWithLocalFallback(`${API_URL}/api/pubg/profile`, "/api/pubg/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ gameId, platform: "steam" })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "Profil PUBG indisponible");
  const profile = { ...(payload as PubgProfile), fetched_at: Date.now() };
  writePubgProfileCache(`astral_pubg_profile_${gameId.toLowerCase()}`, profile, options);
  return profile;
}

export async function getPubgRecentMatches(player: string) {
  const response = await fetchWithLocalFallback(
    `${API_URL}/api/pubg/matches?player=${encodeURIComponent(player)}`,
    `/api/pubg/matches?player=${encodeURIComponent(player)}`,
    { headers: { Accept: "application/json" }, credentials: "include", cache: "no-store" }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "Historique PUBG indisponible");
  return payload as { data: PubgMatchSummary[] };
}

export async function getPubgMatch(id: string) {
  const response = await fetchWithLocalFallback(
    `${API_URL}/api/pubg/match?id=${encodeURIComponent(id)}`,
    `/api/pubg/match?id=${encodeURIComponent(id)}`,
    { headers: { Accept: "application/json" }, credentials: "include", cache: "no-store" }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "Match PUBG indisponible");
  return payload as PubgMatchSummary;
}

export async function getPubgLeaderboard(params?: { season?: string; mode?: string; region?: string }) {
  const query = new URLSearchParams({
    season: params?.season ?? "lifetime",
    mode: params?.mode ?? "squad-fpp",
    region: params?.region ?? "pc-eu"
  });
  const response = await fetchWithLocalFallback(`${API_URL}/api/pubg/leaderboard?${query}`, `/api/pubg/leaderboard?${query}`, {
    headers: { Accept: "application/json" },
    credentials: "include",
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "Classement PUBG indisponible");
  return payload as { data: PubgLeaderboardEntry[] };
}

export async function comparePubgPlayers(players: string[]) {
  const response = await fetchWithLocalFallback(`${API_URL}/api/pubg/compare`, "/api/pubg/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ players, platform: "steam" })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "Comparaison PUBG indisponible");
  return payload as { data: PubgProfile[] };
}

export type HeaderNotification = {
  id: string;
  type: "announcement" | "tournament" | "blog" | "stream" | "video";
  title: string;
  description?: string | null;
  href?: string | null;
  date?: string | null;
};

export type AstralMailMessage = {
  id: string;
  mail_id?: number;
  source: "astral4gamer";
  type: "payment" | "order" | "mail";
  title: string;
  description?: string | null;
  from?: string | null;
  date?: string | null;
  unread?: boolean;
  status?: string | null;
  action_url?: string | null;
  action_label?: string | null;
};

export async function getHeaderNotifications() {
  const fallback = { unread_count: 0, items: [] as HeaderNotification[] };
  let response: Response;

  try {
    response = await fetch(`${API_URL}/api/notifications/feed`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 }
    });
  } catch {
    return fallback;
  }

  if (!response.ok) {
    return fallback;
  }

  return response.json() as Promise<{ unread_count: number; items: HeaderNotification[] }>;
}

export async function getAstralMails(token: string | null) {
  const fallback = { connected: false, needs_reconnect: true, unread_count: 0, messages: [] as AstralMailMessage[] };

  if (!token) {
    return fallback;
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}/api/user/astral-mails`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      credentials: "include"
    });
  } catch {
    return fallback;
  }

  if (!response.ok) {
    return fallback;
  }

  return response.json() as Promise<{
    connected: boolean;
    needs_reconnect?: boolean;
    unread_count: number;
    messages: AstralMailMessage[];
  }>;
}

export async function markAstralMailRead(token: string | null, mailId: number) {
  if (!token) return;

  await fetch(`${API_URL}/api/user/astral-mails/${mailId}/read`, {
    method: "PATCH",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    credentials: "include"
  }).catch(() => undefined);
}

async function fetchWithLocalFallback(primaryUrl: string, localUrl: string, init?: RequestInit) {
  try {
    return await fetch(primaryUrl, init);
  } catch {
    return fetch(localUrl, init);
  }
}

function freeFireProfileCacheKey(uid: string, region: string) {
  return `astral_freefire_profile_${region}_${uid}`;
}

function readFreeFireProfileCache(cacheKey: string): FreeFireProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(cacheKey);
    const profile = raw ? JSON.parse(raw) as FreeFireProfile : null;
    const age = Date.now() - Number(profile?.fetched_at ?? 0);

    if (!profile || age > FREE_FIRE_PROFILE_CACHE_TTL_MS) {
      return null;
    }

    return profile;
  } catch {
    return null;
  }
}

function writeFreeFireProfileCache(cacheKey: string, profile: FreeFireProfile, options?: { persistAsCurrentUser?: boolean }) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify(profile));
    if (options?.persistAsCurrentUser) {
      localStorage.setItem("astral_freefire_profile", JSON.stringify(profile));
    }
  } catch {
    // Storage can be unavailable in private contexts.
  }
}

function readFortniteProfileCache(cacheKey: string): FortniteProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(cacheKey);
    const profile = raw ? JSON.parse(raw) as FortniteProfile : null;
    const age = Date.now() - Number(profile?.fetched_at ?? 0);

    if (!profile || age > FORTNITE_PROFILE_CACHE_TTL_MS) {
      return null;
    }

    return profile;
  } catch {
    return null;
  }
}

function writeFortniteProfileCache(cacheKey: string, profile: FortniteProfile, options?: { persistAsCurrentUser?: boolean }) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify(profile));
    if (options?.persistAsCurrentUser) {
      localStorage.setItem("astral_fortnite_profile", JSON.stringify(profile));
    }
  } catch {
    // Storage can be unavailable in private contexts.
  }
}

function readPubgProfileCache(cacheKey: string): PubgProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey);
    const profile = raw ? JSON.parse(raw) as PubgProfile : null;
    const age = Date.now() - Number(profile?.fetched_at ?? 0);
    return profile && age <= PUBG_PROFILE_CACHE_TTL_MS ? profile : null;
  } catch {
    return null;
  }
}

function writePubgProfileCache(cacheKey: string, profile: PubgProfile, options?: { persistAsCurrentUser?: boolean }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(cacheKey, JSON.stringify(profile));
    if (options?.persistAsCurrentUser) {
      localStorage.setItem("astral_pubg_profile", JSON.stringify(profile));
    }
  } catch {
    // Storage can be unavailable in private contexts.
  }
}

export type ReplayMoment = {
  id: number;
  replay_id: number;
  title: string;
  description?: string | null;
  timestamp_seconds: number;
  type: "kill" | "1v4" | "booyah" | "mvp" | "funny" | "clutch";
  thumbnail_url?: string | null;
  ai_confidence?: number | null;
  status?: string;
};

export type Replay = {
  id: number;
  youtube_video_id?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  thumbnail_url?: string | null;
  duration_seconds: number;
  views_count: number;
  category: string;
  published_at?: string | null;
  teams?: string[] | null;
  hashtags?: string[] | null;
  stats?: Record<string, unknown> | null;
  tournament?: { id: number; title: string; mode: string; status: string; starts_at?: string; prize_pool?: number };
  moments?: ReplayMoment[];
  moments_count?: number;
};

export type Highlight = {
  id: number;
  replay_id?: number | null;
  moment_id?: number | null;
  youtube_video_id?: string | null;
  title: string;
  description?: string | null;
  short_url?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  format: string;
  status: string;
  views_count: number;
  hashtags?: string[] | null;
  replay?: Pick<Replay, "id" | "title" | "slug" | "category" | "thumbnail_url">;
  moment?: Pick<ReplayMoment, "id" | "type" | "timestamp_seconds">;
};

export type RecentYoutubeVideo = {
  youtube_video_id?: string | null;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  duration_seconds: number;
  views_count: number;
  published_at?: string | null;
  watch_url?: string | null;
  url?: string | null;
  slug?: string | null;
  category?: string | null;
};

export type Paginated<T> = {
  data: T[];
  links?: unknown;
  meta?: unknown;
};

export async function getRecentYoutubeVideos() {
  const response = await fetch(`${API_URL}/api/youtube/recent-videos`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 600 }
  });

  if (!response.ok) {
    return { data: [] as RecentYoutubeVideo[] };
  }

  return response.json() as Promise<{ data: RecentYoutubeVideo[] }>;
}

export async function getReplays(params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });

  const response = await fetch(`${API_URL}/api/replays${query.size ? `?${query}` : ""}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error("Replays indisponibles");
  }

  return response.json() as Promise<Paginated<Replay>>;
}

export async function getReplay(slug: string) {
  const response = await fetch(`${API_URL}/api/replays/${encodeURIComponent(slug)}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error("Replay introuvable");
  }

  return response.json() as Promise<{ data: Replay; recommended: Replay[] }>;
}

export async function getHighlights(params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });

  const response = await fetch(`${API_URL}/api/highlights${query.size ? `?${query}` : ""}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error("Highlights indisponibles");
  }

  return response.json() as Promise<Paginated<Highlight>>;
}

export type BlogPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content_html: string;
  cover_image_url?: string | null;
  status: "draft" | "scheduled" | "published" | "failed";
  blogger_post_id?: string | null;
  blogger_url?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  tournament?: Pick<Tournament, "id" | "title" | "mode" | "status" | "starts_at"> | null;
  replay?: Pick<Replay, "id" | "title" | "slug" | "thumbnail_url"> | null;
};

export type BlogPostsResponse = Paginated<BlogPost> & { steam_news?: SteamNewsItem[] };

export async function getBlogPosts(params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });

  const response = await fetch(`${API_URL}/api/blog-posts${query.size ? `?${query}` : ""}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 120 }
  });

  if (!response.ok) {
    throw new Error("Articles indisponibles");
  }

  return response.json() as Promise<BlogPostsResponse>;
}

export async function getBlogPost(slug: string) {
  const response = await fetch(`${API_URL}/api/blog-posts/${encodeURIComponent(slug)}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 120 }
  });

  if (!response.ok) {
    throw new Error("Article introuvable");
  }

  return response.json() as Promise<{ data: BlogPost }>;
}

export function googleRedirectUrl() {
  return `${API_URL}/api/auth/google/redirect`;
}

export async function getSteamRedirectUrl(token: string | null) {
  const path = token ? "/api/user/steam/redirect" : "/api/auth/steam/redirect";
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
    cache: "no-store"
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message ?? "Connexion Steam indisponible.");
  }

  return body as { url: string };
}

export async function getSteamNews(params?: { appid?: number; count?: number }) {
  const query = new URLSearchParams();
  if (params?.appid) query.set("appid", String(params.appid));
  if (params?.count) query.set("count", String(params.count));

  const response = await fetch(`${API_URL}/api/steam/news${query.size ? `?${query}` : ""}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    return { data: [] as SteamNewsItem[] };
  }

  return response.json() as Promise<{ data: SteamNewsItem[] }>;
}

export async function getGoogleProfile(token: string) {
  const response = await fetch(`${API_URL}/api/user/google-profile`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Profil Google indisponible");
  }

  return response.json() as Promise<{
    connected: boolean;
    user: { id: number; name: string; email: string; google_avatar_url?: string | null };
    google?: { email: string; name?: string | null; avatar_url?: string | null; scopes?: string[] | null } | null;
  }>;
}

export async function disconnectGoogle(token: string) {
  const response = await fetch(`${API_URL}/api/user/google-disconnect`, {
    method: "DELETE",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Deconnexion Google impossible");
  }

  return response.json();
}
