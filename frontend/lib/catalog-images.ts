import type { CatalogProduct } from "@/lib/api";

type CatalogImageProduct = Pick<CatalogProduct, "name" | "game" | "category" | "image_url">;

const fallbackImages = {
  generic: "/unnamed.png",
  freefire: "/unnamed.png",
  pubg: "/pubg-1920x1080-wallpaper-md5gr1zzjd6ic2va.jpg",
  codm: "https://media.rawg.io/media/resize/900/-/screenshots/b59/b59e44204d8af92133ea0b67af45a04c_hS4tgMe.jpg",
  mobileLegends: "https://media.rawg.io/media/resize/900/-/screenshots/ca8/ca8a011899a0743ee717c0a2f056f0af.jpg",
  fortnite: "/the-death-star-sabotage-event-for-fortnite-begins-on-july-7-cover684382a44e794.jpg",
  brawl: "https://media.rawg.io/media/resize/900/-/screenshots/ffa/ffa1cac1582ab3a81cf77e98435101ac.jpg",
  valorant: "https://media.rawg.io/media/resize/900/-/screenshots/4e2/4e2b6b1e7f0f3d3d3b5573d0ab826d6e.jpg",
  genshin: "https://media.rawg.io/media/resize/900/-/screenshots/3b7/3b7f00f2f47ed0f8c3c31ef3dbd4adc6.jpg",
  honkai: "https://media.rawg.io/media/resize/900/-/screenshots/55d/55d3c9f5ddf77405c182621b929956ea.jpg",
  honorOfKings: "https://media.rawg.io/media/resize/900/-/screenshots/826/826da47d8e91bfaf1fa8d40ebb90e40c.jpg",
  zenless: "https://media.rawg.io/media/resize/900/-/screenshots/b2a/b2a11a759dc222a112276b0ce69d08cc.jpg",
  loveAndDeepspace: "https://media.rawg.io/media/resize/900/-/screenshots/4b9/4b91d51a67ca20d0c7645467c5977200.jpg",
  apple: "https://cdn.simpleicons.org/apple/111111",
  amazon: "https://cdn.simpleicons.org/amazon/FF9900",
  discord: "https://cdn.simpleicons.org/discord/5865F2",
  googlePlay: "https://cdn.simpleicons.org/googleplay/34A853",
  netflix: "https://cdn.simpleicons.org/netflix/E50914",
  nintendo: "https://cdn.simpleicons.org/nintendo/E60012",
  playstation: "https://cdn.simpleicons.org/playstation/003791",
  razer: "https://cdn.simpleicons.org/razer/00FF00",
  steam: "https://cdn.simpleicons.org/steam/171A21",
  xbox: "https://cdn.simpleicons.org/xbox/107C10",
  spotify: "https://cdn.simpleicons.org/spotify/1DB954",
  riot: "https://cdn.simpleicons.org/riotgames/D32936",
  blizzard: "https://cdn.simpleicons.org/blizzard/148EFF",
  roblox: "https://cdn.simpleicons.org/roblox/000000"
} as const;

function catalogIdentity(product: Pick<CatalogProduct, "name" | "game" | "category">) {
  return `${product.name} ${product.game} ${product.category ?? ""}`.toLowerCase();
}

function hasBlockedCatalogImage(imageUrl: string) {
  const normalized = imageUrl.trim().toLowerCase();

  return (
    !normalized
    || normalized.startsWith("data:image/svg+xml")
    || normalized.includes("placeholder")
    || normalized.includes("not-found")
    || normalized.includes("not%20found")
    || normalized.endsWith("/icon.svg")
  );
}

export function catalogFallbackImage(product: Pick<CatalogProduct, "name" | "game" | "category">) {
  const text = catalogIdentity(product);

  if (text.includes("apple") || text.includes("itunes")) return fallbackImages.apple;
  if (text.includes("amazon")) return fallbackImages.amazon;
  if (text.includes("discord") || text.includes("nitro")) return fallbackImages.discord;
  if (text.includes("google play")) return fallbackImages.googlePlay;
  if (text.includes("netflix")) return fallbackImages.netflix;
  if (text.includes("nintendo")) return fallbackImages.nintendo;
  if (text.includes("playstation") || text.includes("psn")) return fallbackImages.playstation;
  if (text.includes("razer")) return fallbackImages.razer;
  if (text.includes("steam")) return fallbackImages.steam;
  if (text.includes("xbox")) return fallbackImages.xbox;
  if (text.includes("spotify")) return fallbackImages.spotify;
  if (text.includes("riot") || text.includes("league of legends")) return fallbackImages.riot;
  if (text.includes("blizzard") || text.includes("battle.net") || text.includes("battlenet")) return fallbackImages.blizzard;
  if (text.includes("roblox")) return fallbackImages.roblox;
  if (text.includes("free fire") || text.includes("garena")) return fallbackImages.freefire;
  if (text.includes("pubg")) return fallbackImages.pubg;
  if (text.includes("call of duty") || text.includes("cod")) return fallbackImages.codm;
  if (text.includes("mobile legend")) return fallbackImages.mobileLegends;
  if (text.includes("fortnite")) return fallbackImages.fortnite;
  if (text.includes("brawl")) return fallbackImages.brawl;
  if (text.includes("valorant")) return fallbackImages.valorant;
  if (text.includes("genshin")) return fallbackImages.genshin;
  if (text.includes("honkai")) return fallbackImages.honkai;
  if (text.includes("honor of kings") || text.includes("hok ")) return fallbackImages.honorOfKings;
  if (text.includes("zenless")) return fallbackImages.zenless;
  if (text.includes("love and deepspace") || text.includes("love deepspace")) return fallbackImages.loveAndDeepspace;

  return fallbackImages.generic;
}

export function resolveCatalogImage(product: CatalogImageProduct) {
  const imageUrl = product.image_url?.trim();
  const identity = catalogIdentity(product);

  if (imageUrl && !hasBlockedCatalogImage(imageUrl)) {
    if (!imageUrl.toLowerCase().includes("pubg") || identity.includes("pubg")) {
      return imageUrl;
    }
  }

  return catalogFallbackImage(product);
}