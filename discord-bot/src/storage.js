import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");
const cacheFile = path.join(dataDir, "cache.json");
const quotaFile = path.join(dataDir, "quota.json");

export function getCachedLookup(key, ttlMs) {
  const cache = readJson(cacheFile, {});
  const entry = cache[key];

  if (!entry || typeof entry.savedAt !== "number") {
    return null;
  }

  if (Date.now() - entry.savedAt > ttlMs) {
    delete cache[key];
    writeJson(cacheFile, cache);
    return null;
  }

  return entry.value ?? null;
}

export function setCachedLookup(key, value) {
  const cache = readJson(cacheFile, {});
  cache[key] = { savedAt: Date.now(), value };
  writeJson(cacheFile, cache);
}

export function getQuota(userId, limit, windowMs) {
  const quotas = readJson(quotaFile, {});
  const now = Date.now();
  const current = quotas[userId];

  if (!current || current.resetAt <= now) {
    return { used: 0, remaining: limit, limit, resetAt: now + windowMs };
  }

  return {
    used: current.used,
    remaining: Math.max(limit - current.used, 0),
    limit,
    resetAt: current.resetAt
  };
}

export function consumeQuota(userId, limit, windowMs) {
  const quotas = readJson(quotaFile, {});
  const now = Date.now();
  const current = quotas[userId];
  const next = !current || current.resetAt <= now
    ? { used: 0, resetAt: now + windowMs }
    : { used: Number(current.used ?? 0), resetAt: Number(current.resetAt) };

  if (next.used >= limit) {
    return { allowed: false, used: next.used, remaining: 0, limit, resetAt: next.resetAt };
  }

  next.used += 1;
  quotas[userId] = next;
  writeJson(quotaFile, quotas);

  return {
    allowed: true,
    used: next.used,
    remaining: Math.max(limit - next.used, 0),
    limit,
    resetAt: next.resetAt
  };
}

export function refundQuota(userId) {
  const quotas = readJson(quotaFile, {});
  const current = quotas[userId];

  if (!current || Number(current.used ?? 0) <= 0) {
    return;
  }

  quotas[userId] = {
    ...current,
    used: Number(current.used) - 1
  };
  writeJson(quotaFile, quotas);
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      return fallback;
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}
