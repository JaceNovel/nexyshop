import type { Metadata } from "next";
import { CalendarDays, ExternalLink, Gamepad2, Search, Sparkles, Tag, Trophy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { fetchUpcomingGames, type UpcomingGame } from "@/lib/server/hlgaming-upcoming";

export const metadata: Metadata = {
  title: "Jeux à venir | Astral4Gamer",
  description: "Découvre les prochains jeux, leurs dates de sortie, prix et pages officielles."
};

export default async function UpcomingGamesPage() {
  const payload = await fetchUpcomingGames().catch(() => ({ result: [], usage: null, stale: false }));
  const games = payload.result.slice(0, 24);
  const featured = games[0];
  const freeCount = games.filter((game) => normalizePrice(game.price) === "Free").length;

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-[#08111f]">
      <SiteHeader />

      <section className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-[1500px]">
          <section className="relative overflow-hidden rounded-lg border border-[#141821] bg-[#06080d] text-white shadow-[0_24px_70px_rgba(8,17,31,.24)]">
            {featured?.gameImage ? <img src={featured.gameImage} alt="" className="absolute right-0 top-0 h-full w-[55%] object-cover opacity-30 blur-[1px] saturate-125" /> : null}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(229,43,47,.32),transparent_34%),linear-gradient(90deg,#05070b_0%,rgba(5,7,11,.94)_42%,rgba(5,7,11,.56)_100%)]" />
            <div className="relative grid min-h-[330px] gap-8 p-7 md:grid-cols-[1fr_390px] md:p-10">
              <div className="flex max-w-3xl flex-col justify-center">
                <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-black uppercase text-white/75">
                  <Sparkles className="h-4 w-4 text-[#ff313d]" />
                  Sorties gaming en approche
                </p>
                <h1 className="mt-5 text-4xl font-black tracking-normal sm:text-5xl">Jeux à venir</h1>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/72">
                  Suis les prochaines sorties, compare les prix et ouvre directement les pages officielles des jeux qui arrivent bientôt.
                </p>
                <div className="mt-7 grid max-w-2xl grid-cols-3 gap-3">
                  <Metric label="Jeux suivis" value={games.length || "N/A"} />
                  <Metric label="Gratuits" value={freeCount || "0"} />
                  <Metric label="Quota restant" value={payload.usage?.remainingToday ?? "Cache"} />
                </div>
              </div>

              <FeaturedGame game={featured} stale={Boolean(payload.stale)} />
            </div>
          </section>

          <section className="mt-6 flex flex-col gap-3 rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-[0_12px_32px_rgba(16,24,40,.05)] md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black">Catalogue des prochaines sorties</h2>
              <p className="mt-1 text-sm font-semibold text-[#667085]">Prix, dates et liens officiels. Les données sont mises en cache pour préserver le quota API.</p>
            </div>
            <div className="flex h-11 min-w-[280px] items-center rounded-lg border border-[#d8dde7] bg-[#f8fafc] px-3 text-[#667085]">
              <Search className="mr-2 h-4 w-4" />
              <span className="text-sm font-bold">Recherche bientôt disponible</span>
            </div>
          </section>

          {games.length ? (
            <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {games.map((game) => (
                <GameCard key={game.gameUrl} game={game} />
              ))}
            </section>
          ) : (
            <section className="mt-5 rounded-lg border border-[#e5e7eb] bg-white p-8 text-center shadow-[0_12px_32px_rgba(16,24,40,.05)]">
              <Gamepad2 className="mx-auto h-10 w-10 text-[#e52b2f]" />
              <h2 className="mt-3 text-xl font-black">Aucun jeu disponible pour le moment</h2>
              <p className="mt-2 text-sm font-semibold text-[#667085]">L’API HL Gaming n’a pas renvoyé de liste exploitable.</p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function FeaturedGame({ game, stale }: { game?: UpcomingGame; stale: boolean }) {
  if (!game) {
    return (
      <aside className="rounded-lg border border-white/12 bg-white/8 p-5 backdrop-blur">
        <p className="text-sm font-black text-white/70">Jeu vedette indisponible</p>
      </aside>
    );
  }

  return (
    <aside className="relative overflow-hidden rounded-lg border border-white/14 bg-white/10 p-5 shadow-[0_18px_48px_rgba(0,0,0,.28)] backdrop-blur">
      {game.gameImage ? <img src={game.gameImage} alt="" className="absolute inset-x-0 top-0 h-32 w-full object-cover opacity-38" /> : null}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07090f] via-[#07090f]/86 to-[#07090f]/22" />
      <div className="relative pt-24">
        <p className="text-xs font-black uppercase text-[#ff5961]">À surveiller</p>
        <h2 className="mt-2 line-clamp-2 text-2xl font-black">{game.gameName}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <InfoPill icon={<CalendarDays className="h-4 w-4" />} label="Sortie" value={game.releaseDate ?? "À annoncer"} />
          <InfoPill icon={<Tag className="h-4 w-4" />} label="Prix" value={formatPrice(game.price)} />
        </div>
        <a href={game.gameUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#e52b2f] text-sm font-black text-white transition hover:bg-[#c91f27]">
          Voir la page officielle
          <ExternalLink className="h-4 w-4" />
        </a>
        {stale ? <p className="mt-3 text-xs font-bold text-amber-200">Données servies depuis le cache.</p> : null}
      </div>
    </aside>
  );
}

function GameCard({ game }: { game: UpcomingGame }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-[0_12px_30px_rgba(16,24,40,.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(16,24,40,.12)]">
      <div className="relative aspect-[16/9] bg-[#0b0f18]">
        {game.gameImage ? <img src={game.gameImage} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-white/50"><Gamepad2 className="h-10 w-10" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <span className="absolute bottom-3 left-3 rounded bg-[#e52b2f] px-2.5 py-1 text-xs font-black text-white">{formatPrice(game.price)}</span>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 min-h-[44px] text-base font-black leading-5">{game.gameName}</h3>
        <div className="mt-4 space-y-2 text-sm font-semibold text-[#667085]">
          <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#e52b2f]" /> {game.releaseDate ?? "Date à annoncer"}</p>
          <p className="flex items-center gap-2"><Trophy className="h-4 w-4 text-[#e52b2f]" /> {game.credits ?? "HL Gaming Official"}</p>
        </div>
        <a href={game.gameUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#d8dde7] bg-white text-sm font-black text-[#111827] transition hover:border-[#e52b2f] hover:text-[#e52b2f]">
          Détails
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/8 p-4 backdrop-blur">
      <b className="block text-2xl font-black">{value}</b>
      <span className="mt-1 block text-xs font-black uppercase text-white/55">{label}</span>
    </div>
  );
}

function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/8 p-3">
      <p className="flex items-center gap-2 text-xs font-black uppercase text-white/50">{icon}{label}</p>
      <b className="mt-1 block text-sm">{value}</b>
    </div>
  );
}

function normalizePrice(price?: string | null) {
  return (price ?? "").trim();
}

function formatPrice(price?: string | null) {
  const value = normalizePrice(price);

  if (!value) return "Prix à venir";
  if (value.toLowerCase() === "free") return "Gratuit";

  return value;
}
