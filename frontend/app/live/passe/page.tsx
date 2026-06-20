import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bell, CalendarDays, ChevronDown, Gamepad2, PlayCircle, Search, Shield, SlidersHorizontal, Trophy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getReplays, type Replay } from "@/lib/api";
import { formatDuration, formatViews } from "@/lib/video-format";

export const metadata: Metadata = {
  title: "Streams passés - Astral4Gamer",
  description: "Revivez les replays synchronisés depuis les lives et vidéos Astral4Gamer.",
  alternates: { canonical: "/live/passe" }
};

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    sort?: string;
  }>;
};

function displayDate(value?: string | null) {
  if (!value) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function categoryTone() {
  return "bg-[#eee8ff] text-[#6d28d9]";
}

function replayImage(replay: Replay) {
  return replay.thumbnail_url?.trim() || (replay.youtube_video_id ? `https://img.youtube.com/vi/${replay.youtube_video_id}/hqdefault.jpg` : "/unnamed.png");
}

function sortedReplays(replays: Replay[], sort?: string) {
  const items = [...replays];

  if (sort === "views") return items.sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0));
  if (sort === "duration") return items.sort((a, b) => (b.duration_seconds ?? 0) - (a.duration_seconds ?? 0));

  return items.sort((a, b) => String(b.published_at ?? "").localeCompare(String(a.published_at ?? "")));
}

