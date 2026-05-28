import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CalendarDays, Eye, MessageCircle, Search, Trophy, Users, Video } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { type BlogPost } from "@/lib/api";

export const metadata: Metadata = {
  title: "Blog - Actualités, résultats & esport",
  description: "Toutes les dernières nouvelles Free Fire, tournois, highlights, guides et interviews Astral4Gamer/NEXY.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog Astral4Gamer",
    description: "Actualités, résultats et esport.",
    type: "website",
    url: "/blog"
  }
};

type Article = BlogPost & {
  image: string;
  label: string;
  views: string;
  read: string;
};

const articles: Article[] = [
  {
    id: 1,
    title: "Résultats complets NEXY CUP #12 : classement, kills, MVP et récompenses",
    slug: "resultats-complets-nexy-cup-12-classement-kills-mvp-et-recompenses",
    excerpt: "Team Shadow remporte la grande finale.",
    content_html: "",
    status: "published",
    published_at: "2025-05-19T12:00:00Z",
    image: "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=620&q=80",
    label: "TOURNOI",
    views: "1.5K vues",
    read: "6 min"
  },
  {
    id: 2,
    title: "Top 5 des meilleurs clutchs du mois de mai - Des actions de folie !",
    slug: "top-5-des-meilleurs-clutchs-du-mois-de-mai",
    excerpt: "Les actions les plus fortes du mois.",
    content_html: "",
    status: "published",
    published_at: "2025-05-18T12:00:00Z",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=620&q=80",
    label: "HIGHLIGHTS",
    views: "2.3K vues",
    read: "4 min"
  },
  {
    id: 3,
    title: "Free Fire : nouvelle saison en approche, voici tout ce que vous devez savoir",
    slug: "free-fire-nouvelle-saison-en-approche",
    excerpt: "Les nouveautés de la prochaine saison.",
    content_html: "",
    status: "published",
    published_at: "2025-05-17T12:00:00Z",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=620&q=80",
    label: "ACTUALITÉS",
    views: "980 vues",
    read: "5 min"
  },
  {
    id: 4,
    title: "Comment devenir un joueur d'élite sur Free Fire en 2025",
    slug: "comment-devenir-un-joueur-delite-sur-free-fire-en-2025",
    excerpt: "Guide complet pour progresser.",
    content_html: "",
    status: "published",
    published_at: "2025-05-16T12:00:00Z",
    image: "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=620&q=80",
    label: "GUIDES",
    views: "3.1K vues",
    read: "7 min"
  },
  {
    id: 5,
    title: "Interview exclusive de NEXY_GAMER : son parcours, ses secrets, ses objectifs",
    slug: "interview-exclusive-de-nexy-gamer",
    excerpt: "Rencontre avec un joueur phare.",
    content_html: "",
    status: "published",
    published_at: "2025-05-15T12:00:00Z",
    image: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=620&q=80",
    label: "INTERVIEW",
    views: "1.1K vues",
    read: "6 min"
  },
  {
    id: 6,
    title: "Rejoins notre Discord officiel et participe à nos événements quotidiens !",
    slug: "rejoins-notre-discord-officiel",
    excerpt: "Toute la communauté t'attend.",
    content_html: "",
    status: "published",
    published_at: "2025-05-14T12:00:00Z",
    image: "https://images.unsplash.com/photo-1614680376739-414d95ff43df?auto=format&fit=crop&w=620&q=80",
    label: "COMMUNAUTÉ",
    views: "870 vues",
    read: "3 min"
  },
  {
    id: 7,
    title: "IA Highlights : les meilleurs moments automatiques de la semaine #20",
    slug: "ia-highlights-meilleurs-moments-semaine-20",
    excerpt: "Les clips détectés par IA.",
    content_html: "",
    status: "published",
    published_at: "2025-05-13T12:00:00Z",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=620&q=80",
    label: "HIGHLIGHTS",
    views: "1.7K vues",
    read: "5 min"
  },
  {
    id: 8,
    title: "NEXY LEAGUE SAISON 2 : les inscriptions sont officiellement ouvertes !",
    slug: "nexy-league-saison-2-inscriptions-ouvertes",
    excerpt: "Prépare ton équipe.",
    content_html: "",
    status: "published",
    published_at: "2025-05-12T12:00:00Z",
    image: "https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=620&q=80",
    label: "TOURNOI",
    views: "1.3K vues",
    read: "4 min"
  }
];

