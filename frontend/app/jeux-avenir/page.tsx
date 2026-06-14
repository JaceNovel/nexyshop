import type { Metadata } from "next";
import { Gamepad2, Gift, Heart, Trophy } from "lucide-react";
import { LaunchAlerts } from "@/components/launch-alerts";
import { SiteHeader } from "@/components/site-header";
import { UpcomingCountdown } from "@/components/upcoming-countdown";
import { UpcomingGameImage } from "@/components/upcoming-game-image";
import { getUpcomingGames, type UpcomingGame } from "@/lib/api";

export const metadata: Metadata = {
  title: "Jeux à venir | Astral4Gamer",
  description: "Découvre les prochains jeux qui vont rejoindre l’univers Astral4Gamer."
};

const categories = ["Tous les jeux", "Battle Royale", "FPS / Shooter", "MOBA", "RPG", "Sports", "Stratégie", "Course", "Autres"] as const;
const sortOptions = [
  { value: "release", label: "Date de sortie" },
  { value: "name", label: "Nom du jeu" },
  { value: "price", label: "Prix" }
] as const;
const characterImage = "/ChatGPT%20Image%2029%20mai%202026,%2014_34_08.png";

export default async function UpcomingGamesPage({ searchParams }: { searchParams?: Promise<{ categorie?: string; tri?: string }> }) {
  const params = await searchParams;
  const activeCategory = params?.categorie ?? "Tous les jeux";
  const sort = params?.tri ?? "release";
  const payload = await getUpcomingGames().catch(() => ({ result: [], steam_news: [], usage: null, stale: false }));
  const games = sortGames(payload.result.slice(0, 48), sort);
  const steamNews = payload.steam_news ?? [];
  const filteredGames = activeCategory === "Tous les jeux"
    ? games
    : games.filter((game) => categorizeGame(game) === activeCategory);

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-[#0b1220]">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-[#e6e9f0] bg-white">
        <div className="absolute inset-y-0 right-0 w-[54%] bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.72)),radial-gradient(circle_at_58%_58%,rgba(255,31,47,.16),transparent_36%)]" />
        <img src={characterImage} alt="" className="absolute bottom-0 right-[7%] hidden h-[315px] w-auto object-contain lg:block" />
        <div className="absolute bottom-0 right-0 hidden h-full w-[48%] bg-[linear-gradient(110deg,transparent,rgba(255,31,47,.12)),linear-gradient(0deg,rgba(255,255,255,.92),transparent_45%)] lg:block" />

        <div className="relative mx-auto max-w-[1500px] px-5 py-10 lg:px-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-black tracking-normal sm:text-5xl">Jeux à venir</h1>
            <p className="mt-3 max-w-xl text-sm font-black text-[#293246]">Découvrez les prochains jeux qui vont rejoindre l'univers Astral4Gamer.</p>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#667085]">
              Restez à l’affût des nouveautés, inscrivez-vous et soyez parmi les premiers à jouer, participer aux tournois et gagner des récompenses exclusives.
            </p>
          </div>

          <div className="mt-8 grid max-w-[760px] gap-4 md:grid-cols-3">
            <HeroBenefit icon={<Gamepad2 className="h-6 w-6" />} title="Nouveautés exclusives" text="Soyez les premiers informés" />
            <HeroBenefit icon={<Trophy className="h-6 w-6" />} title="Tournois dès le lancement" text="Compétitions & gros cashprize" />
            <HeroBenefit icon={<Gift className="h-6 w-6" />} title="Récompenses spéciales" text="Pour les early players" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-5 py-6 lg:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <a
                key={category}
                href={category === "Tous les jeux" ? "/jeux-avenir" : `/jeux-avenir?categorie=${encodeURIComponent(category)}&tri=${encodeURIComponent(sort)}`}
                className={`inline-flex h-9 items-center rounded-lg border px-4 text-xs font-black transition ${
                  activeCategory === category
                    ? "border-[#ef233c] bg-[#ef233c] text-white shadow-[0_12px_28px_rgba(239,35,60,.22)]"
                    : "border-[#e1e6ef] bg-white text-[#111827] hover:border-[#ef233c] hover:text-[#ef233c]"
                }`}
              >
                {category}
              </a>
            ))}
          </div>

          <div className="flex w-full max-w-[430px] items-center gap-2 rounded-xl border border-[#dce2ec] bg-white p-1 shadow-[0_10px_26px_rgba(16,24,40,.05)]">
            <span className="shrink-0 px-3 text-xs font-black text-[#111827]">Trier par</span>
            <div className="grid flex-1 grid-cols-3 gap-1">
              {sortOptions.map((option) => (
                <a
                  key={option.value}
                  href={`/jeux-avenir?categorie=${encodeURIComponent(activeCategory)}&tri=${option.value}`}
                  className={`inline-flex h-9 items-center justify-center rounded-lg px-2 text-[11px] font-black transition ${
                    sort === option.value
                      ? "bg-[#ef233c] text-white shadow-[0_10px_22px_rgba(239,35,60,.20)]"
                      : "text-[#667085] hover:bg-[#fff1f2] hover:text-[#ef233c]"
                  }`}
                >
                  {option.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {filteredGames.length ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {filteredGames.slice(0, 10).map((game) => (
              <GameCard key={game.gameUrl || game.gameName} game={game} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-[#dce2ec] bg-white p-10 text-center">
            <Gamepad2 className="mx-auto h-10 w-10 text-[#ef233c]" />
            <h2 className="mt-3 text-xl font-black">Aucun jeu trouvé</h2>
            <p className="mt-2 text-sm font-semibold text-[#667085]">Aucun jeu disponible dans cette catégorie pour le moment.</p>
          </div>
        )}

        <LaunchAlerts />

        <section className="mt-8 rounded-lg border border-[#e4e8f0] bg-white p-5 shadow-[0_12px_28px_rgba(16,24,40,.06)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-[#ef233c]">Nouveautés Steam officielles</p>
              <h2 className="mt-1 text-2xl font-black text-[#0b1220]">Patch notes, annonces et événements</h2>
            </div>
            <a href="/blog?category=actualité" className="text-sm font-black text-[#0057d9]">Voir le blog</a>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {(steamNews.length ? steamNews.slice(0, 3) : fallbackSteamNews()).map((item) => (
              <SteamNewsCard key={`${item.appid}-${item.title}`} item={item} />
            ))}
          </div>
        </section>
      </section>

    </main>
  );
}

type SteamNewsPreview = {
  appid: number;
  app_name: string;
  category?: string | null;
  title: string;
  excerpt?: string | null;
  url?: string | null;
  date?: string | null;
};

function SteamNewsCard({ item }: { item: SteamNewsPreview }) {
  return (
    <a href={item.url ?? "#"} target="_blank" rel="noreferrer" className="block rounded-lg border border-[#edf0f5] bg-[#fbfcff] p-4 transition hover:border-[#ef233c] hover:shadow-[0_14px_30px_rgba(16,24,40,.10)]">
      <span className="inline-flex rounded bg-[#111827] px-2 py-1 text-[10px] font-black uppercase text-white">{item.app_name}</span>
      <h3 className="mt-3 line-clamp-2 text-sm font-black leading-5">{item.title}</h3>
      <p className="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-[#667085]">{item.excerpt || "Annonce officielle Steam disponible."}</p>
      <p className="mt-3 text-[11px] font-black text-[#ef233c]">{item.date ? formatReleaseDate(item.date) : "Steam News"}</p>
    </a>
  );
}

function fallbackSteamNews(): SteamNewsPreview[] {
  return [
    { appid: 730, app_name: "Counter-Strike 2", title: "Actualités officielles Steam", excerpt: "Les dernières annonces officielles des jeux Steam apparaîtront ici.", url: "https://store.steampowered.com/news/" },
    { appid: 570, app_name: "Dota 2", title: "Patch notes et événements", excerpt: "Suivez les nouveautés, mises à jour et événements des jeux Steam.", url: "https://store.steampowered.com/news/" },
    { appid: 578080, app_name: "PUBG", title: "Nouveautés PUBG Steam", excerpt: "Les news officielles PUBG/Steam seront chargées via l’API Steam.", url: "https://store.steampowered.com/news/" },
  ];
}

function HeroBenefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-[#e7ebf2] bg-white/88 px-5 py-4 shadow-[0_14px_30px_rgba(16,24,40,.06)] backdrop-blur">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#fff1f2] text-[#ef233c]">{icon}</div>
      <div className="min-w-0">
        <h2 className="text-sm font-black">{title}</h2>
        <p className="mt-1 text-xs font-semibold text-[#667085]">{text}</p>
      </div>
    </div>
  );
}

function GameCard({ game }: { game: UpcomingGame }) {
  const category = categorizeGame(game);

  return (
    <article className="group overflow-hidden rounded-lg border border-[#e4e8f0] bg-white shadow-[0_10px_24px_rgba(16,24,40,.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(16,24,40,.14)]">
      <a href={game.gameUrl} target="_blank" rel="noreferrer" className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-[#0b0f18]">
          <UpcomingGameImage src={game.gameImage} alt={game.gameName} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
          <button type="button" aria-label="Ajouter aux favoris" className="absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full border border-white/35 bg-black/40 text-white backdrop-blur transition hover:bg-[#ef233c]">
            <Heart className="h-3.5 w-3.5" />
          </button>
          <span className="absolute right-3 top-3 rounded bg-white px-2 py-1 text-[9px] font-black uppercase leading-none text-[#ef233c] shadow-[0_8px_18px_rgba(0,0,0,.18)]">À venir</span>
        </div>

        <div className="p-3">
          <div className="flex min-h-[34px] items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-[13px] font-black leading-4">{game.gameName}</h3>
            <span className="shrink-0 rounded-md bg-[#fff1f2] px-2 py-1 text-[9px] font-black text-[#ef233c]">{category}</span>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_48px_48px_48px] items-end gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-[#8a94a6]">Date de sortie</p>
              <p className="mt-1 truncate text-[10px] font-black text-[#111827]">{formatReleaseDate(game.releaseDate)}</p>
            </div>
            <UpcomingCountdown releaseDate={game.releaseDate} />
          </div>
        </div>
      </a>
    </article>
  );
}

function sortGames(games: UpcomingGame[], sort: string) {
  return [...games].sort((a, b) => {
    if (sort === "name") return a.gameName.localeCompare(b.gameName);
    if (sort === "price") return normalizePrice(a.price).localeCompare(normalizePrice(b.price));

    const aTime = parseReleaseDate(a.releaseDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = parseReleaseDate(b.releaseDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

function categorizeGame(game: UpcomingGame) {
  const text = `${game.gameName} ${game.credits ?? ""}`.toLowerCase();

  if (/(battle\s*royale|bloodstrike|free\s*fire|pubg|fortnite|indus)/.test(text)) return "Battle Royale";
  if (/(fps|shooter|delta|call of duty|valorant|counter|bloodstrike)/.test(text)) return "FPS / Shooter";
  if (/(moba|mobile legends|league|dota)/.test(text)) return "MOBA";
  if (/(rpg|anime|champions|genshin|wuthering)/.test(text)) return "RPG";
  if (/(football|soccer|nba|sport|tennis|fifa|ea sports)/.test(text)) return "Sports";
  if (/(strategy|stratégie|clash|civilization|war)/.test(text)) return "Stratégie";
  if (/(race|racing|speed|course|need for speed|asphalt)/.test(text)) return "Course";

  return "Autres";
}

function parseReleaseDate(value?: string | null) {
  if (!value) return null;

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const date = new Date(year, month, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatReleaseDate(value?: string | null) {
  const date = parseReleaseDate(value);
  if (!date) return value || "Date à confirmer";

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function normalizePrice(price?: string | null) {
  return (price ?? "").trim();
}
