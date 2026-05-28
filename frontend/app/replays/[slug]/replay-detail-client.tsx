"use client";

import { Bookmark, CalendarDays, Clock3, Eye, Heart, MessageCircle, Share2, Sparkles } from "lucide-react";
import { useState } from "react";
import { YouTubePlayer } from "@/components/youtube-player";
import type { Replay } from "@/lib/api";
import { formatDate, formatDuration, formatViews } from "@/lib/video-format";

export function ReplayDetailClient({ replay, recommended }: { replay: Replay; recommended: Replay[] }) {
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const videoId = replay.youtube_video_id || "M7lc1UVf-VE";

  return (
    <section className="mx-auto grid max-w-[1580px] gap-7 px-6 py-7 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <div className="overflow-hidden rounded-lg bg-black shadow-[0_18px_44px_rgba(17,24,39,.16)]">
          <YouTubePlayer videoId={videoId} seekToSeconds={seekTo} title={replay.title} />
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-[#f5f3ff] px-2.5 py-1 text-xs font-black text-[#6d28d9]">{replay.category}</span>
            {(replay.hashtags ?? []).map((tag) => <span key={tag} className="text-xs font-black text-[#6d28d9]">#{tag}</span>)}
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-normal">{replay.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-[#697081]">
            <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> {formatViews(replay.views_count)} vues</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {formatDate(replay.published_at)}</span>
            <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" /> {formatDuration(replay.duration_seconds)}</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f5f6fa] px-4 text-sm font-black text-[#111827]"><Heart className="h-4 w-4" /> Like</button>
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f5f6fa] px-4 text-sm font-black text-[#111827]"><Share2 className="h-4 w-4" /> Partager</button>
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f5f6fa] px-4 text-sm font-black text-[#111827]"><Bookmark className="h-4 w-4" /> Enregistrer</button>
          </div>

          <section className="mt-6 rounded-lg bg-[#f8fafc] p-5">
            <h2 className="text-sm font-black uppercase">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#4b5563]">{replay.description}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Tournoi" value={replay.tournament?.title ?? "NEXY"} />
              <Stat label="MVP" value={String(replay.stats?.mvp ?? "A confirmer")} />
              <Stat label="Booyah" value={String(replay.stats?.booyah_team ?? "Non renseigne")} />
            </div>
          </section>

          <section className="mt-6">
            <h2 className="flex items-center gap-2 text-xl font-black"><Sparkles className="h-5 w-5 text-[#6d28d9]" /> Moments clés IA</h2>
            <div className="mt-4 grid gap-3">
              {(replay.moments ?? []).map((moment) => (
                <button key={moment.id} onClick={() => setSeekTo(moment.timestamp_seconds)} className="grid gap-3 rounded-lg border border-[#ececf3] bg-white p-3 text-left transition hover:border-[#c4b5fd] hover:bg-[#fbfbff] sm:grid-cols-[148px_1fr_80px]">
                  <img src={moment.thumbnail_url ?? replay.thumbnail_url ?? ""} alt="" className="aspect-video w-full rounded object-cover" />
                  <span>
                    <b className="block text-sm font-black">{moment.title}</b>
                    <small className="mt-1 line-clamp-2 text-sm leading-5 text-[#697081]">{moment.description}</small>
                    <span className="mt-2 inline-flex rounded bg-[#f5f3ff] px-2 py-1 text-[11px] font-black uppercase text-[#6d28d9]">{moment.type}</span>
                  </span>
                  <span className="self-center justify-self-start rounded bg-[#111827] px-3 py-2 text-xs font-black text-white sm:justify-self-end">{formatDuration(moment.timestamp_seconds)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-[#ececf3] p-5">
            <h2 className="flex items-center gap-2 text-lg font-black"><MessageCircle className="h-5 w-5 text-[#6d28d9]" /> Commentaires</h2>
            <p className="mt-2 text-sm text-[#697081]">Les commentaires seront relies aux comptes utilisateurs NEXY et moderes cote admin.</p>
          </section>
        </div>
      </div>

      <aside className="space-y-4">
        <h2 className="text-lg font-black">Vidéos recommandées</h2>
        {recommended.map((item) => (
          <a key={item.id} href={`/replays/${item.slug}`} className="grid grid-cols-[150px_1fr] gap-3">
            <img src={item.thumbnail_url ?? ""} alt="" className="aspect-video rounded-lg object-cover" />
            <span className="min-w-0">
              <b className="line-clamp-2 text-sm leading-5">{item.title}</b>
              <small className="mt-1 block text-[#697081]">{formatViews(item.views_count)} vues</small>
              <small className="mt-1 block font-black text-[#6d28d9]">{item.category}</small>
            </span>
          </a>
        ))}
      </aside>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <small className="text-[11px] font-black uppercase text-[#697081]">{label}</small>
      <b className="mt-1 block text-sm">{value}</b>
    </div>
  );
}
