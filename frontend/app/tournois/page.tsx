import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CalendarDays, CheckCircle2, ChevronDown, Diamond, Gift, Plus, Radio, Shield, Trophy, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getLeaderboards, getTournaments, type Tournament } from "@/lib/api";

export const metadata: Metadata = {
  title: "Tournois - Astral4Gamer",
  description: "Participe aux meilleurs tournois Free Fire, BR Squad, Guild Wars et gagne des recompenses.",
  alternates: { canonical: "/tournois" }
};

type TournamentCard = Tournament & {
  banner: string;
  fee: string;
  rewardLabel: string;
  rewardExtra: string;
  startsLabel: string;
  registrationEnd: string;
  badge?: string;
};

const fallbackTournaments: TournamentCard[] = [
  {
    id: 12,
    title: "NEXY CUP #12 - GRANDE FINALE",
    mode: "BR - Squad",
    status: "scheduled",
    starts_at: "2024-05-25T16:00:00Z",
    prize_pool: 100000,
    teams_count: 32,
    room_id: "BERMUDA",
    banner: "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=720&q=80",
    fee: "GRATUITE",
    rewardLabel: "100,000",
    rewardExtra: "+ Trophees",
    startsLabel: "25 Mai 2024 16:00",
    registrationEnd: "25 Mai 2024 - 15:30",
    badge: "OFFICIEL"
  },
  {
    id: 13,
    title: "GUILD WARS SEASON 3",
    mode: "Guild Wars",
    status: "scheduled",
    starts_at: "2024-05-26T18:00:00Z",
    prize_pool: 150000,
    teams_count: 16,
    room_id: "BERMUDA",
    banner: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=720&q=80",
    fee: "2,000 FCFA",
    rewardLabel: "150,000",
    rewardExtra: "+ Trophees",
    startsLabel: "26 Mai 2024 18:00",
    registrationEnd: "26 Mai 2024 - 17:30",
    badge: "GUILD WARS"
  },
  {
    id: 14,
    title: "NEXY SOLO CUP",
    mode: "BR - Solo",
    status: "scheduled",
    starts_at: "2024-05-27T14:00:00Z",
    prize_pool: 30000,
    teams_count: 48,
    room_id: "PURGATORY",
    banner: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=720&q=80",
    fee: "GRATUITE",
    rewardLabel: "30,000",
    rewardExtra: "+ Cartes cadeaux",
    startsLabel: "27 Mai 2024 14:00",
    registrationEnd: "27 Mai 2024 - 13:30",
    badge: "SOLO"
  },
  {
    id: 15,
    title: "DUO CHALLENGE",
    mode: "BR - Duo",
    status: "scheduled",
    starts_at: "2024-05-28T20:00:00Z",
    prize_pool: 50000,
    teams_count: 64,
    room_id: "BERMUDA",
    banner: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=720&q=80",
    fee: "1,000 FCFA",
    rewardLabel: "50,000",
    rewardExtra: "+ Bonus",
    startsLabel: "28 Mai 2024 20:00",
    registrationEnd: "28 Mai 2024 - 19:30",
    badge: "DUO"
  }
];

const filterBlocks = [
  {
    title: "JEU",
    items: ["Free Fire", "PUBG Mobile", "Mobile Legends", "Call of Duty Mobile", "Valorant", "Clash Squad"],
    active: "Free Fire",
    more: true
  },
  {
    title: "TYPE",
    items: ["BR - Squad", "BR - Duo", "BR - Solo", "Clash Squad", "Guild Wars"],
    active: "BR - Squad"
  },
  {
    title: "STATUT",
    items: ["A venir", "En cours", "Inscription ouverte"],
    active: "A venir"
  },
  {
    title: "PRIX",
    items: ["Tous", "Gratuit", "Payant"],
    active: "Tous"
  }
];

const liveTournaments = [
  {
    title: "NEXY CUP #11",
    round: "ROUND 3/7",
    mode: "BR - Squad",
    teams: "32 Equipes",
    time: "00:18:45",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=360&q=80",
    action: "REGARDER LE LIVE"
  },
  {
    title: "GUILD WARS SEASON 3",
    round: "ROUND 2/6",
    mode: "Guild Wars",
    teams: "16 Guildes",
    time: "00:12:20",
    image: "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=360&q=80",
    action: "VOIR LE CLASSEMENT"
  }
];

