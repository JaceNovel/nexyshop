import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CalendarDays, CheckCircle2, ChevronDown, Gift, Plus, Radio, Shield, Trophy, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getTournaments, type Tournament } from "@/lib/api";
import { BestTeamsLeaderboard, TournoisTabs } from "./tournois-client";
import { MineTournaments } from "./mine-tournaments-client";

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
  fundingGuarantee?: "astral" | "self";
};

const filterBlocks = [
  {
    filterKey: "game",
    title: "JEU",
    items: ["Tous", "Free Fire", "PUBG Mobile", "Mobile Legends", "Call of Duty Mobile", "Valorant", "Clash Squad"],
    defaultValue: "Tous",
    more: true
  },
  {
    filterKey: "type",
    title: "TYPE",
    items: ["Tous", "BR - Squad", "Squad", "BR - Duo", "Duo", "BR - Solo", "Solo", "Clash Squad", "Guild Wars"],
    defaultValue: "Tous"
  },
  {
    filterKey: "status",
    title: "STATUT",
    items: ["Tous", "A venir", "En cours", "Inscription ouverte", "Terminés"],
    defaultValue: "Tous"
  },
  {
    filterKey: "price",
    title: "PRIX",
    items: ["Tous", "Gratuit", "Payant"],
    defaultValue: "Tous"
  }
];

function normalizeTournament(tournament: Tournament): TournamentCard {
  const rules = tournament.rules ?? {};
  const coverImage = typeof rules.cover_image === "string" ? rules.cover_image : "";
  const funding = rules.funding === "self" ? "self" : "astral";
  const rewardUnit = typeof rules.reward_unit === "string" && rules.reward_unit.trim() ? rules.reward_unit.trim() : "récompenses";
  const registrationEnd = typeof rules.calendar_slot === "object" && rules.calendar_slot && "ends_at" in rules.calendar_slot
    ? String((rules.calendar_slot as { ends_at?: unknown }).ends_at ?? "")
    : "";

  return {
    ...tournament,
    title: tournament.title || `Tournoi #${tournament.id}`,
    mode: tournament.mode || "Tournoi",
    status: tournament.status || "scheduled",
    starts_at: tournament.starts_at,
    prize_pool: tournament.prize_pool || 0,
    teams_count: tournament.teams_count ?? tournament.teams?.length ?? 0,
    room_id: tournament.room_id ?? null,
    banner: coverImage || "/signup-hero.png",
    fee: funding === "self" ? "GRATUITE" : "2 USD",
    rewardLabel: new Intl.NumberFormat("fr-FR").format(Number(tournament.prize_pool || 0)),
    rewardExtra: rewardUnit,
    startsLabel: tournament.starts_at ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(tournament.starts_at)) : "Date à confirmer",
    registrationEnd: registrationEnd ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(registrationEnd)) : "Avant le début",
    badge: statusBadge(tournament.status),
    fundingGuarantee: funding
  };
}

function tournamentGame(tournament: TournamentCard) {
  const rules = tournament.rules ?? {};
  return typeof rules.game === "string" ? rules.game : "Free Fire";
}

function statusLabel(status?: string | null) {
  const normalized = String(status ?? "").toLowerCase();

  if (["live", "ongoing", "in_progress", "en cours"].some((value) => normalized.includes(value))) return "En cours";
  if (["open", "registration_open", "inscription"].some((value) => normalized.includes(value))) return "Inscription ouverte";
  if (["completed", "finished", "done", "termine", "terminé"].some((value) => normalized.includes(value))) return "Terminés";

  return "A venir";
}

function statusBadge(status?: string | null) {
  const label = statusLabel(status);
  if (label === "En cours") return "LIVE";
  if (label === "Inscription ouverte") return "OUVERT";
  if (label === "Terminés") return "TERMINÉ";
  return "À VENIR";
}

