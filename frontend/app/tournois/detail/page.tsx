import { BarChart3, BookOpenText, CalendarDays, Clock3, Gamepad2, Gift, History, Info, ListChecks, Medal, Play, Scale, Share2, ShieldCheck, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const cupImage = "https://wallpapercave.com/wp/wp7536967.jpg";
const teams = ["TM-MAFIA", "TEAM SHADOW", "PRIME ELITE", "DRAGON FORCE", "ONLY GODS", "BLACK WOLVES"];
const rewards = [
  ["1ère PLACE", "50,000", "Diamants", "🏆"],
  ["2ème PLACE", "30,000", "Diamants", "🥈"],
  ["3ème PLACE", "15,000", "Diamants", "🥉"],
  ["4ème PLACE", "5,000", "Diamants", "⚔"],
  ["TOP KILLER", "1 Trophée", "+ 2,000 Diamants", "☠"]
];
const tabs: { label: string; Icon: LucideIcon }[] = [
  { label: "APERÇU", Icon: Info },
  { label: "RÈGLEMENT", Icon: BookOpenText },
  { label: "ÉQUIPES (32)", Icon: Users },
  { label: "CALENDRIER", Icon: CalendarDays },
  { label: "RÉCOMPENSES", Icon: Gift },
  { label: "CLASSEMENT", Icon: BarChart3 },
  { label: "HISTORIQUE", Icon: History }
];
const details = [
  ["Type", "BR - Squad"],
  ["Mode", "Bermuda"],
  ["Équipes", "32 Équipes"],
  ["Joueurs par équipe", "4 Joueurs"],
  ["Niveau requis", "15+"],
  ["Région", "Afrique"],
  ["Version du jeu", "Free Fire Max"],
  ["Organisateur", "NEXY ESPORT"],
  ["ID Room", "Communiqué avant le match"],
  ["Contact", "support@nexy.gg"]
];
const highlights: { label: string; Icon: LucideIcon }[] = [
  { label: "Compétition officielle", Icon: Trophy },
  { label: "Arbitrage professionnel", Icon: Scale },
  { label: "Live sur YouTube", Icon: Play },
  { label: "Récompenses garanties", Icon: Medal }
];
const schedule = [
  ["Ouverture des inscriptions", "20 Mai 2024", "08:00", "TERMINÉ"],
  ["Publication des participants", "25 Mai 2024", "15:45", "TERMINÉ"],
  ["Fin des inscriptions", "25 Mai 2024", "15:30", "TERMINÉ"],
  ["Début du tournoi", "25 Mai 2024", "16:00", "À VENIR"],
  ["Fin du tournoi", "25 Mai 2024", "22:00", "À VENIR"]
];

export default function TournamentDetailPage() {
  return (
    <main className="min-h-screen bg-[#fbfbfd] text-[#080b15]">
      <SiteHeader />
      <section className="mx-auto grid w-full max-w-[1700px] gap-3 px-3 py-3 sm:px-5 md:gap-4 md:py-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:px-6">
        <div className="min-w-0">
          <section className="grid overflow-hidden rounded-lg border border-[#edf0f4] bg-white shadow-[0_2px_12px_rgba(16,24,40,.05)] lg:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[330px_minmax(0,1fr)_270px]">
            <img src={cupImage} alt="" className="h-[190px] w-full object-cover sm:h-[240px] lg:h-full 2xl:h-[330px]" />
            <div className="p-4 md:p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded bg-[#7c3aed] px-2 py-1 text-[10px] font-black text-white">À VENIR</span>
                <span className="rounded bg-[#3b82f6] px-2 py-1 text-[10px] font-black text-white">OFFICIEL</span>
                <ShieldCheck className="h-4 w-4 fill-[#2563eb] text-white" />
              </div>
              <h1 className="text-xl font-black leading-tight md:text-2xl">NEXY CUP #12 - GRANDE FINALE</h1>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#4b5563] md:mt-4 md:gap-5">
                <span className="flex items-center gap-1.5"><Gamepad2 className="h-3.5 w-3.5" />BR - Squad</span>
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />32 Équipes</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Mode: Bermuda</span>
              </div>
              <p className="mt-4 max-w-3xl text-xs leading-5 text-[#4b5563] md:mt-6">La grande finale de la NEXY CUP #12. Les meilleures équipes s'affrontent pour le titre et une récompense exceptionnelle.</p>
              <div className="mt-4 rounded bg-[#f8fafc] p-3 md:mt-8 md:p-4">
                <p className="text-[10px] font-black uppercase">Récompense totale</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm md:gap-8"><b className="text-lg md:text-xl">💎 100,000</b><span>🎁 + Trophées exclusifs</span></div>
              </div>
            </div>
            <aside className="border-t border-[#edf0f4] p-4 text-xs lg:col-span-2 2xl:col-span-1 2xl:border-l 2xl:border-t-0 2xl:p-5">
              <p className="uppercase text-[#6b7280]">Inscription <b className="float-right text-emerald-600">GRATUITE</b></p>
              {["Début|25 Mai 2024|16:00", "Fin des inscriptions|25 Mai 2024|15:30", "Début du tournoi|25 Mai 2024|16:00", "Fin du tournoi|25 Mai 2024|22:00"].map((row) => {
                const [label, date, time] = row.split("|");
                return <p key={label} className="mt-4"><span className="block text-[10px] uppercase text-[#6b7280]">{label}</span><CalendarDays className="mr-1 inline h-3.5 w-3.5" />{date} <Clock3 className="ml-2 mr-1 inline h-3.5 w-3.5" />{time}</p>;
              })}
              <button className="interactive-button mt-5 h-9 w-full rounded bg-[#6d28d9] text-[11px] font-black text-white">S'INSCRIRE MAINTENANT</button>
              <button className="interactive-button mt-2 flex h-9 w-full items-center justify-center gap-2 rounded border border-[#6d28d9] text-[11px] font-black text-[#6d28d9]"><Share2 className="h-3.5 w-3.5" />PARTAGER LE TOURNOI</button>
            </aside>
          </section>

          <nav className="mobile-scroll mt-3 flex overflow-x-auto rounded-lg border border-[#edf0f4] bg-white text-[11px] font-black shadow-[0_2px_10px_rgba(16,24,40,.04)] md:mt-4">
            {tabs.map(({ label, Icon }, i) => <button key={label} className={`relative flex h-11 shrink-0 items-center justify-center gap-2 px-3 md:flex-1 md:px-4 ${i === 0 ? "text-[#6d28d9]" : "text-[#374151]"}`}><Icon className="h-3.5 w-3.5" />{label}{i === 0 && <span className="absolute bottom-0 left-5 right-5 h-0.5 rounded-full bg-[#6d28d9]" />}</button>)}
          </nav>

          <section className="mt-3 grid gap-3 md:mt-4 md:gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="rounded-lg border border-[#edf0f4] bg-white p-4 text-xs shadow-[0_2px_10px_rgba(16,24,40,.04)]">
              <h2 className="mb-3 font-black uppercase">Informations</h2>
              <div className="overflow-hidden rounded border border-[#edf0f4]">
                {details.map(([label, value]) => <div key={label} className="grid grid-cols-[.9fr_1.1fr] border-b border-[#edf0f4] last:border-b-0"><span className="bg-[#fbfbfd] px-2 py-2 text-[#6b7280] md:px-3 md:py-2.5">{label}</span><b className="px-2 py-2 text-right md:px-3 md:py-2.5">{value}</b></div>)}
              </div>
            </div>
            <div className="rounded-lg border border-[#edf0f4] bg-white p-4 text-xs shadow-[0_2px_10px_rgba(16,24,40,.04)]">
              <h2 className="font-black uppercase">Présentation</h2>
              <p className="mt-2 max-w-3xl leading-5 text-[#4b5563]">Après deux semaines de compétition intense, les 32 meilleures équipes se retrouvent pour la grande finale de la NEXY CUP #12. Qui succédera à l'équipe championne et repartira avec la grosse récompense ?</p>
              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                {highlights.map(({ label, Icon }) => <span key={label} className="flex items-center justify-center gap-2 rounded bg-[#f8fafc] p-3 font-bold"><Icon className="h-4 w-4 text-[#6d28d9]" />{label}</span>)}
              </div>
              <div className="mt-6 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-[#6d28d9]" />
                <h2 className="font-black uppercase">Calendrier du tournoi</h2>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2 lg:gap-x-4">
                {schedule.map(([label, date, time, status], index) => <div key={label} className="relative flex items-center gap-3 rounded-lg border border-[#edf0f4] bg-white p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f5f3ff] text-[11px] font-black text-[#6d28d9]">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <b>{label}</b>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[#6b7280] md:gap-3"><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{date}</span><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{time}</span></p>
                  </div>
                  <span className={`rounded px-2 py-1 text-[9px] font-black ${status === "TERMINÉ" ? "bg-emerald-50 text-emerald-600" : "bg-[#eff6ff] text-[#2563eb]"}`}>{status}</span>
                </div>)}
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-[#edf0f4] bg-white p-4">
            <h2 className="mb-3 text-xs font-black uppercase">Récompenses & prix</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 xl:gap-4">
              {rewards.map(([place, amount, label, icon]) => <article key={place} className="rounded bg-[#f8fafc] p-3 md:p-4"><div className="text-2xl md:text-3xl">{icon}</div><p className="mt-2 text-[10px] font-black uppercase text-[#6b7280]">{place}</p><b>{amount}</b><p className="text-xs text-[#6b7280]">{label}</p></article>)}
            </div>
          </section>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-4 xl:max-h-[calc(100vh-32px)] xl:space-y-4 xl:overflow-y-auto">
          <section className="rounded-lg border border-[#edf0f4] bg-white p-4 text-xs"><h2 className="font-black uppercase">Organisateur</h2><div className="mt-3 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#6d28d9] text-xl font-black text-white">N</span><div><b>NEXY ESPORT</b><ShieldCheck className="ml-1 inline h-4 w-4 fill-[#2563eb] text-white" /><p>Organisateur officiel</p></div></div><button className="mt-4 h-9 w-full rounded border border-[#6d28d9] text-[11px] font-black text-[#6d28d9]">VOIR LE PROFIL</button></section>
          <section className="rounded-lg border border-[#edf0f4] bg-white p-4 text-xs"><div className="flex justify-between"><h2 className="font-black uppercase">Équipes inscrites (32)</h2><a className="font-black text-[#6d28d9]" href="/classement">VOIR TOUT</a></div>{teams.map((team, i) => <p key={team} className="mt-3 grid grid-cols-[24px_1fr] items-center"><b>{i + 1}</b><span>🏅 {team}</span></p>)}</section>
          <section className="rounded-lg border border-[#edf0f4] bg-white p-4 text-xs"><h2 className="font-black uppercase">Le tournoi commence dans</h2><div className="mt-4 grid grid-cols-2 gap-2">{["02|Jours", "04|Heures", "18|Minutes", "45|Secondes"].map((x) => { const [n,l]=x.split("|"); return <div key={l} className="min-w-0 rounded bg-[#f5f3ff] px-2 py-3 text-center"><b className="block text-xl leading-none text-[#6d28d9]">{n}</b><p className="mt-2 truncate text-[11px]">{l}</p></div>; })}</div></section>
        </aside>
      </section>
    </main>
  );
}
