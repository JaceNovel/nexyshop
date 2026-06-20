const defaultRegion = "sg";
const defaultPlatform = "steam";
const requestTimeoutMs = Number(process.env.ASTRAL_BACKEND_TIMEOUT_MS || 90000);

export class LookupError extends Error {
  constructor(code, message, { status = null, retryable = false, backendMessage = "", endpoint = "" } = {}) {
    super(message);
    this.name = "LookupError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.backendMessage = backendMessage;
    this.endpoint = endpoint;
  }
}

export async function lookupPlayer({ game, identifier, region, platform }) {
  const apiBaseUrl = normalizedApiBaseUrl();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  const backendToken = process.env.ASTRAL_BOT_BACKEND_TOKEN?.trim();

  if (backendToken) {
    headers["X-Astral-Bot-Token"] = backendToken;
  }

  if (game === "free_fire") {
    return postJson(`${apiBaseUrl}/api/freefire/profile`, {
      uid: identifier,
      region: region || defaultRegion
    }, headers);
  }

  if (game === "pubg") {
    return postJson(`${apiBaseUrl}/api/pubg/profile`, {
      gameId: identifier,
      platform: platform || defaultPlatform
    }, headers);
  }

  if (game === "fortnite") {
    return postJson(`${apiBaseUrl}/api/fortnite/profile`, {
      account_id: identifier
    }, headers);
  }

  throw new LookupError("GAME_UNAVAILABLE", "Ce jeu n’est pas encore disponible sur le bot Discord.");
}

export async function submitPartnershipRequest(payload) {
  const apiBaseUrl = normalizedApiBaseUrl();
  const headers = botHeaders();

  return postJson(`${apiBaseUrl}/api/partnership-requests`, payload, headers);
}

export async function fetchApprovedPartnerships() {
  const apiBaseUrl = normalizedApiBaseUrl();
  const headers = botHeaders();

  return getJson(`${apiBaseUrl}/api/bot/partnership-approvals`, headers);
}

export async function markPartnershipNotified(id) {
  const apiBaseUrl = normalizedApiBaseUrl();
  const headers = botHeaders();

  return postJson(`${apiBaseUrl}/api/bot/partnership-approvals/${id}/notified`, {}, headers);
}

export async function fetchCatalogProduct(id) {
  const apiBaseUrl = normalizedApiBaseUrl();

  return getJson(`${apiBaseUrl}/api/products/${encodeURIComponent(id)}`, {
    Accept: "application/json"
  });
}

async function postJson(url, body, headers) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  let response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new LookupError("BACKEND_TIMEOUT", "La recherche prend trop de temps.", { retryable: true, endpoint: url });
    }

    throw new LookupError("BACKEND_UNAVAILABLE", "Le service de recherche est indisponible.", { retryable: true, endpoint: url });
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw classifyBackendError(response.status, payload, url);
  }

  return payload;
}

async function getJson(url, headers) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  let response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new LookupError("BACKEND_TIMEOUT", "Le backend prend trop de temps.", { retryable: true, endpoint: url });
    }

    throw new LookupError("BACKEND_UNAVAILABLE", "Le backend est indisponible.", { retryable: true, endpoint: url });
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw classifyBackendError(response.status, payload, url);
  }

  return payload;
}

function botHeaders() {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  const backendToken = process.env.ASTRAL_BOT_BACKEND_TOKEN?.trim();

  if (backendToken) {
    headers["X-Astral-Bot-Token"] = backendToken;
  }

  return headers;
}

function classifyBackendError(status, payload, endpoint) {
  const rawMessage = String(payload.message || payload.error || "");
  const normalized = rawMessage.toLowerCase();

  if (
    status === 404
    || status === 402
    || normalized.includes("not found")
    || normalized.includes("introuvable")
    || normalized.includes("invalid uid")
    || normalized.includes("invalid id")
    || normalized.includes("incorrect")
  ) {
    return new LookupError("PLAYER_NOT_FOUND", "Aucun profil public n’a été trouvé pour cet identifiant.", { status, backendMessage: rawMessage, endpoint });
  }

  if (status === 405) {
    return new LookupError("BACKEND_ROUTE_MISMATCH", "La route backend du bot est mal configurée.", {
      status,
      retryable: true,
      backendMessage: rawMessage,
      endpoint
    });
  }

  if (
    status === 429
    || normalized.includes("rate limit")
    || normalized.includes("too many")
    || normalized.includes("quota api")
    || normalized.includes("quota dépass")
  ) {
    return new LookupError("RATE_LIMITED", "Le fournisseur limite temporairement les recherches.", { status, retryable: true, backendMessage: rawMessage, endpoint });
  }

  if (
    status >= 500
    || normalized.includes("curl")
    || normalized.includes("timeout")
    || normalized.includes("timed out")
    || normalized.includes("prend trop de temps")
    || normalized.includes("could not resolve")
    || normalized.includes("api.gameskinbo.com")
    || normalized.includes("service free fire indisponible")
    || normalized.includes("fournisseur")
  ) {
    return new LookupError("PROVIDER_UNAVAILABLE", "Le fournisseur du jeu ne répond pas pour le moment.", { status, retryable: true, backendMessage: rawMessage, endpoint });
  }

  return new LookupError("LOOKUP_FAILED", "Recherche indisponible pour le moment.", {
    status,
    retryable: true,
    backendMessage: rawMessage,
    endpoint
  });
}

function normalizedApiBaseUrl() {
  const value = requiredEnv("ASTRAL_API_BASE_URL").replace(/\/+$/, "");

  if (value.endsWith("/api")) {
    return value.slice(0, -4);
  }

  return value;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Configuration manquante: ${name}`);
  }

  return value;
}