export default async function TournoisPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tabParam = (() => {
    const raw = params?.tab;
    return Array.isArray(raw) ? raw[0] : raw;
  })();
  const mineParam = (() => {
    const raw = params?.mine;
    return Array.isArray(raw) ? raw[0] : raw;
  })();
  const selectedFilters = Object.fromEntries(
    filterBlocks.map((block) => {
      const raw = params?.[block.filterKey];
      const value = Array.isArray(raw) ? raw[0] : raw;
      return [block.filterKey, (typeof value === "string" && value ? value : block.defaultValue)];
    })
  ) as Record<string, string>;

  let tournaments: TournamentCard[] = [];

  try {
    const payload = await getTournaments();
    tournaments = payload.data.map(normalizeTournament);
  } catch {
    tournaments = [];
  }

  const filteredTournaments = tournaments.filter((tournament) => {
    const game = selectedFilters.game;
    const type = selectedFilters.type;
    const status = selectedFilters.status;
    const price = selectedFilters.price;

    const tournamentGameName = tournamentGame(tournament).toLowerCase();

    if (game && game !== "Tous") {
      if (game === "Clash Squad" && !tournament.mode.toLowerCase().includes("clash")) return false;
      if (game !== "Clash Squad" && !tournamentGameName.includes(game.toLowerCase())) return false;
    }

    if (type && type !== "Tous" && type !== tournament.mode) return false;

    const derivedStatus = statusLabel(tournament.status);
    if (status && status !== "Tous" && derivedStatus !== status) return false;

    if (price === "Gratuit" && tournament.fee !== "GRATUITE") return false;
    if (price === "Payant" && tournament.fee === "GRATUITE") return false;

    return true;
  });
  const liveTournaments = tournaments.filter((tournament) => statusLabel(tournament.status) === "En cours").slice(0, 3);

  const activeFiltersCount = filterBlocks.reduce((count, block) => (selectedFilters[block.filterKey] !== block.defaultValue ? count + 1 : count), 0);

  return (
    <main className="min-h-screen bg-[#fbfbfd] text-[#111827]">
      <SiteHeader />

	      <section className="grid w-full gap-4 px-2 py-4 sm:px-3 2xl:px-4 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
	        <aside className="hidden xl:block">
	          <div className="rounded-lg border border-[#ececf3] bg-white p-3 shadow-[0_8px_22px_rgba(16,24,40,.04)]">
	            <div className="mb-3 flex items-center justify-between">
	              <h2 className="text-xs font-black">FILTRES</h2>
	              <a href="/tournois" className="text-[10px] font-black text-[#6d28d9]">Réinitialiser</a>
	            </div>
	            <div className="space-y-3">
              {filterBlocks.map((block) => (
                <FilterBlock key={block.title} {...block} selected={selectedFilters[block.filterKey]} selectedFilters={selectedFilters} />
              ))}
	            </div>
	            <a href="#tournaments" className="mt-3 flex h-9 w-full items-center justify-center rounded-md bg-[#7c19f4] text-xs font-black text-white shadow-[0_10px_20px_rgba(124,25,244,.2)]">
	              FILTRER ({activeFiltersCount})
	            </a>
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

          <TournoisTabs initialTab={typeof tabParam === "string" ? tabParam : undefined} basePath="/tournois" />

          <h2 id="tournaments" className="mb-3 scroll-mt-24 text-xs font-black uppercase">
            {mineParam === "1" ? "MES TOURNOIS" : "TOURNOIS À VENIR"}
          </h2>
          {mineParam === "1" ? (
            <MineTournaments />
          ) : (
            <div className="space-y-3">
              {filteredTournaments.length ? (
                filteredTournaments.map((tournament) => <TournamentRow key={tournament.id} tournament={tournament} />)
              ) : (
                <div className="rounded-md border border-[#ececf3] bg-white p-6 text-center text-sm font-semibold text-[#6b7280]">
                  Aucun tournoi ne correspond à ces filtres.
                </div>
              )}
            </div>
          )}

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
              {liveTournaments.length ? liveTournaments.map((item) => (
                <LiveCard key={item.id} item={item} />
              )) : (
                <p className="rounded-md bg-[#fbfbfd] p-3 text-xs font-semibold text-[#6b7280]">Aucun tournoi live pour le moment.</p>
              )}
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
            <BestTeamsLeaderboard />
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

function FilterBlock({
  title,
  items,
  selected,
  filterKey,
  selectedFilters,
  more
}: {
  title: string;
  items: string[];
  selected: string;
  filterKey: string;
  selectedFilters: Record<string, string>;
  more?: boolean;
}) {
  function hrefFor(value: string) {
    const params = new URLSearchParams(selectedFilters);
    params.set(filterKey, value);
    return `/tournois?${params.toString()}`;
  }

  return (
    <section className="rounded-md border border-[#ececf3] bg-white p-3">
      <h3 className="mb-3 flex items-center justify-between text-xs font-black">
        {title}
        <ChevronDown className="h-3.5 w-3.5 rotate-180" />
      </h3>
      <div className="space-y-2.5">
        {items.map((item) => (
          <a key={item} href={hrefFor(item)} className="flex items-center gap-2.5 text-xs font-medium">
            <span className={`grid h-3.5 w-3.5 place-items-center rounded-full border ${item === selected ? "border-[#7c19f4] bg-[#7c19f4]" : "border-[#d1d5db]"}`}>
              {item === selected ? <CheckCircle2 className="h-2.5 w-2.5 text-white" /> : null}
            </span>
            <span className={item === selected ? "text-[#7c19f4]" : "text-[#111827]"}>{item}</span>
          </a>
        ))}
      </div>
      {more ? <a href={`/tournois?${new URLSearchParams(selectedFilters).toString()}`} className="mt-3 inline-flex text-xs font-black text-[#7c19f4]">Voir plus⌄</a> : null}
    </section>
  );
}

function TournamentRow({ tournament }: { tournament: TournamentCard }) {
  const currentStatus = statusLabel(tournament.status);
  const statusTone = currentStatus === "En cours" ? "red" : currentStatus === "Inscription ouverte" ? "blue" : currentStatus === "Terminés" ? "gray" : "purple";

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
          <Badge tone={statusTone}>{currentStatus}</Badge>
          {tournament.badge ? <Badge tone={tournament.badge === "LIVE" ? "red" : tournament.badge === "TERMINÉ" ? "gray" : "blue"}>{tournament.badge}</Badge> : null}
          <Badge tone={tournament.fundingGuarantee === "astral" ? "red" : "gray"}>
            {tournament.fundingGuarantee === "astral" ? "ASTRAL4GAMER GARANTIT CE TOURNOI" : "NON GARANTIE"}
          </Badge>
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
            <span className="inline-flex items-center gap-1.5 text-lg font-black">
              <img src="/icons/freefire-diamond.svg" alt="" className="h-4 w-4" />
              {tournament.rewardLabel}
            </span>
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

function Badge({ children, tone }: { children: ReactNode; tone: "purple" | "blue" | "gold" | "red" | "gray" }) {
  const classes = {
    purple: "bg-[#7c19f4] text-white",
    blue: "bg-[#2f80ed] text-white",
    gold: "bg-[#f4a11a] text-white",
    red: "bg-[#e52b2f] text-white",
    gray: "bg-[#f2f4f7] text-[#667085]"
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

function LiveCard({ item }: { item: TournamentCard }) {
  return (
    <article>
      <div className="grid grid-cols-[74px_1fr] gap-3">
        <div className="relative aspect-square overflow-hidden rounded-md bg-[#111827]">
          <img src={item.banner} alt="" className="h-full w-full object-cover" />
          <span className="absolute left-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[8px] font-black text-white">LIVE</span>
        </div>
        <div>
          <h3 className="text-xs font-black">{item.title}</h3>
          <p className="mt-1 text-xs font-black text-[#7c19f4]">{item.startsLabel}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> {item.mode}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> {item.teams_count ?? 0} équipes</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span>Statut</span>
        <b className="text-red-500">LIVE</b>
      </div>
      <a href={`/tournois/detail?id=${item.id}`} className="mt-2 flex h-8 items-center justify-center rounded-md bg-[#7c19f4] text-[10px] font-black text-white">VOIR LE TOURNOI</a>
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
