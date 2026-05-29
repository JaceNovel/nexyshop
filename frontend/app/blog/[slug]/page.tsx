import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Facebook, MessageCircle, Send } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getBlogPost } from "@/lib/api";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { data: post } = await getBlogPost(slug);
    const image = post.cover_image_url ?? "/hero-tournament.png";

    return {
      title: post.title,
      description: post.excerpt,
      alternates: { canonical: `/blog/${post.slug}` },
      openGraph: {
        title: post.title,
        description: post.excerpt,
        type: "article",
        url: `/blog/${post.slug}`,
        images: [{ url: image }]
      }
    };
  } catch {
    return { title: "Article NEXY", description: "Actualite Astral4Gamer/NEXY." };
  }
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPost(slug)
    .then((response) => response.data)
    .catch(() => null);

  if (!post) {
    notFound();
  }

  const shareUrl = `/blog/${post.slug}`;

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />
      <article className="mx-auto max-w-[920px] px-6 py-9">
        <p className="text-xs font-black uppercase text-[#6d28d9]">Article NEXY</p>
        <h1 className="mt-3 text-4xl font-black leading-tight tracking-normal">{post.title}</h1>
        <p className="mt-4 text-lg leading-8 text-[#4b5563]">{post.excerpt}</p>

        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt="" className="mt-7 aspect-[16/9] w-full rounded-lg object-cover" />
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(post.title + " " + shareUrl)}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#25d366] px-4 text-xs font-black text-white">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1877f2] px-4 text-xs font-black text-white">
            <Facebook className="h-4 w-4" /> Facebook
          </a>
          <a href="https://www.tiktok.com" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#111827] px-4 text-xs font-black text-white">
            <Send className="h-4 w-4" /> TikTok
          </a>
        </div>

        <div className="prose prose-slate mt-8 max-w-none prose-a:font-bold prose-a:text-[#6d28d9] prose-h2:text-[#111827]" dangerouslySetInnerHTML={{ __html: post.content_html }} />

        <div className="mt-8 flex flex-wrap gap-3 border-t border-[#ececf3] pt-5">
          {post.tournament ? <a href={`/tournois/detail?id=${post.tournament.id}`} className="rounded-lg bg-[#f5f3ff] px-4 py-2 text-sm font-black text-[#4c1d95]">Voir le tournoi</a> : null}
          {post.replay ? <a href={`/replays/${post.replay.slug}`} className="rounded-lg bg-[#f5f3ff] px-4 py-2 text-sm font-black text-[#4c1d95]">Voir le replay</a> : null}
          <a href="/category/top-up" className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-black text-white">Boutique diamants</a>
        </div>
      </article>
    </main>
  );
}
