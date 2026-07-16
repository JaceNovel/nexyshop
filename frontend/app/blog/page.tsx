import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CalendarDays, Eye, MessageCircle, Search, Trophy, Users, Video } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getBlogPosts, type BlogPost } from "@/lib/api";

export const metadata: Metadata = {
  title: "Blog - Actualités gaming",
  description: "Toutes les dernières actualités, nouveautés, guides et interviews Astral4Gamer.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog Astral4Gamer",
    description: "Actualités, nouveautés et guides gaming.",
    type: "website",
    url: "/blog"
  }
};

const tabs = [
  ["TOUS", "", Trophy],
  ["ACTUALITÉS", "actualité", Trophy],
  ["GUIDES", "guide", Trophy],
  ["INTERVIEWS", "interview", CalendarDays],
  ["COMMUNAUTÉ", "communauté", Users]
] as const;

const blogHeroImage = "/ChatGPT%20Image%2028%20mai%202026%2C%2015_36_59.png";

type PageProps = {
  searchParams?: Promise<{ q?: string; category?: string; page?: string }>;
};

export default async function BlogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params?.q?.trim() ?? "";
  const category = params?.category?.trim() ?? "";
  const page = Number(params?.page ?? 1);
  const response = await getBlogPosts({ q, category, page, per_page: 12 }).catch(() => null);
  const posts = (response?.data ?? []).filter((post) => !isEsportPost(post));
  const featured = posts[0] ?? null;
  const recent = posts.slice(0, 5);
  const categories = categoryStats(posts);
  const steamNews = response?.steam_news ?? [];

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />

      <section className="bg-white px-3 py-4 sm:px-5">
        <div className="mx-auto grid w-full max-w-[1586px] gap-4 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <section className="relative overflow-hidden rounded-lg border border-[#ececf3] bg-white p-4 shadow-[0_12px_28px_rgba(16,24,40,.06)] sm:p-5">
              <img src={(featured && postImage(featured)) || blogHeroImage} alt="" className="absolute inset-y-0 right-0 hidden h-full w-[62%] object-cover object-center opacity-[0.22] sm:block" />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/65" />
              <div className="relative min-h-[145px] max-w-[500px] sm:min-h-[170px]">
                <p className="text-[32px] font-black italic leading-none tracking-normal text-[#111827] sm:text-[42px]">BLOG</p>
                <h1 className="mt-2 text-[15px] font-extrabold uppercase text-[#ff1f32]">ACTUALITÉS & UNIVERS GAMING</h1>
                <p className="mt-4 max-w-[390px] text-[12px] leading-5 text-[#4b5563]">Les articles publiés depuis le backend Astral4Gamer, sans contenu de démonstration.</p>
                <form className="mt-5 grid w-full max-w-[390px] grid-cols-[minmax(0,1fr)_38px] overflow-hidden rounded-md border border-[#e5e7eb] bg-white shadow-[0_7px_18px_rgba(16,24,40,.045)]">
                  <input name="q" defaultValue={q} className="h-9 min-w-0 bg-transparent px-3 text-[12px] text-[#111827] outline-none placeholder:text-[#8a90a0]" placeholder="Rechercher un article..." />
                  {category ? <input type="hidden" name="category" value={category} /> : null}
                  <button className="grid place-items-center bg-[#f21d2f] text-white"><Search className="h-3.5 w-3.5" /></button>
                </form>
              </div>
            </section>

            <nav className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-[#ececf3] bg-white p-2 shadow-[0_8px_20px_rgba(16,24,40,.045)] sm:flex sm:overflow-x-auto sm:p-2.5">
              {tabs.map(([label, value, Icon]) => {
                const active = category === value || (!category && !value);
                return (
                  <a key={label} href={`/blog${toQuery({ q, category: value })}`} className={`inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-[9px] font-extrabold sm:h-7 sm:shrink-0 sm:justify-start sm:px-3 ${active ? "bg-[#f21d2f] text-white" : "bg-[#f8fafc] text-[#111827] hover:bg-[#fff1f2] hover:text-[#f21d2f]"}`}>
                    <Icon className="h-3 w-3" />
                    <span className="truncate">{label}</span>
                  </a>
                );
              })}
            </nav>

            <section className="mt-3 rounded-lg border border-[#ececf3] bg-white p-3 shadow-[0_12px_28px_rgba(16,24,40,.055)] sm:p-4">
              <h2 className="mb-3 flex items-center gap-2 text-[12px] font-extrabold uppercase text-[#111827]"><Trophy className="h-3.5 w-3.5 text-[#f21d2f]" /> DERNIERS ARTICLES</h2>
              {posts.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {posts.map((post) => <ArticleCard key={post.id} post={post} />)}
                </div>
              ) : (
                <EmptyBlogState />
              )}
            </section>
          </div>

          <aside className="min-w-0 space-y-3">
            <SidePanel title="ARTICLE À LA UNE">
              {featured ? <FeaturedPost post={featured} /> : <p className="text-[12px] font-semibold leading-5 text-[#6b7280]">Aucun article publié pour le moment.</p>}
            </SidePanel>

            <SidePanel title="CATÉGORIES POPULAIRES">
              {categories.length > 0 ? (
                <div className="space-y-1.5">
                  {categories.map(([name, count], index) => (
                    <a key={name} href={`/blog${toQuery({ category: name.toLowerCase() })}`} className="grid grid-cols-[1fr_auto] border-b border-[#eef0f4] pb-1.5 text-[11px] text-[#4b5563]">
                      <span className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${index % 2 ? "bg-[#ef4444]" : "bg-[#22c55e]"}`} /> {name}</span>
                      <b className="rounded bg-[#f3f4f6] px-1.5 py-0.5 text-[9px] text-[#111827]">{count}</b>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] font-semibold leading-5 text-[#6b7280]">Les catégories apparaîtront dès les premières publications.</p>
              )}
            </SidePanel>

            <SidePanel title="ARTICLES RÉCENTS">
              {recent.length > 0 ? (
                <div className="space-y-2.5">
                  {recent.map((post) => (
                    <a key={post.id} href={`/blog/${post.slug}`} className="grid grid-cols-[64px_1fr] gap-2.5">
                      <PostImage post={post} className="aspect-video rounded" />
                      <span className="min-w-0">
                        <b className="line-clamp-2 text-[11px] leading-3.5">{post.title}</b>
                        <small className="mt-1 block text-[10px] text-[#9ca3af]">{formatDate(post.published_at)}</small>
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] font-semibold leading-5 text-[#6b7280]">Aucun article récent.</p>
              )}
            </SidePanel>

            <SidePanel title="NOUVEAUTÉS STEAM">
              {steamNews.length > 0 ? (
                <div className="space-y-3">
                  {steamNews.slice(0, 4).map((item) => (
                    <a key={`${item.appid}-${item.title}`} href={item.url ?? "#"} target="_blank" rel="noreferrer" className="block border-b border-[#eef0f4] pb-3 last:border-b-0">
                      <span className="text-[9px] font-black uppercase text-[#f21d2f]">{item.app_name}</span>
                      <b className="mt-1 line-clamp-2 block text-[11px] leading-4">{item.title}</b>
                      <small className="mt-1 line-clamp-2 block text-[10px] leading-4 text-[#6b7280]">{item.excerpt || "Annonce officielle Steam."}</small>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] font-semibold leading-5 text-[#6b7280]">Les nouveautés officielles Steam apparaîtront ici.</p>
              )}
            </SidePanel>
          </aside>
        </div>
      </section>
    </main>
  );
}

function FeaturedPost({ post }: { post: BlogPost }) {
  return (
    <a href={`/blog/${post.slug}`} className="block">
      <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-[#f3f4f6]">
        <PostImage post={post} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111827]/45 to-transparent" />
        <div className="absolute left-3 top-5 max-w-[75%]">
          <p className="line-clamp-2 text-lg font-black italic text-white">{post.title}</p>
        </div>
      </div>
      <span className={`mt-2 inline-flex rounded px-2 py-0.5 text-[9px] font-extrabold text-white ${labelTone(postLabel(post))}`}>{postLabel(post)}</span>
      <h2 className="mt-2 text-[13px] font-extrabold uppercase leading-4">{post.title}</h2>
      <Meta post={post} />
    </a>
  );
}

function ArticleCard({ post }: { post: BlogPost }) {
  const label = postLabel(post);

  return (
    <a href={`/blog/${post.slug}`} className="group block rounded-lg bg-white">
      <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-[#f3f4f6]">
        <PostImage post={post} className="h-full w-full transition duration-300 group-hover:scale-[1.04]" />
        <span className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[8px] font-extrabold text-white ${labelTone(label)}`}>{label}</span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-[12px] font-extrabold leading-4 text-[#111827]">{post.title}</h3>
      <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-[#6b7280]">{post.excerpt}</p>
      <Meta post={post} />
    </a>
  );
}

function Meta({ post }: { post: BlogPost }) {
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[10px] text-[#6b7280]">
      <span>{formatDate(post.published_at)}</span>
      <span className="inline-flex items-center gap-1"><Eye className="h-2.5 w-2.5" /> Réel</span>
      <span className="inline-flex items-center gap-1"><MessageCircle className="h-2.5 w-2.5" /> Article</span>
    </p>
  );
}

function EmptyBlogState() {
  return (
    <div className="rounded-lg border border-dashed border-[#d8dde7] bg-[#fbfcff] px-5 py-12 text-center">
      <h3 className="text-lg font-black">Aucun article publié</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#667085]">
        La page blog affichera uniquement les articles publiés depuis le backend.
      </p>
    </div>
  );
}

function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[#ececf3] bg-white p-3 text-[#111827] shadow-[0_12px_28px_rgba(16,24,40,.055)]">
      <h2 className="mb-3 border-l-2 border-[#f21d2f] pl-2.5 text-[12px] font-extrabold uppercase">{title}</h2>
      {children}
    </section>
  );
}

function PostImage({ post, className }: { post: BlogPost; className: string }) {
  const image = postImage(post);

  if (!image) {
    return (
      <span className={`${className} grid place-items-center bg-gradient-to-br from-[#f8fafc] to-[#fff1f2] text-center text-[10px] font-black uppercase text-[#98a2b3]`}>
        Article
      </span>
    );
  }

  return <img src={image} alt="" className={`${className} object-cover`} />;
}

function postImage(post: BlogPost) {
  return post.cover_image_url || post.replay?.thumbnail_url || null;
}

function postLabel(post: BlogPost) {
  const source = `${post.title} ${post.excerpt} ${post.tournament?.title ?? ""} ${post.replay?.title ?? ""}`.toLowerCase();
  if (post.tournament || source.includes("tournoi") || source.includes("cup")) return "TOURNOI";
  if (post.replay || source.includes("highlight") || source.includes("replay")) return "HIGHLIGHTS";
  if (source.includes("guide") || source.includes("build")) return "GUIDE";
  if (source.includes("interview")) return "INTERVIEW";
  if (source.includes("discord") || source.includes("communauté")) return "COMMUNAUTÉ";
  return "ACTUALITÉ";
}

function isEsportPost(post: BlogPost) {
  const source = `${post.title} ${post.excerpt} ${post.tournament?.title ?? ""} ${post.replay?.title ?? ""}`.toLowerCase();
  return Boolean(post.tournament || post.replay) || /tournoi|tournament|duel|\b1v1\b|\bmatch\b|esport|e-sport|compétition|competition|classement|ranking|\blive\b|replay|highlight/.test(source);
}

function categoryStats(posts: BlogPost[]) {
  const counts = new Map<string, number>();
  posts.forEach((post) => {
    const label = postLabel(post);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function labelTone(label: string) {
  if (label === "TOURNOI") return "bg-[#7c19f4]";
  if (label === "HIGHLIGHTS") return "bg-[#f97316]";
  if (label === "GUIDE") return "bg-[#56b80f]";
  if (label === "INTERVIEW") return "bg-[#7c19f4]";
  if (label === "COMMUNAUTÉ") return "bg-[#2563eb]";
  return "bg-[#2563eb]";
}

function formatDate(value?: string | null) {
  if (!value) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function toQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}
