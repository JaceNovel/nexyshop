"use client";

import {
  Bell,
  Bookmark,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  ListFilter,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  ThumbsDown,
  ThumbsUp
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { YouTubePlayer } from "@/components/youtube-player";
import type { Replay, ReplayMoment } from "@/lib/api";
import { formatDate, formatDuration, formatViews } from "@/lib/video-format";

export function ReplayDetailClient({ replay, recommended }: { replay: Replay; recommended: Replay[] }) {
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const videoId = replay.youtube_video_id || "M7lc1UVf-VE";
  const moments = getDisplayMoments(replay);
  const recommendedVideos = recommended.length ? recommended : [replay];
  const firstTeam = replay.teams?.[0] ?? "TEAM SHADOW";

  return (
    <section className="mx-auto max-w-[1560px] px-5 py-6 text-[#111827] lg:px-8">
      <nav className="mb-5 flex items-center gap-2 text-[13px] font-semibold text-[#6b7280]">
        <a href="/" className="hover:text-[#dc2626]">Accueil</a>
        <ChevronRight className="h-4 w-4" />
        <a href="/replays" className="hover:text-[#dc2626]">Replays</a>
        <ChevronRight className="h-4 w-4" />
        <span className="font-black text-[#dc2626]">{replay.category}</span>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-black">
            <YouTubePlayer videoId={videoId} seekToSeconds={seekTo} title={replay.title} />
          </div>

          <div className="mt-4">
            <span className="inline-flex rounded bg-[#fee2e2] px-2 py-1 text-[11px] font-black uppercase text-[#dc2626]">{replay.category}</span>
            <h1 className="mt-2 text-[26px] font-black leading-8 text-[#111827]">{replay.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-[13px] font-semibold text-[#4b5563]">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {formatDate(replay.published_at)}</span>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" /> {formatDuration(replay.duration_seconds)}</span>
              <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> {formatViews(replay.views_count)} vues</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 border-b border-[#e5e7eb] pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#111827] text-lg font-black text-white ring-2 ring-[#dc2626]">N</div>
              <div>
                <p className="flex items-center gap-1 text-[15px] font-black">NEXY Esport <span className="grid h-4 w-4 place-items-center rounded-full bg-[#111827] text-[10px] text-white">✓</span></p>
                <p className="text-[12px] font-semibold text-[#6b7280]">15.2K abonnés</p>
              </div>
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-[#dc2626] px-4 text-[12px] font-black text-white transition hover:bg-[#b91c1c]" type="button">
                <Bell className="h-4 w-4" /> S'abonner
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ActionButton icon={<ThumbsUp className="h-4 w-4" />} label="1.2K" />
              <ActionButton icon={<ThumbsDown className="h-4 w-4" />} label="45" />
              <ActionButton icon={<Share2 className="h-4 w-4" />} label="Partager" />
              <ActionButton icon={<Download className="h-4 w-4" />} label="Télécharger" />
              <ActionButton icon={<Bookmark className="h-4 w-4" />} label="Enregistrer" />
              <button className="grid h-9 w-9 place-items-center rounded-full bg-[#f3f4f6] text-[#111827]" type="button" aria-label="Plus d'options">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-lg border border-[#e5e7eb] bg-white p-5">
              <h2 className="text-[15px] font-black">Description</h2>
              <p className="mt-3 whitespace-pre-line text-[13px] leading-6 text-[#374151]">{replay.description ?? "Replay complet avec les meilleurs moments du match, les actions décisives et le final du tournoi."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(replay.hashtags?.length ? replay.hashtags : ["NEXYCUP", "FREEFIRE", "TOURNOI", "ESPORT"]).map((tag) => (
                  <span key={tag} className="text-[12px] font-black uppercase text-[#dc2626]">#{tag}</span>
                ))}
              </div>
              <button className="mt-5 inline-flex items-center gap-1 text-[12px] font-black text-[#dc2626]" type="button">
                Voir plus <ChevronDown className="h-4 w-4" />
              </button>
            </section>

            <section className="rounded-lg border border-[#e5e7eb] bg-white p-5">
              <h2 className="text-[15px] font-black">Informations du tournoi</h2>
              <dl className="mt-4 space-y-3 text-[13px]">
                <InfoRow label="Mode" value={replay.tournament?.mode ?? "Battle Royale"} />
                <InfoRow label="Participants" value={getStatValue(replay, "participants", "24 équipes")} />
                <InfoRow label="Organisateur" value="NEXY Esport" />
                <InfoRow label="Date" value={formatDate(replay.published_at)} />
              </dl>
              <a href="/tournois" className="mt-5 inline-flex h-8 w-full items-center justify-center rounded border border-[#dc2626] text-[12px] font-black text-[#dc2626] transition hover:bg-[#fee2e2]">
                Voir les détails du tournoi
              </a>
            </section>
          </div>

          <section className="mt-5">
            <div className="flex items-center gap-6">
              <h2 className="text-[15px] font-black">156 commentaires</h2>
              <button className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#4b5563]" type="button">
                <ListFilter className="h-4 w-4" /> Trier par
              </button>
            </div>
            <div className="mt-4 flex gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#111827] text-sm font-black text-white">A</div>
              <div className="flex-1 border-b border-[#e5e7eb] pb-2">
                <input className="h-9 w-full bg-transparent text-[13px] outline-none placeholder:text-[#6b7280]" placeholder="Ajouter un commentaire..." />
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-full bg-[#dc2626] text-white" type="button" aria-label="Envoyer">
                <Send className="h-4 w-4" />
              </button>
            </div>
            <Comment author="Épinglé par NEXY Esport" text={`GG à ${firstTeam} pour cette victoire ! Quel match incroyable !`} />
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-[#e5e7eb] bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-black">Moments clés</h2>
              <button className="inline-flex items-center gap-1 text-[12px] font-black text-[#dc2626]" type="button">
                Voir tout <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {moments.map((moment) => (
                <button key={moment.id} onClick={() => setSeekTo(moment.timestamp_seconds)} className="grid w-full grid-cols-[116px_1fr] gap-3 text-left">
                  <span className="relative overflow-hidden rounded-md bg-[#111827]">
                    <img src={moment.thumbnail_url ?? replay.thumbnail_url ?? ""} alt="" className="aspect-video h-full w-full object-cover" />
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-black text-white">{formatDuration(moment.timestamp_seconds)}</span>
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <small className="font-black text-[#dc2626]">{formatDuration(moment.timestamp_seconds)}</small>
                    <b className="mt-1 line-clamp-2 block text-[13px] leading-5">{moment.title}</b>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#e5e7eb] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-black">À suivre</h2>
              <label className="flex items-center gap-2 text-[12px] font-semibold text-[#4b5563]">
                Lecture automatique
                <span className="relative h-5 w-9 rounded-full bg-[#dc2626]">
                  <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white" />
                </span>
              </label>
            </div>
            <div className="mt-4 space-y-3">
              {recommendedVideos.map((item, index) => (
                <a key={`${item.id}-${index}`} href={`/replays/${item.slug}`} className="grid grid-cols-[142px_1fr] gap-3">
                  <span className="relative overflow-hidden rounded-md bg-[#111827]">
                    <img src={item.thumbnail_url ?? replay.thumbnail_url ?? ""} alt="" className="aspect-video h-full w-full object-cover" />
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-black text-white">{formatDuration(item.duration_seconds)}</span>
                  </span>
                  <span className="min-w-0">
                    <b className="line-clamp-2 text-[13px] leading-5">{item.title}</b>
                    <small className="mt-1 block text-[12px] font-semibold text-[#4b5563]">{item.category}</small>
                    <small className="mt-1 block text-[12px] text-[#6b7280]">{formatViews(item.views_count)} vues</small>
                  </span>
                </a>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function ActionButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button className="inline-flex h-9 items-center gap-2 rounded-full bg-[#f3f4f6] px-4 text-[12px] font-black text-[#111827] transition hover:bg-[#fee2e2] hover:text-[#dc2626]" type="button">
      {icon}
      {label}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="font-semibold text-[#4b5563]">{label}</dt>
      <dd className="text-right font-black">{value}</dd>
    </div>
  );
}

function Comment({ author, text }: { author: string; text: string }) {
  return (
    <article className="mt-5 flex gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fee2e2] text-sm font-black text-[#dc2626]">N</div>
      <div className="min-w-0">
        <p className="text-[12px] font-black">{author} <span className="font-semibold text-[#6b7280]">il y a 2 jours</span></p>
        <p className="mt-1 text-[13px] leading-5 text-[#111827]">{text}</p>
        <div className="mt-2 flex items-center gap-3 text-[12px] font-semibold text-[#6b7280]">
          <button className="inline-flex items-center gap-1" type="button"><ThumbsUp className="h-4 w-4" /> 54</button>
          <button className="inline-flex items-center gap-1" type="button"><MessageCircle className="h-4 w-4" /> Répondre</button>
        </div>
      </div>
    </article>
  );
}

function getStatValue(replay: Replay, key: string, fallback: string) {
  const value = replay.stats?.[key];

  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value);
}

function getDisplayMoments(replay: Replay): ReplayMoment[] {
  const source = replay.moments?.length ? replay.moments : [];

  if (source.length >= 6) {
    return source.slice(0, 6);
  }

  const generated = [
    "Premier kill d'ASTRALxPRO",
    "1v4 de ASTRALxPRO",
    "Clutch incroyable de ZEROX",
    "Double kill de NG_MAHKAL",
    "BOOYAH ! TEAM SHADOW",
    "Dernier combat épique"
  ].map((title, index) => ({
    id: 9000 + index,
    replay_id: replay.id,
    title,
    timestamp_seconds: [192, 724, 980, 1511, 1965, 2733][index],
    type: index === 4 ? "booyah" : index === 1 ? "1v4" : "clutch",
    description: title,
    thumbnail_url: replay.thumbnail_url
  })) satisfies ReplayMoment[];

  return [...source, ...generated].slice(0, 6);
}
