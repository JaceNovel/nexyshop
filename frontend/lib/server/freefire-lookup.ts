import fs from "node:fs";
import path from "node:path";

const supportedRegions = new Set(["in", "ind", "br", "sg", "ru", "id", "tw", "us", "vn", "th", "me", "pk", "bd", "cis", "sac", "na"]);
const mediaDir = path.resolve(process.cwd(), "public/freefire-media");
const cacheDir = path.resolve(process.cwd(), ".cache/freefire-profiles");
const apiCacheDir = path.resolve(process.cwd(), ".cache/freefire-api");
const profileCacheTtlMs = 6 * 60 * 60 * 1000;
const validationCacheTtlMs = 12 * 60 * 60 * 1000;
const pendingRequests = new Map<string, Promise<unknown>>();

type Credentials = {
  api: string;
  accountEndpoint: string;
};

type JsonRecord = Record<string, unknown>;

type FreeFireServerProfile = {
  uid: string;
  region: string;
  nickname: string;
  level: unknown;
  likes: unknown;
  br_rank_points: unknown;
  cs_rank_points: unknown;
  rank: { br: unknown; cs: unknown; season: unknown };
  guild: unknown;
  stats: unknown;
  outfit_url: string | null | undefined;
  banner_url: string | null | undefined;
  account: unknown;
  usage: unknown;
  stale?: boolean;
};

export async function validateFreeFirePlayer(uid: string, region: string) {
  const credentials = readCredentials();
  const normalizedRegion = normalizeRegion(region);
  const cacheKey = `validation-${normalizedRegion}-${uid}`;
  const cachedValidation = readApiCache(cacheKey, validationCacheTtlMs);

  if (cachedValidation !== undefined) {
    return cachedValidation as {
      uid: string;
      region: string;
      nickname: string;
      level: unknown;
      verified: boolean;
      usage: unknown;
    };
  }

  return dedupe(cacheKey, async () => {
    const payload = await getLookupAccount(uid, normalizedRegion, credentials);
    const payloadResult = asRecord(payload.result);
    const result = asRecord(payload.AccountInfo ?? payloadResult.AccountInfo);

    if (!result.AccountName) {
      throw new Error("ID Free Fire incorrect.");
    }

    const validation = {
      uid: String(result.uid ?? uid),
      region: normalizeRegion(String(result.AccountRegion ?? result.region ?? normalizedRegion)),
      nickname: String(result.AccountName ?? `FreeFire_${uid}`),
      level: result.AccountLevel ?? null,
      verified: true,
      usage: payload.usage ?? null
    };

    writeApiCache(cacheKey, validation);

    return validation;
  }) as Promise<{
    uid: string;
    region: string;
    nickname: string;
    level: unknown;
    verified: boolean;
    usage: unknown;
  }>;
}

export async function getFreeFirePlayerProfile(uid: string, region: string): Promise<FreeFireServerProfile> {
  const normalizedRegion = normalizeRegion(region);
  const requestKey = `profile-${normalizedRegion}-${uid}`;
  const cachedProfile = readProfileCache(uid, region);

  if (cachedProfile) {
    return cachedProfile;
  }

  return dedupe(requestKey, () => fetchFreeFirePlayerProfile(uid, normalizedRegion)) as Promise<FreeFireServerProfile>;
}

