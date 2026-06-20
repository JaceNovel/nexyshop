import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getReplay } from "@/lib/api";
import { ReplayDetailClient } from "./replay-detail-client";

export default async function ReplayDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const payload = await getReplay(slug);
    return (
      <main className="min-h-screen bg-white text-[#111827]">
        <SiteHeader />
        <ReplayDetailClient replay={payload.data} recommended={payload.recommended} />
      </main>
    );
  } catch {
    notFound();
  }
}
