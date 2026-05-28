const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
export const API_BASE_URL = API_URL;

export type CatalogProduct = {
  id: number;
  name: string;
  game: string;
  sku?: string;
  price: number;
  currency: string;
  image_url?: string | null;
  description?: string | null;
  delivery?: string;
  requires_uid?: boolean;
  amounts?: string[];
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
    throw new Error("Catalogue fournisseur indisponible");
  }

  return response.json() as Promise<{ data: CatalogProduct[] }>;
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
  rules?: Record<string, number> | null;
  teams_count?: number;
  teams?: Array<{ id: number; name: string; points: number; kills: number; status: string }>;
};

export async function getTournaments() {
  const response = await fetch(`${API_URL}/api/tournaments`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 }
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

export type Leaderboards = {
  top_players: Array<{ id: number; name: string; points: number; kills: number; guild_id?: number | null }>;
  top_killers: Array<{ id: number; name: string; points: number; kills: number; guild_id?: number | null }>;
  top_guilds: Array<{ guild_id: number | null; points: number; kills: number }>;
};

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

export async function createGuestOrder(payload: { product_id: number; variation_id?: string | null; game_uid: string; nickname: string; quantity?: number }) {
  const response = await fetch(`${API_URL}/api/orders/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Commande impossible pour le moment");
  }

  return response.json();
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

  if (!response.ok) {
    throw new Error("Initialisation paiement impossible");
  }

  return response.json() as Promise<{ payment: { id: number; reference: string; status: string }; checkout_url: string }>;
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

export type Paginated<T> = {
  data: T[];
  links?: unknown;
  meta?: unknown;
};

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

  return response.json() as Promise<Paginated<BlogPost>>;
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