async function fetchFreeFirePlayerProfile(uid: string, region: string): Promise<FreeFireServerProfile> {
  const credentials = readCredentials();
  let validation;

  try {
    validation = await validateFreeFirePlayer(uid, region);
  } catch (error) {
    const staleProfile = readProfileCache(uid, region, true);

    if (staleProfile && isQuotaError(error)) {
      return { ...staleProfile, stale: true };
    }

    throw error;
  }

  const realRegion = normalizeRegion(validation.region);

  let account;

  try {
    account = { result: await getLookupAccount(uid, realRegion, credentials), usage: null };
  } catch (error) {
    const staleProfile = readProfileCache(uid, realRegion, true) ?? readProfileCache(uid, region, true);

    if (staleProfile && isQuotaError(error)) {
      return { ...staleProfile, stale: true };
    }

    throw error;
  }

  const visuals = { result: null, usage: null };

  const accountResult = asRecord(account.result);
  const accountInfo = asRecord(accountResult.AccountInfo);
  const profileInfo = asRecord(accountResult.AccountProfileInfo);
  const visualResult = asRecord(visuals.result);
  let outfitUrl =
    stringValue(visualResult.outfitUrl) ??
    stringValue(visualResult.url) ??
    stringValue(accountInfo.AvatarUrl) ??
    stringValue(accountInfo.avatarUrl) ??
    stringValue(accountInfo.avatar_url) ??
    stringValue(accountResult.avatar_url) ??
    null;
  let bannerUrl =
    stringValue(visualResult.bannerUrl) ??
    stringValue(accountInfo.BannerUrl) ??
    stringValue(accountInfo.bannerUrl) ??
    stringValue(accountInfo.banner_url) ??
    stringValue(accountResult.banner_url) ??
    null;

  const localOutfitUrl = await persistRemoteImage(outfitUrl, `${uid}-avatar`).catch(() => null);
  const localBannerUrl = await persistRemoteImage(bannerUrl, `${uid}-banner`).catch(() => null);
  const finalOutfitUrl = localOutfitUrl ?? (isGenericProviderImage(outfitUrl) ? null : outfitUrl);
  const finalBannerUrl = localBannerUrl ?? (isGenericProviderImage(bannerUrl) ? null : bannerUrl);

  const profile = {
    uid: validation.uid,
    region: realRegion,
    nickname: String(accountInfo.AccountName ?? validation.nickname),
    level: accountInfo.AccountLevel ?? validation.level ?? null,
    likes: accountInfo.AccountLikes ?? null,
    br_rank_points: profileInfo.BrRankPoint ?? accountInfo.BrRankPoint ?? null,
    cs_rank_points: profileInfo.CsRankPoint ?? accountInfo.CsRankPoint ?? null,
    rank: {
      br: profileInfo.BrMaxRank ?? accountInfo.BrMaxRank ?? null,
      cs: profileInfo.CsMaxRank ?? accountInfo.CsMaxRank ?? null,
      season: accountInfo.AccountSeasonId ?? null
    },
    guild: accountResult.GuildInfo ?? null,
    stats: accountResult.playerStats ?? accountResult.PlayerStats ?? null,
    outfit_url: finalOutfitUrl,
    banner_url: finalBannerUrl,
    account: accountResult,
    usage: {
      validation: validation.usage ?? null,
      account: account.usage ?? null,
      visuals: visuals.usage ?? null
    }
  };

  writeProfileCache(uid, realRegion, profile);

  return profile;
}

export function getLikesQuote(likes = 100) {
  return {
    likes: Math.min(likes, 100),
    max_per_day: 100,
    amount: 300,
    currency: "XOF",
    message: "100 likes Free Fire coûtent 300 FCFA."
  };
}

