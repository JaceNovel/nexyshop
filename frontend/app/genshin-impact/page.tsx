import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bell, Clock, Gem, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Genshin Impact bientôt disponible | Astral4Gamer",
  description: "Le service Genshin Impact d’Astral4Gamer n’est pas encore disponible. Nous revenons très vite avec les guides, builds et fiches.",
  alternates: { canonical: "/genshin-impact" }
};

const heroImage = "/ChatGPT%20Image%2031%20mai%202026%2C%2001_45_21.png";

export default function GenshinImpactPage() {
  return (
    <main className="min-h-screen bg-[#f6f7fb] text-[#07111f]">
      <SiteHeader />

      <section className="relative min-h-[calc(100vh-190px)] overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white/92 to-[#fff1f3]/86" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center justify-center rounded-lg border border-[#dfe5ef] bg-white/92 px-6 py-16 text-center shadow-[0_24px_70px_rgba(16,24,40,.12)] backdrop-blur md:px-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#fff0f2] px-4 py-2 text-xs font-black uppercase text-[#ef233c] ring-1 ring-[#ffd1d8]">
            <Sparkles className="h-4 w-4" />
            Genshin Impact
          </span>

          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-normal text-[#07111f] md:text-6xl">
            Ce service n’est pas encore disponible
          </h1>

          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-[#475467] md:text-lg">
            Nous vous reviendrons sous peu avec les personnages, armes, artéfacts, guides, builds et événements Genshin Impact.
          </p>

          <div className="mt-10 grid w-full max-w-3xl gap-4 md:grid-cols-3">
            <InfoCard icon={<Clock className="h-5 w-5" />} title="Préparation" text="La section est en cours de finalisation." />
            <InfoCard icon={<Gem className="h-5 w-5" />} title="Données propres" text="Nous préparons des fiches complètes et fiables." />
            <InfoCard icon={<Bell className="h-5 w-5" />} title="Bientôt" text="La page sera ouverte dès que tout sera prêt." />
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href="/" className="inline-flex h-12 items-center justify-center rounded-lg bg-[#ef233c] px-6 text-sm font-black text-white shadow-[0_16px_34px_rgba(239,35,60,.24)] transition hover:-translate-y-0.5">
              Retour à l’accueil
            </a>
            <a href="/jeux-avenir" className="inline-flex h-12 items-center justify-center rounded-lg border border-[#d8dde7] bg-white px-6 text-sm font-black text-[#111827] transition hover:-translate-y-0.5">
              Voir les jeux à venir
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-lg border border-[#edf0f6] bg-[#fbfcff] p-5 text-left">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#fff0f2] text-[#ef233c]">{icon}</span>
      <h2 className="mt-4 text-sm font-black uppercase">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#667085]">{text}</p>
    </article>
  );
}
