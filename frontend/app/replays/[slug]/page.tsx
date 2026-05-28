import { SiteHeader } from "@/components/site-header";
import { getReplay, type Replay } from "@/lib/api";
import { ReplayDetailClient } from "./replay-detail-client";

const fallbackReplay: Replay = {
  id: 1,
  title: "NEXY CUP - Replay complet #1",
  slug: "nexy-cup-replay-complet-1",
  youtube_video_id: "M7lc1UVf-VE",
  thumbnail_url: "https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg",
  duration_seconds: 6420,
  views_count: 82400,
  category: "NEXY CUP",
  description: "Replay complet NEXY avec moments clés générés par IA.",
  published_at: new Date().toISOString(),
  teams: ["TM-MAFIA", "TEAM SHADOW"],
  hashtags: ["NEXY", "FreeFire"],
  stats: { mvp: "RavenX", booyah_team: "TM-MAFIA" },
  moments: [
    { id: 1, replay_id: 1, title: "1v4 clutch sous pression", timestamp_seconds: 760, type: "1v4", description: "Le moment qui renverse la map.", thumbnail_url: "https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg" },
    { id: 2, replay_id: 1, title: "Booyah final", timestamp_seconds: 3800, type: "booyah", description: "Dernier duel et explosion du chat.", thumbnail_url: "https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg" }
  ]
};

export default async function ReplayDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let replay = fallbackReplay;
  let recommended: Replay[] = [];

  try {
    const payload = await getReplay(slug);
    replay = payload.data;
    recommended = payload.recommended;
  } catch {
    recommended = [fallbackReplay];
  }

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />
      <ReplayDetailClient replay={replay} recommended={recommended} />
    </main>
  );
}
