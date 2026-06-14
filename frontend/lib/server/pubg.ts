import fs from "node:fs";
import path from "node:path";

const apiRoot = "https://api.pubg.com";
const defaultPlatform = "steam";
const defaultRegion = "pc-eu";
const cacheDir = path.resolve(process.cwd(), ".cache/pubg-api");
const profileCacheTtlMs = 3 * 24 * 60 * 60 * 1000;
const leaderboardCacheTtlMs = 60 * 60 * 1000;
const matchCacheTtlMs = 3 * 24 * 60 * 60 * 1000;

type JsonApiResource = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: unknown }>;
};

type JsonApiResponse = {
  data?: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  links?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

type PubgHighlights = {
  matches: number;
  wins: number;
  kills: number;
  assists: number;
  damage: number;
  top10s: number;
  longestKill: number;
};

export type PubgProfile = {
  account_id: string;
  game_id: string;
  name: string;
  platform: string;
  shard_id: string;
  title_id?: string | null;
  avatar_url: string;
  rank: {
    label: string;
    tier: string;
    score: number;
    progress: number;
  };
  lifetime: Record<string, Record<string, number>>;
  highlights: PubgHighlights;
  recent_matches: string[];
  fetched_at: number;
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

export async function getPubgProfile(gameId: string, platform = defaultPlatform): Promise<PubgProfile> {
  const normalized = gameId.trim();
  if (!normalized) throw new Error("Entre ton ID PUBG.");

  const cacheKey = `profile-${platform}-${normalized.toLowerCase()}`;
  const cached = readCache<PubgProfile>(cacheKey, profileCacheTtlMs);
  if (cached) return cached;

  const player = await findPlayer(normalized, platform);
  const accountId = player.id;
  const stats = await getJson(`/shards/${platform}/players/${encodeURIComponent(accountId)}/seasons/lifetime`);
  const statsResource = stats.data as JsonApiResource | undefined;
  const lifetime = normalizeGameModeStats(statsResource?.attributes?.gameModeStats);
  const highlights = summarizeLifetime(lifetime);
  const rank = buildPubgRank(highlights);

  const profile: PubgProfile = {
    account_id: accountId,
    game_id: normalized,
    name: String(player.attributes?.name ?? normalized),
    platform,
    shard_id: String(player.attributes?.shardId ?? platform),
    title_id: player.attributes?.titleId ? String(player.attributes.titleId) : null,
    avatar_url: avatarFor(accountId),
    rank,
    lifetime,
    highlights,
    recent_matches: extractMatchIds(player),
    fetched_at: Date.now()
  };

  writeCache(cacheKey, profile);
  return profile;
}

export async function getPubgRecentMatches(accountIdOrName: string, platform = defaultPlatform) {
  const profile = accountIdOrName.startsWith("account.") ? null : await getPubgProfile(accountIdOrName, platform);
  const accountId = profile?.account_id ?? accountIdOrName;
  const player = profile ? null : await findPlayer(accountId, platform);
  const matchIds = profile?.recent_matches ?? extractMatchIds(player);
  const matches = await Promise.all(matchIds.slice(0, 8).map((id) => getPubgMatch(id, platform).catch(() => null)));
  return { data: matches.filter(Boolean) as PubgMatchSummary[] };
}

export async function getPubgMatch(matchId: string, platform = defaultPlatform): Promise<PubgMatchSummary> {
  const id = matchId.trim();
  if (!id) throw new Error("Entre un ID de match PUBG.");

  const cacheKey = `match-${platform}-${id}`;
  const cached = readCache<PubgMatchSummary>(cacheKey, matchCacheTtlMs);
  if (cached) return cached;

  const payload = await getJson(`/shards/${platform}/matches/${encodeURIComponent(id)}`, false);
  const match = payload.data as JsonApiResource | undefined;
  const included = payload.included ?? [];
  const participants = included.filter((item) => item.type === "participant").map((item) => {
    const stats = (item.attributes?.stats ?? {}) as Record<string, unknown>;
    return {
      id: item.id,
      name: String(stats.name ?? "Player"),
      account_id: String(stats.playerId ?? ""),
      team_id: numberOrNull(stats.teamId),
      rank: numberOrNull(stats.winPlace),
      kills: numberOrZero(stats.kills),
      assists: numberOrZero(stats.assists),
      damage: numberOrZero(stats.damageDealt),
      time_survived: numberOrZero(stats.timeSurvived),
      win_place: numberOrNull(stats.winPlace)
    };
  }).sort((first, second) => (first.win_place ?? 999) - (second.win_place ?? 999) || second.kills - first.kills);

  const summary: PubgMatchSummary = {
    id,
    map: String(match?.attributes?.mapName ?? "Unknown"),
    mode: String(match?.attributes?.gameMode ?? "unknown"),
    created_at: String(match?.attributes?.createdAt ?? ""),
    duration: numberOrZero(match?.attributes?.duration),
    shard_id: String(match?.attributes?.shardId ?? platform),
    participants
  };

  writeCache(cacheKey, summary);
  return summary;
}

export async function getPubgLeaderboard(seasonId = "lifetime", gameMode = "squad-fpp", region = defaultRegion) {
  const cacheKey = `leaderboard-${region}-${seasonId}-${gameMode}`;
  const cached = readCache<{ data: PubgLeaderboardEntry[] }>(cacheKey, leaderboardCacheTtlMs);
  if (cached) return cached;

  const payload = await getJson(`/shards/${region}/leaderboards/${encodeURIComponent(seasonId)}/${encodeURIComponent(gameMode)}`);
  const included = payload.included ?? [];
  const entries = included.filter((item) => item.type === "player").slice(0, 500).map((item, index) => ({
    rank: index + 1,
    account_id: item.id,
    name: String(item.attributes?.name ?? `Player ${index + 1}`),
    avatar_url: avatarFor(item.id),
    stats: normalizeFlatStats(item.attributes?.stats)
  }));

  const result = { data: entries };
  writeCache(cacheKey, result);
  return result;
}

async function findPlayer(value: string, platform: string) {
  if (value.startsWith("account.")) {
    const payload = await getJson(`/shards/${platform}/players/${encodeURIComponent(value)}`);
    return payload.data as JsonApiResource;
  }

  const payload = await getJson(`/shards/${platform}/players?filter[playerNames]=${encodeURIComponent(value)}`);
  const players = Array.isArray(payload.data) ? payload.data : [];
  const player = players[0];
  if (!player) throw new Error("Joueur PUBG introuvable.");
  return player;
}

async function getJson(pathname: string, auth = true): Promise<JsonApiResponse> {
  const headers: Record<string, string> = { Accept: "application/vnd.api+json" };
  if (auth) headers.Authorization = `Bearer ${readApiKey()}`;

  const response = await fetch(`${apiRoot}${pathname}`, { headers, cache: "no-store" });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("Clé PUBG API invalide ou absente.");
    if (response.status === 404) throw new Error("Donnée PUBG introuvable.");
    if (response.status === 429) throw new Error("Limite PUBG API atteinte. Réessaie dans une minute.");
    throw new Error("Service PUBG indisponible.");
  }
  return response.json() as Promise<JsonApiResponse>;
}

function readApiKey() {
  const env = { ...process.env, ...readBackendEnv() };
  const key = env.PUBG_API_KEY ?? env.PUBG_API_TOKEN;
  if (!key) throw new Error("Ajoute PUBG_API_KEY dans l'environnement serveur.");
  return key;
}

function readBackendEnv() {
  const envPath = path.resolve(process.cwd(), "../backend/.env");
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(fs.readFileSync(envPath, "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
  }));
}

