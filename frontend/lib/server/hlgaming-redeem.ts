import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const rewardEndpoint = "https://proapis.hlgamingofficial.com/main/games/freefire/reward/api";
const cacheDir = path.resolve(process.cwd(), ".cache/freefire-redeem");
const codesCachePath = path.join(cacheDir, "today.json");
const settingsPath = path.join(cacheDir, "settings.json");
const publicationDurationMs = 24 * 60 * 60 * 1000;

export type RedeemCodeItem = {
  id: string;
  preview: string;
  length: number;
  code: string;
  source?: string;
  date?: string;
  articleTitle?: string;
  articleLink?: string;
};

export type RedeemResponse = {
  enabled: boolean;
  message: string;
  codes: RedeemCodeItem[];
  usage?: { usedToday?: number; dailyLimit?: number; remainingToday?: number } | null;
  stale?: boolean;
  publishedAt?: string;
  enabledUntil?: string;
};

export type PublicRedeemCodeItem = Omit<RedeemCodeItem, "code">;

export type PublicRedeemResponse = Omit<RedeemResponse, "codes"> & {
  codes: PublicRedeemCodeItem[];
  claimedToday?: boolean;
};

type RedeemClaim = {
  codeId: string;
  code: string;
  claimedAt: string;
};

type Credentials = {
  useruid: string;
  api: string;
};

export async function getRedeemCodes(): Promise<RedeemResponse> {
  const settings = getRedeemSettings();

  if (!settings.enabled) {
    return {
      enabled: false,
      message: "Les redeem codes du jour ne sont pas encore affichés.",
      codes: []
    };
  }

  const cached = readCodesCache();

  if (cached) {
    return {
      ...cached,
      enabled: true,
      publishedAt: settings.publishedAt ?? undefined,
      enabledUntil: settings.enabledUntil ?? undefined
    };
  }

  throw new Error("Aucun redeem code n’a encore été publié aujourd’hui.");
}

export async function getPublicRedeemCodes(userId?: string | null): Promise<PublicRedeemResponse> {
  const response = await getRedeemCodes();

  return {
    ...response,
    codes: response.codes.map(({ code: _code, ...code }) => code),
    claimedToday: userId ? Boolean(readTodayClaims()[userId]) : false
  };
}

export async function claimRedeemCode(codeId: string, userId: string) {
  if (!codeId) {
    throw new Error("Code introuvable.");
  }

  const response = await getRedeemCodes();

  if (!response.enabled) {
    throw new Error("Les redeem codes du jour ne sont pas activés.");
  }

  const claims = readTodayClaims();
  const existingClaim = claims[userId];

  if (existingClaim) {
    return {
      alreadyClaimed: true,
      code: existingClaim.code,
      message: "Tu as déjà copié ton code gratuit aujourd’hui."
    };
  }

  const selectedCode = response.codes.find((code) => code.id === codeId);

  if (!selectedCode) {
    throw new Error("Ce code n’est plus disponible.");
  }

  const claim = {
    codeId,
    code: selectedCode.code,
    claimedAt: new Date().toISOString()
  };

  claims[userId] = claim;
  writeTodayClaims(claims);

  return {
    alreadyClaimed: false,
    code: selectedCode.code,
    message: "Code copié. Tente-le vite sur le serveur compatible."
  };
}

export function getRedeemSettings() {
  try {
    if (!fs.existsSync(settingsPath)) {
      return { enabled: false, publishedAt: null, enabledUntil: null };
    }

    const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as { enabled?: boolean; publishedAt?: string | null; enabledUntil?: string | null };
    const enabledUntil = parsed.enabledUntil ?? null;
    const isStillPublished = Boolean(parsed.enabled && enabledUntil && Date.now() < new Date(enabledUntil).getTime());

    return {
      enabled: isStillPublished,
      publishedAt: parsed.publishedAt ?? null,
      enabledUntil
    };
  } catch {
    return { enabled: false, publishedAt: null, enabledUntil: null };
  }
}

