import { Download, Filter, Play, Search, Share2, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getHighlights, type Highlight } from "@/lib/api";
import { formatDuration, formatViews } from "@/lib/video-format";

const categories = ["Top 1v4", "Booyah", "MVP", "Top kills", "Funny moments", "Clutch incroyable"];

const fallbackHighlights: Highlight[] = [
  {
    id: 1,
    title: "1v4 clutch sous pression | NEXY Highlight",
    status: "published",
    format: "vertical",
    views_count: 76200,
    thumbnail_url: "https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg",
    moment: { id: 1, type: "1v4", timestamp_seconds: 760 },
    replay: { id: 1, title: "NEXY CUP - Replay complet #1", slug: "nexy-cup-replay-complet-1", category: "NEXY CUP", thumbnail_url: "https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg" }
  }
];

export default async function HighlightsPage() {
  let highlights = fallbackHighlights;

  try {
    highlights = (await getHighlights({ per_page: 20 })).data;
  } catch {
    highlights = fallbackHighlights;
  }

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />

      <section className="mx-auto max-w-[1500px] px-6 py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase text-[#6d28d9]"><Sparkles className="h-4 w-4" /> IA highlights</p>
            <h1 className="mt-2 text-4xl font-black tracking-normal">Clips générés par IA</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b6170]">Les meilleurs moments validés par l’admin, prêts à partager sur TikTok, WhatsApp et YouTube Shorts.</p>
          </div>
          <a href="/replays" className="inline-flex h-11 items-center justify-center rounded-lg bg-[#111827] px-5 text-sm font-black text-white">Voir les replays complets</a>
        </div>

        <div className="mt-7 grid gap-3 lg:grid-cols-[1fr_180px]">
          <label className="flex h-12 items-center rounded-lg border border-[#e6e7ee] bg-[#fbfbff] px-4">
            <Search className="mr-3 h-5 w-5 text-[#6d28d9]" />
            <input className="w-full bg-transparent text-sm outline-none" placeholder="Rechercher un clutch, MVP, booyah..." />
          </label>
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#e6e7ee] bg-white text-sm font-black">
            <Filter className="h-4 w-4" /> Filtres
          </button>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <a key={category} href={`/highlights?type=${encodeURIComponent(category.toLowerCase())}`} className="shrink-0 rounded-full bg-[#f5f3ff] px-4 py-2 text-xs font-black text-[#4c1d95]">
              {category}
            </a>
          ))}
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((highlight) => (
            <article key={highlight.id} className="group overflow-hidden rounded-lg border border-[#ececf3] bg-white shadow-[0_12px_30px_rgba(17,24,39,.06)]">
              <a href={highlight.replay?.slug ? `/replays/${highlight.replay.slug}` : "#"} className="relative block aspect-[9/12] bg-[#111827]">
                <img src={highlight.thumbnail_url ?? highlight.replay?.thumbnail_url ?? ""} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                <span className="absolute left-3 top-3 rounded bg-[#6d28d9] px-2 py-1 text-[11px] font-black uppercase text-white">{highlight.moment?.type ?? "clip"}</span>
                <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/20"><Play className="h-12 w-12 fill-white text-white" /></span>
                <span className="absolute bottom-3 right-3 rounded bg-black/75 px-2 py-1 text-xs font-black text-white">{formatDuration(highlight.moment?.timestamp_seconds ?? 0)}</span>
              </a>
              <div className="p-4">
                <h2 className="line-clamp-2 text-sm font-black leading-5">{highlight.title}</h2>
                <p className="mt-2 text-xs font-semibold text-[#697081]">{formatViews(highlight.views_count)} vues • {highlight.status}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button className="grid h-9 place-items-center rounded bg-[#f5f3ff] text-[#6d28d9]" aria-label="Partager"><Share2 className="h-4 w-4" /></button>
                  <button className="grid h-9 place-items-center rounded bg-[#f5f3ff] text-[#6d28d9]" aria-label="Exporter"><Download className="h-4 w-4" /></button>
                  <a href={highlight.video_url ?? "#"} className="grid h-9 place-items-center rounded bg-[#111827] text-xs font-black text-white">YT</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
