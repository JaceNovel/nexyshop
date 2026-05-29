import fs from "node:fs";
import path from "node:path";

const upcomingEndpoint = "https://apis.hlgamingofficial.com/main/games/others/upcoming/api";
const cacheDir = path.resolve(process.cwd(), ".cache/upcoming-games");
const listCachePath = path.join(cacheDir, "list.json");
const cacheTtlMs = 12 * 60 * 60 * 1000;

export type UpcomingGame = {
  gameName: string;
  gameUrl: string;
  releaseDate?: string | null;
  gameImage?: string | null;
  price?: string | null;
  credits?: string | null;
};

export type UpcomingGamesResponse = {
  source?: string;
  endpoint?: string;
  result: UpcomingGame[];
  usage?: { usedToday?: number; dailyLimit?: number; remainingToday?: number } | null;
  stale?: boolean;
};

type Credentials = {
  useruid: string;
  api: string;
};

export async function fetchUpcomingGames(): Promise<UpcomingGamesResponse> {
  const cached = readCache(false);

  if (cached) {
    return cached;
  }

  try {
    const credentials = readCredentials();
    const payload = await getJson(upcomingEndpoint, {
      sectionName: "UpcomingGM",
      type: "fetch",
      useruid: credentials.useruid,
      api: credentials.api
    });

    const response = {
      source: payload.source,
      endpoint: payload.endpoint,
      result: Array.isArray(payload.result) ? payload.result : [],
      usage: payload.usage ?? null
    };

    writeCache(response);

    return response;
  } catch (error) {
    const stale = readCache(true);

    if (stale) {
      return { ...stale, stale: true };
    }

    throw error;
  }
}

function readCredentials(): Credentials {
  const env = { ...process.env, ...readBackendEnv() };
  const useruid = env.HLGAMING_USERUID;
  const api = env.HLGAMING_API_KEY;

  if (!useruid || !api) {
    throw new Error("Identifiants HL Gaming manquants côté serveur.");
  }

  return { useruid, api };
}

function readBackendEnv() {
  const envPath = path.resolve(process.cwd(), "../backend/.env");

  if (!fs.existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
        return [key, value];
      })
  );
}

async function getJson(endpoint: string, query: Record<string, string>) {
  const url = new URL(endpoint);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message ?? payload.error ?? "Service jeux à venir indisponible.");
  }

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}

function readCache(allowStale: boolean): UpcomingGamesResponse | null {
  try {
    if (!fs.existsSync(listCachePath)) {
      return null;
    }

    const cached = JSON.parse(fs.readFileSync(listCachePath, "utf8")) as { savedAt?: number; payload?: UpcomingGamesResponse };
    const age = Date.now() - Number(cached.savedAt ?? 0);

    if (!allowStale && age > cacheTtlMs) {
      return null;
    }

    return cached.payload ?? null;
  } catch {
    return null;
  }
}

function writeCache(payload: UpcomingGamesResponse) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(listCachePath, JSON.stringify({ savedAt: Date.now(), payload }, null, 2));
}
