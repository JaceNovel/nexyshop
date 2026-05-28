import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bell, CalendarDays, ChevronDown, Gamepad2, Search, Shield, SlidersHorizontal, Swords, Trophy, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { type Replay } from "@/lib/api";
import { formatDuration, formatViews } from "@/lib/video-format";

export const metadata: Metadata = {
  title: "Streams passés - Astral4Gamer",
  description: "Revivez tous les tournois et matchs passés.",
  alternates: { canonical: "/live/passe" }
};

type ReplayCard = Replay & {
  poster: string;
  kicker: string;
  headline: string;
  subline: string;
};

const replays: ReplayCard[] = [
  {
    id: 1,
    title: "Finale NEXY CUP #12",
    slug: "finale-nexy-cup-12",
    poster: "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=620&q=80",
    kicker: "NEXY CUP #12",
    headline: "FINALE",
    subline: "BOOYAH!",
    duration_seconds: 3737,
    views_count: 78400,
    category: "NEXY CUP",
    published_at: "2024-06-22T20:00:00Z",
    teams: ["TEAM SHADOW", "NG ESPORT"]
  },
  {
    id: 2,
    title: "1VS4 Showdown #5",
    slug: "1vs4-showdown-5",
    poster: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=620&q=80",
    kicker: "NEXY",
    headline: "1VS4 SHOWDOWN",
    subline: "BEST 1VS4",
    duration_seconds: 1725,
    views_count: 45200,
    category: "1VS4 SHOWDOWN",
    published_at: "2024-06-21T20:00:00Z",
    teams: ["Match 1VS4"]
  },
  {
    id: 3,
    title: "Demi-finale NEXY CUP #11",
    slug: "demi-finale-nexy-cup-11",
    poster: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=620&q=80",
    kicker: "NEXY CUP #11",
    headline: "DEMI-FINALE",
    subline: "",
    duration_seconds: 3573,
    views_count: 62100,
    category: "NEXY CUP",
    published_at: "2024-06-20T20:00:00Z",
    teams: ["TEAM WAR", "BLACK DRAGONS"]
  },
  {
    id: 4,
    title: "1VS1 Arena #8",
    slug: "1vs1-arena-8",
    poster: "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=620&q=80",
    kicker: "NEXY",
    headline: "1VS1 ARENA",
    subline: "ÉPISODE #8",
    duration_seconds: 1338,
    views_count: 33800,
    category: "1VS1 ARENA",
    published_at: "2024-06-19T20:00:00Z",
    teams: ["1VS1"]
  },
  {
    id: 5,
    title: "Finale NEXY CUP #10",
    slug: "finale-nexy-cup-10",
    poster: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=620&q=80",
    kicker: "NEXY CUP #10",
    headline: "FINALE",
    subline: "",
    duration_seconds: 3683,
    views_count: 71300,
    category: "NEXY CUP",
    published_at: "2024-06-18T20:00:00Z",
    teams: ["TEAM PHOENIX", "GOODFELLAS"]
  },
  {
    id: 6,
    title: "Booyah Rush #3",
    slug: "booyah-rush-3",
    poster: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=620&q=80",
    kicker: "NEXY",
    headline: "BOOYAH RUSH",
    subline: "TOURNOI",
    duration_seconds: 2140,
    views_count: 44600,
    category: "BOOYAH RUSH",
    published_at: "2024-06-17T20:00:00Z",
    teams: ["Squad"]
  },
  {
    id: 7,
    title: "Quart de finale NEXY CUP #9",
    slug: "quart-de-finale-nexy-cup-9",
    poster: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=620&q=80",
    kicker: "NEXY CUP #9",
    headline: "QUART DE FINALE",
    subline: "",
    duration_seconds: 2849,
    views_count: 55900,
    category: "NEXY CUP",
    published_at: "2024-06-16T20:00:00Z",
    teams: ["TEAM X", "TEAM Z"]
  },
  {
    id: 8,
    title: "Sniper Challenge #2",
    slug: "sniper-challenge-2",
    poster: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=620&q=80",
    kicker: "NEXY",
    headline: "SNIPER CHALLENGE",
    subline: "ÉPISODE #2",
    duration_seconds: 1215,
    views_count: 18700,
    category: "SNIPER CHALLENGE",
    published_at: "2024-06-15T20:00:00Z",
    teams: ["Sniper Only"]
  },
  {
    id: 9,
    title: "Finale NEXY CUP #8",
    slug: "finale-nexy-cup-8",
    poster: "https://images.unsplash.com/photo-1556438064-2d7646166914?auto=format&fit=crop&w=620&q=80",
    kicker: "NEXY CUP #8",
    headline: "FINALE",
    subline: "",
    duration_seconds: 3312,
    views_count: 38200,
    category: "NEXY CUP",
    published_at: "2024-06-14T20:00:00Z",
    teams: ["TEAM DRAGON", "BAD BOYS"]
  },
  {
    id: 10,
    title: "1VS4 Showdown #4",
    slug: "1vs4-showdown-4",
    poster: "https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=620&q=80",
    kicker: "NEXY",
    headline: "1VS4 SHOWDOWN",
    subline: "BEST 1VS4",
    duration_seconds: 1588,
    views_count: 29600,
    category: "1VS4 SHOWDOWN",
    published_at: "2024-06-13T20:00:00Z",
    teams: ["Solo clutch"]
  },
  {
    id: 11,
    title: "Finale NEXY CUP #7",
    slug: "finale-nexy-cup-7",
    poster: "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=620&q=80",
    kicker: "NEXY CUP #7",
    headline: "FINALE",
    subline: "",
    duration_seconds: 3660,
    views_count: 41800,
    category: "NEXY CUP",
    published_at: "2024-06-12T20:00:00Z",
    teams: ["PRIME ELITE", "ONLY GODS"]
  },
  {
    id: 12,
    title: "Booyah Rush #2",
    slug: "booyah-rush-2",
    poster: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?auto=format&fit=crop&w=620&q=80",
    kicker: "NEXY",
    headline: "BOOYAH RUSH",
    subline: "TOURNOI",
    duration_seconds: 2060,
    views_count: 27400,
    category: "BOOYAH RUSH",
    published_at: "2024-06-11T20:00:00Z",
    teams: ["Tournoi"]
  }
];