function readCredentials(): Credentials {
  const env = { ...process.env, ...readBackendEnv() };
  const api = env.FREEFIRE_LOOKUP_API_KEY || env.GAMESKINBO_API_KEY;
  const accountEndpoint = env.FREEFIRE_LOOKUP_ENDPOINT || env.GAMESKINBO_FREEFIRE_ENDPOINT;

  if (!api || !accountEndpoint) {
    throw new Error("Service Free Fire indisponible.");
  }

  return { api, accountEndpoint };
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

function normalizeRegion(region: string) {
  const normalized = region.trim().toLowerCase() === "ind" ? "in" : region.trim().toLowerCase();

  if (!supportedRegions.has(normalized)) {
    throw new Error("Région Free Fire non supportée.");
  }

  return normalized;
}

async function getLookupAccount(uid: string, region: string, credentials: Credentials) {
  const query: Record<string, string> = { uid };
  const apiRegion = providerRegion(region);

  if (apiRegion) {
    query.region = apiRegion;
  }

  return getJson(credentials.accountEndpoint, query, credentials.api);
}

async function getJson(endpoint: string, query: Record<string, string>, apiKey: string) {
  const url = new URL(endpoint);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (response.status === 429) {
    throw new Error("Service Free Fire temporairement indisponible. Réessaie plus tard.");
  }

  if (response.status === 401) {
    throw new Error("Service Free Fire indisponible.");
  }

  if (!response.ok) {
    throw new Error("Service Free Fire indisponible.");
  }

  return payload;
}

function isMissingImageUrl(url?: string | null) {
  return !url || decodeURIComponent(url).toLowerCase().includes("not found");
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function providerRegion(region: string) {
  const normalized = normalizeRegion(region);
  const map: Record<string, string> = {
    in: "IND",
    ind: "IND",
    bd: "BD",
    br: "BR",
    us: "US",
    sac: "SAC",
    na: "NA",
    id: "ID",
    sg: "SG",
    pk: "PK"
  };

  return map[normalized] ?? null;
}

async function persistRemoteImage(url: string | null | undefined, name: string) {
  if (isMissingImageUrl(url) || isGenericProviderImage(url)) {
    return null;
  }

  const remoteUrl = url as string;
  const extension = imageExtension(remoteUrl);
  const fileName = `${name}.${extension}`;
  const filePath = path.join(mediaDir, fileName);

  if (fs.existsSync(filePath)) {
    return `/freefire-media/${fileName}`;
  }

  const response = await fetch(remoteUrl, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.startsWith("image/")) {
    return null;
  }

  fs.mkdirSync(mediaDir, { recursive: true });
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return `/freefire-media/${fileName}`;
}

function imageExtension(url: string) {
  const pathname = new URL(url).pathname.toLowerCase();

  if (pathname.endsWith(".png")) return "png";
  if (pathname.endsWith(".webp")) return "webp";

  return "jpg";
}

function isGenericProviderImage(url?: string | null) {
  if (!url) return true;

  const decoded = decodeURIComponent(url).toLowerCase();

  return decoded.includes("hl gaming official");
}

function profileCachePath(uid: string, region: string) {
  return path.join(cacheDir, `${uid}-${normalizeRegion(region)}.json`);
}

function readProfileCache(uid: string, region: string, allowStale = false): FreeFireServerProfile | null {
  try {
    const filePath = profileCachePath(uid, region);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const cached = JSON.parse(fs.readFileSync(filePath, "utf8")) as { savedAt?: number; profile?: unknown };
    const age = Date.now() - Number(cached.savedAt ?? 0);

    if (!allowStale && age > profileCacheTtlMs) {
      return null;
    }

    return cached.profile as FreeFireServerProfile;
  } catch {
    return null;
  }
}

function writeProfileCache(uid: string, region: string, profile: unknown) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(profileCachePath(uid, region), JSON.stringify({ savedAt: Date.now(), profile }, null, 2));
}

function apiCachePath(key: string) {
  return path.join(apiCacheDir, `${key.replace(/[^a-z0-9._-]/gi, "_")}.json`);
}

function readApiCache(key: string, ttlMs: number) {
  try {
    const filePath = apiCachePath(key);

    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    const cached = JSON.parse(fs.readFileSync(filePath, "utf8")) as { savedAt?: number; value?: unknown };
    const age = Date.now() - Number(cached.savedAt ?? 0);

    if (age > ttlMs) {
      return undefined;
    }

    return cached.value;
  } catch {
    return undefined;
  }
}

function writeApiCache(key: string, value: unknown) {
  fs.mkdirSync(apiCacheDir, { recursive: true });
  fs.writeFileSync(apiCachePath(key), JSON.stringify({ savedAt: Date.now(), value }, null, 2));
}

function dedupe<T>(key: string, factory: () => Promise<T>) {
  const pending = pendingRequests.get(key);

  if (pending) {
    return pending as Promise<T>;
  }

  const request = factory().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, request);

  return request;
}

function isQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return message.includes("daily api request limit") || message.includes("quota") || message.includes("too many requests");
}