function normalizeTournament(tournament: Tournament, index: number): TournamentCard {
  const fallback = fallbackTournaments[index % fallbackTournaments.length];

  return {
    ...tournament,
    title: tournament.title || fallback.title,
    mode: tournament.mode || fallback.mode,
    status: tournament.status || fallback.status,
    starts_at: tournament.starts_at || fallback.starts_at,
    prize_pool: tournament.prize_pool || fallback.prize_pool,
    teams_count: tournament.teams_count ?? tournament.teams?.length ?? fallback.teams_count,
    room_id: tournament.room_id ?? fallback.room_id,
    banner: fallback.banner,
    fee: Number(tournament.prize_pool) > 120000 ? "2,000 FCFA" : "GRATUITE",
    rewardLabel: new Intl.NumberFormat("fr-FR").format(Number(tournament.prize_pool || fallback.prize_pool)),
    rewardExtra: fallback.rewardExtra,
    startsLabel: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(tournament.starts_at || fallback.starts_at)),
    registrationEnd: fallback.registrationEnd,
    badge: fallback.badge
  };
}

export default async function TournoisPage() {
  let tournaments = fallbackTournaments;
  let leaderboard = [
    ["TM-MAFIA", 122, "up"],
    ["TEAM SHADOW", 98, "up"],
    ["PRIME ELITE", 85, "down"],
    ["DRAGON FORCE", 74, "same"],
    ["ONLY GODS", 60, "up"]
  ] as Array<[string, number, "up" | "down" | "same"]>;

  try {
    const payload = await getTournaments();
    tournaments = payload.data.length ? payload.data.slice(0, 4).map(normalizeTournament) : fallbackTournaments;
  } catch {
    tournaments = fallbackTournaments;
  }

  try {
    const data = await getLeaderboards();
    if (data.top_players?.length) {
      leaderboard = data.top_players.slice(0, 5).map((player, index) => [player.name, player.points, index === 2 ? "down" : index === 3 ? "same" : "up"]);
    }
  } catch {
    leaderboard = leaderboard;
  }

  return (
    <main className="min-h-screen bg-[#fbfbfd] text-[#111827]">
      <SiteHeader />

      <section className="grid w-full gap-4 px-2 py-4 sm:px-3 2xl:px-4 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden xl:block">
          <div className="rounded-lg border border-[#ececf3] bg-white p-3 shadow-[0_8px_22px_rgba(16,24,40,.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-black">FILTRES</h2>
              <button className="text-[10px] font-black text-[#6d28d9]">Réinitialiser</button>
            </div>
            <div className="space-y-3">
              {filterBlocks.map((block) => (
                <FilterBlock key={block.title} {...block} />
              ))}
            </div>
            <button className="mt-3 h-9 w-full rounded-md bg-[#7c19f4] text-xs font-black text-white shadow-[0_10px_20px_rgba(124,25,244,.2)]">FILTRER (2)</button>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="mb-4 flex flex-col gap-3 border-b border-[#ececf3] bg-white px-4 py-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-[28px] font-black uppercase leading-none tracking-normal text-[#090d15]">TOURNOIS</h1>
              <p className="mt-2 text-[12px] font-medium text-[#6b7280]">Participe aux meilleurs tournois et gagne des récompenses incroyables.</p>
            </div>
            <a href="/tournois/creer" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#7c19f4] px-4 text-xs font-black text-white shadow-[0_10px_20px_rgba(124,25,244,.2)]">
              <Plus className="h-3.5 w-3.5" /> CRÉER UN TOURNOI
            </a>
          </header>

          <nav className="mb-4 flex overflow-x-auto rounded-md border border-[#ececf3] bg-white px-3 text-xs font-black shadow-[0_8px_22px_rgba(16,24,40,.04)]">
            {["TOUS", "À VENIR", "EN COURS", "INSCRIPTION OUVERTE", "TERMINÉS", "MES TOURNOIS"].map((tab, index) => (
              <a key={tab} href="/tournois" className={`relative flex h-10 shrink-0 items-center px-4 ${index === 0 ? "text-[#7c19f4]" : "text-[#111827]"}`}>
                {tab}
                {index === 0 ? <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#7c19f4]" /> : null}
              </a>
            ))}
          </nav>

          <h2 className="mb-3 text-xs font-black uppercase">TOURNOIS À VENIR</h2>
          <div className="space-y-3">
            {tournaments.map((tournament) => (
              <TournamentRow key={tournament.id} tournament={tournament} />
            ))}
          </div>

          <button className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-b-md bg-[#f3efff] text-xs font-black text-[#7c19f4]">
            CHARGER PLUS
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </section>

        <aside className="space-y-3">
          <Panel
            title={
              <span className="flex w-full items-center justify-between">
                <span>TOURNOIS EN COURS <b className="ml-2 text-red-600">● LIVE</b></span>
                <a href="/live" className="text-xs text-[#7c19f4]">VOIR TOUT</a>
              </span>
            }
          >
            <div className="space-y-3">
              {liveTournaments.map((item) => (
                <LiveCard key={item.title} item={item} />
              ))}
            </div>
          </Panel>

          <Panel
            title={
              <span className="flex w-full items-center justify-between">
                <span>MEILLEURES ÉQUIPES</span>
                <a href="/classement" className="text-xs text-[#7c19f4]">VOIR CLASSEMENT</a>
              </span>
            }
          >
            <div className="space-y-2">
              {leaderboard.map(([name, points, trend], index) => (
                <div key={name} className="grid grid-cols-[18px_20px_1fr_auto_16px] items-center gap-2 text-xs">
                  <b>{index + 1}</b>
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#f5f3ff] text-[10px]">🏆</span>
                  <b className="line-clamp-1">{name}</b>
                  <span className="font-black">{points} PTS</span>
                  <span className={trend === "down" ? "text-red-500" : trend === "up" ? "text-emerald-500" : "text-[#9ca3af]"}>{trend === "down" ? "↓" : trend === "up" ? "↑" : "-"}</span>
                </div>
              ))}
            </div>
          </Panel>

          <section className="overflow-hidden rounded-lg bg-[#18063b] shadow-[0_12px_28px_rgba(24,6,59,.18)]">
            <div className="relative min-h-[100px] p-4 text-white">
              <img src="https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=560&q=80" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#1b0645] via-[#4c1d95]/80 to-transparent" />
              <div className="relative max-w-[190px]">
                <h2 className="text-base font-black">CRÉE TON ÉQUIPE</h2>
                <p className="mt-1 text-[10px] font-bold uppercase">ET GAGNE DES RÉCOMPENSES</p>
                <a href="/tournois/creer-equipe" className="mt-4 inline-flex h-8 items-center rounded-md bg-[#7c19f4] px-4 text-[10px] font-black text-white">CRÉER UNE ÉQUIPE</a>
              </div>
            </div>
          </section>

          <Panel title="COMMENT ÇA MARCHE ?">
            <div className="space-y-2 text-xs font-medium text-[#4b5563]">
              <HowStep icon={<Shield className="h-3.5 w-3.5" />} text="Inscris ton équipe" />
              <HowStep icon={<Radio className="h-3.5 w-3.5" />} text="Participe aux matchs" />
              <HowStep icon={<Trophy className="h-3.5 w-3.5" />} text="Gagne des récompenses" />
            </div>
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function FilterBlock({ title, items, active, more }: { title: string; items: string[]; active: string; more?: boolean }) {
  return (
    <section className="rounded-md border border-[#ececf3] bg-white p-3">
      <h3 className="mb-3 flex items-center justify-between text-xs font-black">
        {title}
        <ChevronDown className="h-3.5 w-3.5 rotate-180" />
      </h3>
      <div className="space-y-2.5">
        {items.map((item) => (
          <label key={item} className="flex items-center gap-2.5 text-xs font-medium">
            <span className={`grid h-3.5 w-3.5 place-items-center rounded-full border ${item === active ? "border-[#7c19f4] bg-[#7c19f4]" : "border-[#d1d5db]"}`}>
              {item === active ? <CheckCircle2 className="h-2.5 w-2.5 text-white" /> : null}
            </span>
            <span className={item === active ? "text-[#7c19f4]" : "text-[#111827]"}>{item}</span>
          </label>
        ))}
      </div>
      {more ? <button className="mt-3 text-xs font-black text-[#7c19f4]">Voir plus⌄</button> : null}
    </section>
  );
}

function TournamentRow({ tournament }: { tournament: TournamentCard }) {
  return (
    <article className="grid overflow-hidden rounded-md border border-[#ececf3] bg-white shadow-[0_8px_22px_rgba(16,24,40,.045)] lg:grid-cols-[185px_minmax(0,1fr)_205px]">
      <div className="relative min-h-[124px] overflow-hidden bg-[#111827]">
        <img src={tournament.banner} alt="" className="h-full min-h-[124px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <b className="absolute bottom-3 left-3 max-w-[150px] text-xl font-black uppercase leading-5 text-white drop-shadow">{tournament.title.split(" - ")[0]}</b>
      </div>

      <div className="p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <h2 className="text-sm font-black uppercase">{tournament.title}</h2>
          <Badge tone="purple">À VENIR</Badge>
          {tournament.badge ? <Badge tone={tournament.badge === "GUILD WARS" ? "gold" : "blue"}>{tournament.badge}</Badge> : null}
          {tournament.badge === "OFFICIEL" ? <CheckCircle2 className="h-3.5 w-3.5 text-[#2563eb]" /> : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-medium text-[#4b5563]">
          <Info icon={<Users className="h-3.5 w-3.5" />} text={tournament.mode} />
          <Info icon={<Users className="h-3.5 w-3.5" />} text={`${tournament.teams_count ?? 0} Équipes`} />
          <Info icon={<Shield className="h-3.5 w-3.5" />} text={`Mode: ${tournament.room_id ?? "Bermuda"}`} />
        </div>

        <div className="mt-4 rounded-md bg-[#fafafa] p-3">
          <p className="text-[10px] font-black uppercase text-[#4b5563]">RÉCOMPENSE</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-lg font-black"><Diamond className="h-4 w-4 fill-[#0ea5e9] text-[#0ea5e9]" /> {tournament.rewardLabel}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-black"><Gift className="h-4 w-4 text-[#8b5a2b]" /> {tournament.rewardExtra}</span>
          </div>
        </div>
      </div>

      <aside className="border-t border-[#ececf3] p-3.5 lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase text-[#6b7280]">INSCRIPTION</span>
          <b className={tournament.fee === "GRATUITE" ? "text-[10px] text-emerald-600" : "text-[10px] text-[#d99b00]"}>{tournament.fee}</b>
        </div>
        <Schedule label="DÉBUT" date={tournament.startsLabel} />
        <Schedule label="FIN DES INSCRIPTIONS" date={tournament.registrationEnd} />
        <a href={`/tournois/detail?id=${tournament.id}`} className="mt-3 flex h-8 items-center justify-center rounded-md border border-[#7c19f4] text-[10px] font-black text-[#7c19f4]">VOIR DÉTAILS</a>
      </aside>
    </article>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "purple" | "blue" | "gold" }) {
  const classes = {
    purple: "bg-[#7c19f4] text-white",
    blue: "bg-[#2f80ed] text-white",
    gold: "bg-[#f4a11a] text-white"
  };

  return <span className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase ${classes[tone]}`}>{children}</span>;
}

function Info({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {text}
    </span>
  );
}

function Schedule({ label, date }: { label: string; date: string }) {
  return (
    <div className="mt-3">
      <p className="text-[9px] font-black uppercase text-[#6b7280]">{label}</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium"><CalendarDays className="h-3.5 w-3.5" /> {date}</p>
    </div>
  );
}

function Panel({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[#ececf3] bg-white p-3 shadow-[0_8px_22px_rgba(16,24,40,.04)]">
      <h2 className="mb-3 flex items-center text-xs font-black">{title}</h2>
      {children}
    </section>
  );
}

function LiveCard({ item }: { item: (typeof liveTournaments)[number] }) {
  return (
    <article>
      <div className="grid grid-cols-[74px_1fr] gap-3">
        <div className="relative aspect-square overflow-hidden rounded-md bg-[#111827]">
          <img src={item.image} alt="" className="h-full w-full object-cover" />
          <span className="absolute left-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[8px] font-black text-white">LIVE</span>
        </div>
        <div>
          <h3 className="text-xs font-black">{item.title}</h3>
          <p className="mt-1 text-xs font-black text-[#7c19f4]">{item.round}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> {item.mode}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> {item.teams}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span>Fin du round</span>
        <b className="text-red-500">{item.time}</b>
      </div>
      <a href="/live" className="mt-2 flex h-8 items-center justify-center rounded-md bg-[#7c19f4] text-[10px] font-black text-white">{item.action}</a>
    </article>
  );
}

function HowStep({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-3">
      <span className="grid h-6 w-6 place-items-center rounded-full border border-[#d9ddea] text-[#6b7280]">{icon}</span>
      {text}
    </p>
  );
}