const categories = [
  ["Tous les replays", "play"],
  ["NEXY CUP", "shield"],
  ["1VS4 Showdown", "swords"],
  ["1VS1 Arena", "users"],
  ["Booyah Rush", "target"],
  ["Sniper Challenge", "compass"],
  ["Autres tournois", "grid"]
];

const topViews = [replays[0], replays[4], replays[2], replays[6], replays[1]];

function displayDate(value?: string | null) {
  if (!value) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function categoryTone(category: string) {
  if (category.includes("1VS4")) return "bg-[#eee8ff] text-[#6d28d9]";
  if (category.includes("1VS1")) return "bg-[#eee8ff] text-[#6d28d9]";
  if (category.includes("BOOYAH")) return "bg-[#eee8ff] text-[#6d28d9]";
  if (category.includes("SNIPER")) return "bg-[#eee8ff] text-[#6d28d9]";
  return "bg-[#eee8ff] text-[#6d28d9]";
}

export default function LivePassePage() {
  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />

      <section className="mx-auto max-w-[1456px] px-6 py-6">
        <header className="mb-6">
          <h1 className="text-[28px] font-black leading-none tracking-normal text-[#090d15]">Streams passés</h1>
          <p className="mt-2 text-[12px] font-normal text-[#697081]">Revivez tous les tournois et matchs passés.</p>
        </header>

        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_176px_176px_176px]">
          <label className="flex h-10 items-center rounded-md border border-[#eef0f4] bg-white px-3 shadow-[0_6px_18px_rgba(16,24,40,.035)]">
            <input className="w-full bg-transparent text-[12px] font-normal outline-none placeholder:text-[#8a90a0]" placeholder="Rechercher un tournoi, équipe, joueur..." />
            <Search className="h-3.5 w-3.5 text-[#8a90a0]" />
          </label>
          <FilterButton icon={<Gamepad2 className="h-3.5 w-3.5 text-[#6d28d9]" />} label="Tous les jeux" />
          <FilterButton icon={<CalendarDays className="h-3.5 w-3.5 text-[#111827]" />} label="Toutes les dates" />
          <FilterButton icon={<SlidersHorizontal className="h-3.5 w-3.5 text-[#111827]" />} label="Les plus récents" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_286px]">
          <section className="grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {replays.map((replay) => (
              <ReplayTile key={replay.id} replay={replay} />
            ))}
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-[#e9e9f0] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,.055)]">
              <h2 className="mb-3 text-[13px] font-semibold text-[#111827]">Filtrer par catégorie</h2>
              <nav className="space-y-1.5">
                {categories.map(([label], index) => (
                  <a key={label} href="/live/passe" className={`flex h-8 items-center gap-2 rounded-md px-3 text-[12px] font-semibold ${index === 0 ? "bg-[#f1ecff] text-[#6d28d9]" : "text-[#111827] hover:bg-[#f8f7fc]"}`}>
                    <CategoryIcon index={index} />
                    {label}
                  </a>
                ))}
              </nav>
            </section>

            <section className="rounded-lg border border-[#e9e9f0] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,.055)]">
              <h2 className="mb-3 text-[13px] font-semibold text-[#111827]">Top vues</h2>
              <div className="space-y-2.5">
                {topViews.map((replay) => (
                  <a key={replay.id} href={`/replays/${replay.slug}`} className="grid grid-cols-[64px_1fr] gap-2.5">
                    <div className="relative aspect-[1.45] overflow-hidden rounded-md bg-[#111827]">
                      <img src={replay.poster} alt="" className="h-full w-full object-cover" />
                    </div>
                    <span className="min-w-0">
                      <b className="line-clamp-2 text-[12px] font-semibold leading-4 text-[#111827]">{replay.title}</b>
                      <small className="mt-1 block text-[11px] font-normal text-[#6b7280]">{formatViews(replay.views_count)} vues</small>
                    </span>
                  </a>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#e9e9f0] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,.055)]">
              <h2 className="text-[14px] font-semibold text-[#111827]">Ne manquez aucun live !</h2>
              <p className="mt-2 text-[12px] leading-5 text-[#5b6170]">Activez les notifications pour être informé des prochains tournois en direct.</p>
              <button className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#6d28d9] text-[12px] font-semibold text-white shadow-[0_10px_20px_rgba(109,40,217,.18)]">
                <Bell className="h-4 w-4" />
                Activer les notifications
              </button>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function ReplayTile({ replay }: { replay: ReplayCard }) {
  return (
    <a href={`/replays/${replay.slug}`} className="group block">
      <div className="relative aspect-[1.92] overflow-hidden rounded-lg bg-[#111827] shadow-[0_10px_24px_rgba(16,24,40,.14)]">
        <img src={replay.poster} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/22 to-transparent" />
        <div className="absolute left-4 top-4 max-w-[78%] uppercase leading-none">
          <p className="text-[15px] font-bold italic text-[#ff4a43] drop-shadow">{replay.kicker}</p>
          <p className="mt-1 text-[24px] font-bold leading-[.94] text-white drop-shadow">{replay.headline}</p>
          {replay.subline ? <p className="mt-2.5 text-[17px] font-bold italic text-[#ffd21f] drop-shadow">{replay.subline}</p> : null}
        </div>
        <span className="absolute bottom-2 right-2 rounded bg-[#ef4444] px-2 py-1 text-[10px] font-semibold leading-none text-white">{formatDuration(replay.duration_seconds)}</span>
      </div>
      <span className={`mt-3 inline-flex rounded px-1.5 py-1 text-[9px] font-semibold uppercase leading-none ${categoryTone(replay.category)}`}>{replay.category}</span>
      <h2 className="mt-2 line-clamp-1 text-[14px] font-semibold leading-5 text-[#111827]">{replay.title}</h2>
      <p className="mt-1.5 text-[12px] font-normal text-[#6b7280]">{displayDate(replay.published_at)} · {formatViews(replay.views_count)} vues</p>
      <p className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase text-[#3f4552]">
        {(replay.teams ?? []).length > 1 ? (
          <>
            <TeamMark /> {replay.teams?.[0]} <span className="font-medium text-[#6b7280]">VS</span> <TeamMark /> {replay.teams?.[1]}
          </>
        ) : (
          <>{replay.teams?.[0] ?? "Match NEXY"}</>
        )}
      </p>
    </a>
  );
}

function TeamMark() {
  return <span className="inline-grid h-4 w-4 place-items-center rounded bg-[#111827] text-[9px] text-[#fbbf24]">♛</span>;
}

function FilterButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button className="flex h-10 items-center justify-between rounded-md border border-[#eef0f4] bg-white px-3 text-[12px] font-semibold text-[#111827] shadow-[0_6px_18px_rgba(16,24,40,.035)]">
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ChevronDown className="h-3 w-3" />
    </button>
  );
}

function CategoryIcon({ index }: { index: number }) {
  const icons = [Trophy, Shield, Swords, Users, Trophy, Gamepad2, CalendarDays];
  const Icon = icons[index] ?? Trophy;
  return <Icon className="h-3.5 w-3.5" />;
}