export function setRedeemSettings(enabled: boolean) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify({ enabled, publishedAt: null, enabledUntil: null, updatedAt: new Date().toISOString() }, null, 2));

  return getRedeemSettings();
}

export async function publishRedeemCodesForToday() {
  const credentials = readCredentials();
  const payload = await getJson(rewardEndpoint, {
    sectionName: "redeemCode",
    type: "fetch",
    useruid: credentials.useruid,
    api: credentials.api
  });

  const publishedAt = new Date();
  const enabledUntil = new Date(publishedAt.getTime() + publicationDurationMs);
  const codes = normalizeRedeemCodes(payload.result?.redeem_data);
  const response = {
    enabled: true,
    message: "Les codes disponibles peuvent provenir de différents serveurs Free Fire. Sélectionne un code et tente de trouver celui compatible avec ta région.",
    codes,
    usage: payload.usage ?? null,
    publishedAt: publishedAt.toISOString(),
    enabledUntil: enabledUntil.toISOString()
  };

  writeCodesCache(response);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        enabled: true,
        publishedAt: publishedAt.toISOString(),
        enabledUntil: enabledUntil.toISOString(),
        updatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  return {
    ...getRedeemSettings(),
    codesCount: codes.length,
    usage: payload.usage ?? null
  };
}

function normalizeRedeemCodes(redeemData: unknown): RedeemCodeItem[] {
  if (!Array.isArray(redeemData)) {
    return [];
  }

  const seen = new Set<string>();
  const codes: RedeemCodeItem[] = [];

  for (const article of redeemData as Array<Record<string, unknown>>) {
    const redeemCodes = article.redeem_codes;

    if (!Array.isArray(redeemCodes)) continue;

    for (const rawCode of redeemCodes) {
      const code = String(rawCode).trim().toUpperCase();

      if (!code || seen.has(code)) continue;

      seen.add(code);
      codes.push({
        id: createCodeId(code),
        preview: maskRedeemCode(code),
        length: code.length,
        code,
        source: typeof article.source === "string" ? article.source : undefined,
        date: typeof article.date === "string" ? article.date : undefined,
        articleTitle: typeof article.article_title === "string" ? article.article_title : undefined,
        articleLink: typeof article.article_link === "string" ? article.article_link : undefined
      });
    }
  }

  return codes;
}

function createCodeId(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex").slice(0, 24);
}

function maskRedeemCode(code: string) {
  const start = code.slice(0, 4);
  const hiddenLength = Math.max(6, code.length - start.length);

  return `${start}${"•".repeat(hiddenLength)}`;
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
    throw new Error(payload.message ?? payload.error ?? "Redeem codes indisponibles.");
  }

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}

function readCodesCache(): RedeemResponse | null {
  try {
    if (!fs.existsSync(codesCachePath)) return null;

    const cached = JSON.parse(fs.readFileSync(codesCachePath, "utf8")) as { savedAt?: number; payload?: RedeemResponse };

    return cached.payload ? withCodeMetadata(cached.payload) : null;
  } catch {
    return null;
  }
}

function writeCodesCache(payload: RedeemResponse) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(codesCachePath, JSON.stringify({ savedAt: Date.now(), payload }, null, 2));
}

function withCodeMetadata(payload: RedeemResponse): RedeemResponse {
  return {
    ...payload,
    codes: payload.codes
      .filter((item) => item.code)
      .map((item) => ({
        ...item,
        id: item.id ?? createCodeId(item.code),
        preview: item.preview ?? maskRedeemCode(item.code),
        length: item.length ?? item.code.length
      }))
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function claimsPath() {
  return path.join(cacheDir, `claims-${todayKey()}.json`);
}

function readTodayClaims(): Record<string, RedeemClaim> {
  try {
    const filePath = claimsPath();

    if (!fs.existsSync(filePath)) {
      return {};
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, RedeemClaim>;
  } catch {
    return {};
  }
}

function writeTodayClaims(claims: Record<string, RedeemClaim>) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(claimsPath(), JSON.stringify(claims, null, 2));
}
