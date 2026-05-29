import fs from "node:fs";
import path from "node:path";

const accountEndpoint = "https://proapis.hlgamingofficial.com/main/games/freefire/account/api";
const validationEndpoint = "https://proapis.hlgamingofficial.com/main/games/freefire/validation/api";
const metaEndpoint = "https://proapis.hlgamingofficial.com/main/games/freefire/meta/api";
const supportedRegions = new Set(["in", "br", "sg", "ru", "id", "tw", "us", "vn", "th", "me", "pk", "bd", "cis"]);
const mediaDir = path.resolve(process.cwd(), "public/freefire-media");
const cacheDir = path.resolve(process.cwd(), ".cache/freefire-profiles");
const profileCacheTtlMs = 6 * 60 * 60 * 1000;

type Credentials = {
  useruid: string;
  api: string;
};

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
  const payload = await getJson(validationEndpoint, {
    sectionName: "freefireValidation",
    useruid: credentials.useruid,
    api: credentials.api,
    uid,
    region: normalizedRegion.toUpperCase()
  });

  const result = payload.result ?? {};

  if (result.valid !== true) {
    throw new Error("ID Free Fire incorrect.");
  }

  return {
    uid: String(result.uid ?? uid),
    region: normalizeRegion(String(result.AccountRegion ?? result.region ?? normalizedRegion)),
    nickname: String(result.AccountName ?? `FreeFire_${uid}`),
    level: result.AccountLevel ?? null,
    verified: true,
    usage: payload.usage ?? null
  };
}

export async function getFreeFirePlayerProfile(uid: string, region: string): Promise<FreeFireServerProfile> {
  const cachedProfile = readProfileCache(uid, region);

  if (cachedProfile) {
    return cachedProfile;
  }

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
    account = await getJson(accountEndpoint, {
      sectionName: "AllData",
      PlayerUid: uid,
      region: realRegion,
      useruid: credentials.useruid,
      api: credentials.api
    });
  } catch (error) {
    const staleProfile = readProfileCache(uid, realRegion, true) ?? readProfileCache(uid, region, true);

    if (staleProfile && isQuotaError(error)) {
      return { ...staleProfile, stale: true };
    }

    throw error;
  }

  const visuals = await getJson(metaEndpoint, {
    sectionName: "image",
    useruid: credentials.useruid,
    api: credentials.api,
    playeruid: uid,
    region: realRegion,
    isBeta: "true",
    cacheBuster: String(Date.now())
  }).catch(() => ({ result: null, usage: null }));

  const accountInfo = account.result?.AccountInfo ?? {};
  const visualResult = visuals.result ?? {};
  let outfitUrl = visualResult.outfitUrl ?? visualResult.url ?? null;
  let bannerUrl = visualResult.bannerUrl ?? null;

  if (isMissingImageUrl(outfitUrl) && accountInfo.AccountAvatarId) {
    outfitUrl = await imageByCode(String(accountInfo.AccountAvatarId), credentials).catch(() => null);
  }

  if (isMissingImageUrl(bannerUrl) && accountInfo.AccountBannerId) {
    bannerUrl = await imageByCode(String(accountInfo.AccountBannerId), credentials).catch(() => null);
  }

  const localOutfitUrl = await persistRemoteImage(outfitUrl, `${uid}-avatar`).catch(() => null);
  const localBannerUrl = await persistRemoteImage(bannerUrl, `${uid}-banner`).catch(() => null);
  const finalOutfitUrl = localOutfitUrl ?? (isGenericHlImage(outfitUrl) ? null : outfitUrl);
  const finalBannerUrl = localBannerUrl ?? (isGenericHlImage(bannerUrl) ? null : bannerUrl);

  const profile = {
    uid: validation.uid,
    region: realRegion,
    nickname: String(accountInfo.AccountName ?? validation.nickname),
    level: accountInfo.AccountLevel ?? validation.level ?? null,
    likes: accountInfo.AccountLikes ?? null,
    br_rank_points: accountInfo.BrRankPoint ?? null,
    cs_rank_points: accountInfo.CsRankPoint ?? null,
    rank: {
      br: accountInfo.BrMaxRank ?? null,
      cs: accountInfo.CsMaxRank ?? null,
      season: accountInfo.AccountSeasonId ?? null
    },
    guild: account.result?.GuildInfo ?? null,
    stats: account.result?.playerStats ?? null,
    outfit_url: finalOutfitUrl,
    banner_url: finalBannerUrl,
    account: account.result ?? null,
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

function normalizeRegion(region: string) {
  const normalized = region.trim().toLowerCase() === "ind" ? "in" : region.trim().toLowerCase();

  if (!supportedRegions.has(normalized)) {
    throw new Error("Région Free Fire non supportée.");
  }

  return normalized;
}

async function imageByCode(code: string, credentials: Credentials) {
  const payload = await getJson(metaEndpoint, {
    sectionName: "image",
    useruid: credentials.useruid,
    api: credentials.api,
    img_code: code,
    cacheBuster: String(Date.now())
  });

  return payload.result?.url ?? null;
}

async function getJson(endpoint: string, query: Record<string, string>) {
  const url = new URL(endpoint);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message ?? "Service Free Fire indisponible.");
  }

  return payload;
}

function isMissingImageUrl(url?: string | null) {
  return !url || decodeURIComponent(url).toLowerCase().includes("not found");
}

async function persistRemoteImage(url: string | null | undefined, name: string) {
  if (isMissingImageUrl(url) || isGenericHlImage(url)) {
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

function isGenericHlImage(url?: string | null) {
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

function isQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return message.includes("daily api request limit") || message.includes("quota") || message.includes("too many requests");
}