const tabs = [
  ["TOUS", Trophy],
  ["TOURNOIS", Trophy],
  ["HIGHLIGHTS", Video],
  ["ACTUALITÉS", Trophy],
  ["GUIDES", Trophy],
  ["INTERVIEWS", CalendarDays],
  ["COMMUNAUTÉ", Users]
] as const;

const categoryStats = [
  ["Tournois", 24],
  ["Highlights", 18],
  ["Actualités", 22],
  ["Guides", 15],
  ["Interviews", 10],
  ["Communauté", 9]
];

const featured = articles[0];
const recent = articles.slice(0, 4);

function formatDate(value?: string | null) {
  if (!value) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function labelTone(label: string) {
  if (label === "TOURNOI") return "bg-[#7c19f4]";
  if (label === "HIGHLIGHTS") return "bg-[#f97316]";
  if (label === "ACTUALITÉS") return "bg-[#2563eb]";
  if (label === "GUIDES") return "bg-[#56b80f]";
  if (label === "INTERVIEW") return "bg-[#7c19f4]";
  return "bg-[#2563eb]";
}

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />

      <section className="bg-white px-3 py-4 sm:px-5">
        <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <section className="relative overflow-hidden rounded-lg border border-[#ececf3] bg-white p-5 shadow-[0_12px_28px_rgba(16,24,40,.06)]">
              <img src="https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1400&q=80" alt="" className="absolute inset-y-0 right-0 h-full w-[58%] object-cover opacity-18" />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/65" />
              <div className="relative min-h-[170px] max-w-[500px]">
                <p className="text-[42px] font-black italic leading-none tracking-normal text-[#111827]">BLOG</p>
                <h1 className="mt-2 text-[15px] font-extrabold uppercase text-[#ff1f32]">ACTUALITÉS, RÉSULTATS & ESPORT</h1>
                <p className="mt-4 max-w-[390px] text-[12px] leading-5 text-[#4b5563]">Toutes les dernières nouvelles de l'univers Free Fire, les tournois, les highlights et bien plus encore.</p>
                <form className="mt-5 grid max-w-[390px] grid-cols-[1fr_38px] overflow-hidden rounded-md border border-[#e5e7eb] bg-white shadow-[0_7px_18px_rgba(16,24,40,.045)]">
                  <input className="h-9 bg-transparent px-3 text-[12px] text-[#111827] outline-none placeholder:text-[#8a90a0]" placeholder="Rechercher un article..." />
                  <button className="grid place-items-center bg-[#f21d2f]"><Search className="h-3.5 w-3.5" /></button>
                </form>
              </div>
            </section>

            <nav className="mt-3 flex gap-2 overflow-x-auto rounded-lg border border-[#ececf3] bg-white p-2.5 shadow-[0_8px_20px_rgba(16,24,40,.045)]">
              {tabs.map(([label, Icon], index) => (
                <a key={label} href="/blog" className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-3 text-[9px] font-extrabold ${index === 0 ? "bg-[#f21d2f] text-white" : "bg-[#f8fafc] text-[#111827] hover:bg-[#fff1f2] hover:text-[#f21d2f]"}`}>
                  <Icon className="h-3 w-3" />
                  {label}
                </a>
              ))}
            </nav>

            <section className="mt-3 rounded-lg border border-[#ececf3] bg-white p-4 shadow-[0_12px_28px_rgba(16,24,40,.055)]">
              <h2 className="mb-3 flex items-center gap-2 text-[12px] font-extrabold uppercase text-[#111827]"><Trophy className="h-3.5 w-3.5 text-[#f21d2f]" /> DERNIERS ARTICLES</h2>
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>

              <div className="mt-5 flex items-center justify-center gap-1.5">
                {["«", "1", "2", "3", "...", "12", "»"].map((item) => (
                  <button key={item} className={`h-7 min-w-7 rounded px-2 text-[11px] font-bold ${item === "1" ? "bg-[#f21d2f] text-white" : "bg-[#f8fafc] text-[#4b5563]"}`}>{item}</button>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-3">
            <SidePanel title="ARTICLE À LA UNE">
              <a href={`/blog/${featured.slug}`} className="block">
                <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-[#f3f4f6]">
                  <img src={featured.image} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#111827]/35 to-transparent" />
                  <div className="absolute left-3 top-5">
                    <p className="text-lg font-black italic">NEXY CUP #12</p>
                    <p className="mt-1 text-[15px] font-black text-[#ff1f32]">GRANDE FINALE</p>
                  </div>
                </div>
                <span className="mt-2 inline-flex rounded bg-[#f21d2f] px-2 py-0.5 text-[9px] font-extrabold">TOURNOI</span>
                <h2 className="mt-2 text-[13px] font-extrabold uppercase leading-4">{featured.title}</h2>
                <Meta article={featured} />
              </a>
            </SidePanel>

            <SidePanel title="CATÉGORIES POPULAIRES">
              <div className="space-y-1.5">
                {categoryStats.map(([name, count], index) => (
                  <a key={name} href="/blog" className="grid grid-cols-[1fr_auto] border-b border-[#eef0f4] pb-1.5 text-[11px] text-[#4b5563]">
                    <span className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${index % 2 ? "bg-[#ef4444]" : "bg-[#22c55e]"}`} /> {name}</span>
                    <b className="rounded bg-[#f3f4f6] px-1.5 py-0.5 text-[9px] text-[#111827]">{count}</b>
                  </a>
                ))}
              </div>
              <a href="/blog" className="mt-3 flex h-8 items-center justify-center rounded border border-[#f21d2f] text-[9px] font-extrabold text-[#f21d2f]">VOIR TOUTES LES CATÉGORIES</a>
            </SidePanel>

            <SidePanel title="ARTICLES RÉCENTS">
              <div className="space-y-2.5">
                {recent.map((article) => (
                  <a key={article.id} href={`/blog/${article.slug}`} className="grid grid-cols-[64px_1fr] gap-2.5">
                    <img src={article.image} alt="" className="aspect-video rounded object-cover" />
                    <span className="min-w-0">
                      <b className="line-clamp-2 text-[11px] leading-3.5">{article.title}</b>
                      <small className="mt-1 block text-[10px] text-[#9ca3af]">{formatDate(article.published_at)}</small>
                    </span>
                  </a>
                ))}
              </div>
              <a href="/blog" className="mt-3 flex h-8 items-center justify-center rounded bg-[#f21d2f] text-[9px] font-extrabold">VOIR TOUS LES ARTICLES</a>
            </SidePanel>
          </aside>
        </div>
      </section>
    </main>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <a href={`/blog/${article.slug}`} className="group block rounded-lg bg-white">
      <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-[#f3f4f6]">
        <img src={article.image} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
        <span className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[8px] font-extrabold text-white ${labelTone(article.label)}`}>{article.label}</span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-[12px] font-extrabold leading-4 text-[#111827]">{article.title}</h3>
      <Meta article={article} />
    </a>
  );
}

function Meta({ article }: { article: Article }) {
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[10px] text-[#6b7280]">
      <span>{formatDate(article.published_at)}</span>
      <span className="inline-flex items-center gap-1"><Eye className="h-2.5 w-2.5" /> {article.views}</span>
      <span className="inline-flex items-center gap-1"><MessageCircle className="h-2.5 w-2.5" /> {article.read}</span>
    </p>
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