export default async function LivePassePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params?.q?.trim() ?? "";
  const activeCategory = params?.category?.trim() ?? "";
  const sort = params?.sort ?? "recent";

  let replays: Replay[] = [];

  try {
    const payload = await getReplays({
      q: search || undefined,
      category: activeCategory || undefined,
      per_page: 48
    });
    replays = sortedReplays(payload.data, sort);
  } catch {
    replays = [];
  }

  const categories = Array.from(new Set(replays.map((replay) => replay.category).filter(Boolean)));
  const topViews = [...replays].sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0)).slice(0, 5);

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />

      <section className="mx-auto max-w-[1456px] px-4 py-5 md:px-6 md:py-6">
        <header className="mb-5 md:mb-6">
          <h1 className="text-2xl font-black leading-tight tracking-normal text-[#090d15] md:text-[28px]">Streams passés</h1>
          <p className="mt-2 text-xs font-normal text-[#697081]">Les replays viennent directement de la base Astral4Gamer et des vidéos YouTube synchronisées.</p>
        </header>

        <form className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_176px_176px_176px]">
          <label className="flex h-11 items-center rounded-md border border-[#eef0f4] bg-white px-3 shadow-[0_6px_18px_rgba(16,24,40,.035)]">
            <input name="q" defaultValue={search} className="w-full bg-transparent text-sm font-normal outline-none placeholder:text-[#8a90a0]" placeholder="Rechercher un tournoi, équipe, joueur..." />
            <Search className="h-4 w-4 text-[#8a90a0]" />
          </label>
          {activeCategory ? <input type="hidden" name="category" value={activeCategory} /> : null}
          <FilterSelect name="category" value={activeCategory} icon={<Gamepad2 className="h-3.5 w-3.5 text-[#6d28d9]" />} label="Toutes les catégories" options={categories} />
          <FilterSelect name="sort" value={sort} icon={<CalendarDays className="h-3.5 w-3.5 text-[#111827]" />} label="Les plus récents" options={["recent", "views", "duration"]} labels={{ recent: "Les plus récents", views: "Top vues", duration: "Durée longue" }} />
          <button className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#111827] px-4 text-xs font-black text-white transition active:scale-[.98]" type="submit">
            <SlidersHorizontal className="h-4 w-4" />
            Filtrer
          </button>
        </form>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_286px]">
          <section className="grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {replays.length ? replays.map((replay) => <ReplayTile key={replay.id} replay={replay} />) : <EmptyReplayState />}
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-[#e9e9f0] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,.055)]">
              <h2 className="mb-3 text-[13px] font-semibold text-[#111827]">Filtrer par catégorie</h2>
              <nav className="space-y-1.5">
                <CategoryLink label="Tous les replays" active={!activeCategory} />
                {categories.map((category) => <CategoryLink key={category} label={category} active={activeCategory === category} />)}
              </nav>
            </section>

            <section className="rounded-lg border border-[#e9e9f0] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,.055)]">
              <h2 className="mb-3 text-[13px] font-semibold text-[#111827]">Top vues</h2>
              {topViews.length ? (
                <div className="space-y-2.5">
                  {topViews.map((replay) => (
                    <a key={replay.id} href={`/replays/${replay.slug}`} className="grid grid-cols-[64px_1fr] gap-2.5">
                      <div className="relative aspect-[1.45] overflow-hidden rounded-md bg-[#111827]">
                        <img src={replayImage(replay)} alt="" className="h-full w-full object-cover" />
                      </div>
                      <span className="min-w-0">
                        <b className="line-clamp-2 text-[12px] font-semibold leading-4 text-[#111827]">{replay.title}</b>
                        <small className="mt-1 block text-[11px] font-normal text-[#6b7280]">{formatViews(replay.views_count)} vues</small>
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs leading-5 text-[#64748b]">Aucun replay synchronisé pour le moment.</p>
              )}
            </section>

            <section className="rounded-lg border border-[#e9e9f0] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,.055)]">
              <h2 className="text-[14px] font-semibold text-[#111827]">Ne manquez aucun live</h2>
              <p className="mt-2 text-[12px] leading-5 text-[#5b6170]">Les notifications du site affichent les lives et replays publiés depuis la base.</p>
              <a href="/live" className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#6d28d9] text-[12px] font-semibold text-white shadow-[0_10px_20px_rgba(109,40,217,.18)] transition active:scale-[.98]">
                <Bell className="h-4 w-4" />
                Voir les lives
              </a>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function ReplayTile({ replay }: { replay: Replay }) {
  const teams = replay.teams ?? [];

  return (
    <a href={`/replays/${replay.slug}`} className="group block">
      <div className="relative aspect-[1.92] overflow-hidden rounded-lg bg-[#111827] shadow-[0_10px_24px_rgba(16,24,40,.14)]">
        <img src={replayImage(replay)} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/22 to-transparent" />
        <div className="absolute left-4 top-4 max-w-[78%] uppercase leading-none">
          <p className="line-clamp-2 text-xl font-bold leading-[.98] text-white drop-shadow md:text-2xl">{replay.title}</p>
          <p className="mt-2 text-sm font-bold italic text-[#ffd21f] drop-shadow">{replay.category}</p>
        </div>
        <span className="absolute bottom-2 right-2 rounded bg-[#ef4444] px-2 py-1 text-[10px] font-semibold leading-none text-white">{formatDuration(replay.duration_seconds)}</span>
      </div>
      <span className={`mt-3 inline-flex rounded px-1.5 py-1 text-[9px] font-semibold uppercase leading-none ${categoryTone()}`}>{replay.category}</span>
      <h2 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-[#111827]">{replay.title}</h2>
      <p className="mt-1.5 text-xs font-normal text-[#6b7280]">{displayDate(replay.published_at)} · {formatViews(replay.views_count)} vues</p>
      <p className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase text-[#3f4552]">
        {teams.length > 1 ? (
          <>
            <TeamMark /> {teams[0]} <span className="font-medium text-[#6b7280]">VS</span> <TeamMark /> {teams[1]}
          </>
        ) : (
          <>{teams[0] ?? replay.tournament?.title ?? "Replay Astral4Gamer"}</>
        )}
      </p>
    </a>
  );
}

function EmptyReplayState() {
  return (
    <div className="rounded-xl border border-dashed border-[#d7dce6] bg-[#fbfcff] p-8 text-center sm:col-span-2 lg:col-span-3 2xl:col-span-4">
      <PlayCircle className="mx-auto h-10 w-10 text-[#94a3b8]" />
      <h2 className="mt-4 text-lg font-black text-[#111827]">Aucun replay synchronisé</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748b]">Ajoute ou synchronise des vidéos YouTube depuis l’admin. Dès qu’un replay existe dans la base, il apparaît ici automatiquement.</p>
      <a href="/admin/video" className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-[#111827] px-4 text-xs font-black text-white">Ouvrir l’admin vidéo</a>
    </div>
  );
}

function TeamMark() {
  return <span className="inline-grid h-4 w-4 place-items-center rounded bg-[#111827] text-[9px] text-[#fbbf24]">♛</span>;
}

function CategoryLink({ label, active }: { label: string; active: boolean }) {
  const href = label === "Tous les replays" ? "/live/passe" : `/live/passe?category=${encodeURIComponent(label)}`;

  return (
    <a href={href} className={`flex h-8 items-center gap-2 rounded-md px-3 text-[12px] font-semibold ${active ? "bg-[#f1ecff] text-[#6d28d9]" : "text-[#111827] hover:bg-[#f8f7fc]"}`}>
      {label === "Tous les replays" ? <Trophy className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
      {label}
    </a>
  );
}

function FilterSelect({ icon, label, name, value, options, labels }: { icon: ReactNode; label: string; name: string; value?: string; options: string[]; labels?: Record<string, string> }) {
  return (
    <label className="flex h-11 items-center justify-between rounded-md border border-[#eef0f4] bg-white px-3 text-[12px] font-semibold text-[#111827] shadow-[0_6px_18px_rgba(16,24,40,.035)]">
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <select name={name} defaultValue={value ?? ""} className="min-w-0 bg-transparent outline-none">
          <option value="">{label}</option>
          {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}
        </select>
      </span>
      <ChevronDown className="h-3 w-3 shrink-0" />
    </label>
  );
}