function extractMatchIds(player: JsonApiResource | null) {
  const data = player?.relationships?.matches?.data;
  return Array.isArray(data) ? data.map((match) => String((match as { id?: string }).id ?? "")).filter(Boolean) : [];
}

function normalizeGameModeStats(value: unknown) {
  const modes = (value ?? {}) as Record<string, Record<string, unknown>>;
  return Object.fromEntries(Object.entries(modes).map(([mode, stats]) => [mode, normalizeFlatStats(stats)]));
}

function normalizeFlatStats(value: unknown) {
  const stats = (value ?? {}) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(stats).map(([key, item]) => [key, numberOrZero(item)]));
}

function summarizeLifetime(lifetime: Record<string, Record<string, number>>): PubgHighlights {
  return Object.values(lifetime).reduce<PubgHighlights>((total, stats) => ({
    matches: total.matches + numberOrZero(stats.roundsPlayed),
    wins: total.wins + numberOrZero(stats.wins),
    kills: total.kills + numberOrZero(stats.kills),
    assists: total.assists + numberOrZero(stats.assists),
    damage: total.damage + numberOrZero(stats.damageDealt),
    top10s: total.top10s + numberOrZero(stats.top10s),
    longestKill: Math.max(total.longestKill, numberOrZero(stats.longestKill))
  }), { matches: 0, wins: 0, kills: 0, assists: 0, damage: 0, top10s: 0, longestKill: 0 });
}

function buildPubgRank(stats: PubgProfile["highlights"]) {
  const score = Math.round(stats.wins * 80 + stats.top10s * 12 + stats.kills * 4 + stats.damage / 100);
  const ranks = [
    ["Bronze", 0], ["Silver", 600], ["Gold", 1400], ["Platinum", 2600], ["Diamond", 4200], ["Master", 6400], ["Grandmaster", 9000]
  ] as const;
  const rank = [...ranks].reverse().find(([, threshold]) => score >= threshold) ?? ranks[0];
  const next = ranks.find(([, threshold]) => threshold > rank[1]);
  return {
    label: rank[0],
    tier: next ? `${Math.max(next[1] - score, 0)} pts avant ${next[0]}` : "Top joueur",
    score,
    progress: next ? Math.min(100, ((score - rank[1]) / (next[1] - rank[1])) * 100) : 100
  };
}

function avatarFor(accountId: string) {
  return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(accountId)}`;
}

function numberOrZero(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function numberOrNull(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function readCache<T>(key: string, ttl: number): T | null {
  const file = cachePath(key);
  if (!fs.existsSync(file)) return null;
  try {
    const payload = JSON.parse(fs.readFileSync(file, "utf8")) as { savedAt: number; value: T };
    return Date.now() - payload.savedAt <= ttl ? payload.value : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cachePath(key), JSON.stringify({ savedAt: Date.now(), value }, null, 2));
}

function cachePath(key: string) {
  return path.join(cacheDir, `${key.replace(/[^a-z0-9._-]/gi, "_")}.json`);
}
