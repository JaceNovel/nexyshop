"use client";

import { useMemo, useRef, useState } from "react";
import { BadgeCheck, ChevronDown, ChevronRight, Crown, Gamepad2, Globe2, Search, ShieldCheck, Swords, Trophy, Users, Zap } from "lucide-react";

type PublicLookup = {
  account_name: string;
  region: string;
  level: number;
  likes: number;
  account_created_at: string;
  last_login_at: string;
  br_max_rank: number;
  br_rank_points: number;
  cs_max_rank: number;
  cs_rank_points: number;
  title: string;
  profile: {
    equipped_outfit: { id: string; label: string; image?: string | null }[];
    equipped_skills: { id: string; label: string; image?: string | null }[];
    images: { title?: string | null; profile?: string | null };
  };
  guild: { name: string; level: number; members: number; capacity: number };
  captain: { nickname: string; level: number; xp: number; grade: number; rank_points: number; region: string };
  credit_score: { score: number; reward_state: string };
  pet: { level: number; xp: number };
  social: {
    hint: string;
    solo: StatBlock;
    duo: StatBlock;
    squad: StatBlock;
  };
};

type StatBlock = {
  matches_played: number;
  total_kills: number;
  total_wins: number;
  damage_dealt: number;
  deaths: number;
  distance_travelled: number;
  headshots_kills: number;
  headshots_hits: number;
  highest_kills_in_match: number;
  items_picked_up: number;
  revives: number;
  pets_killed: number;
  survival_time_seconds: number;
  top_n_times: number;
};

const mockProfilesById: Record<string, PublicLookup> = {
  "904590059": {
    account_name: "ASTRALᅠPRV",
    region: "MOI",
    level: 70,
    likes: 13781,
    account_created_at: "14/08/2020 13:43:53",
    last_login_at: "29/05/2026 13:41:31",
    br_max_rank: 315,
    br_rank_points: 2665,
    cs_max_rank: 313,
    cs_rank_points: 49,
    title: "904590059",
    profile: {
      images: {
        title: "https://via.placeholder.com/560x260/0b0f18/ff1f2f?text=TITRE+(exemple)",
        profile: "https://via.placeholder.com/560x260/0b0f18/ff1f2f?text=PROFIL+(exemple)"
      },
      equipped_outfit: [
        { id: "203000543", label: "Veste Astral Shadow", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Outfit" },
        { id: "204000859", label: "Masque Oni Rouge", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Outfit" },
        { id: "203049044", label: "Gants Cyber", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Outfit" },
        { id: "211034006", label: "Pantalon Tactical", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Outfit" },
        { id: "211000309", label: "Bottes Phantom", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Outfit" },
        { id: "205041039", label: "Sac Astral", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Outfit" },
        { id: "214000101", label: "Badge Elite", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Badge" }
      ],
      equipped_skills: [
        { id: "16", label: "Sprint (Niv. 4)", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Skill" },
        { id: "7406", label: "Mur gloo +", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Skill" },
        { id: "5206", label: "Précision", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Skill" },
        { id: "4306", label: "Médikit rapide", image: "https://via.placeholder.com/96/0b0f18/ff1f2f?text=Skill" }
      ]
    },
    guild: { name: "ᴘʀɪᴠɪʟᴇɢᴇ.", level: 5, members: 12, capacity: 55 },
    captain: { nickname: "OnlyᅠICEᅠPRV", level: 70, xp: 3031439, grade: 318, rank_points: 3060, region: "MOI" },
    credit_score: { score: 100, reward_state: "REWARD_STATE_UNCLAIMED" },
    pet: { level: 4, xp: 540 },
    social: {
      hint: "Ouvre le suivi pour voir les statistiques (exemple).",
      solo: {
        matches_played: 120,
        total_kills: 860,
        total_wins: 22,
        damage_dealt: 255400,
        deaths: 98,
        distance_travelled: 143210,
        headshots_kills: 210,
        headshots_hits: 540,
        highest_kills_in_match: 17,
        items_picked_up: 3890,
        revives: 41,
        pets_killed: 12,
        survival_time_seconds: 180420,
        top_n_times: 44
      },
      duo: {
        matches_played: 62,
        total_kills: 410,
        total_wins: 11,
        damage_dealt: 132800,
        deaths: 54,
        distance_travelled: 80210,
        headshots_kills: 98,
        headshots_hits: 240,
        highest_kills_in_match: 13,
        items_picked_up: 1804,
        revives: 33,
        pets_killed: 5,
        survival_time_seconds: 91420,
        top_n_times: 21
      },
      squad: {
        matches_played: 180,
        total_kills: 1290,
        total_wins: 37,
        damage_dealt: 410200,
        deaths: 152,
        distance_travelled: 220110,
        headshots_kills: 280,
        headshots_hits: 610,
        highest_kills_in_match: 21,
        items_picked_up: 5202,
        revives: 140,
        pets_killed: 26,
        survival_time_seconds: 260120,
        top_n_times: 67
      }
    }
  }
};

function normalizeId(value: string) {
  return value.trim().replace(/\s+/g, "");
}

export function ProfilPublicClient() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => {
    if (!submitted) return null;
    return mockProfilesById[submitted] ?? null;
  }, [submitted]);

  const characterImage = "/ChatGPT%20Image%2029%20mai%202026,%2014_34_08.png";

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#111827]">
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#6b7280]">
          <a href="/" className="hover:text-[#e52b2f]">Accueil</a>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#111827]">Profil public</span>
        </div>

        <section className="mt-6 grid gap-8 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-[0_20px_60px_rgba(16,24,40,.08)] lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tight">Profil public</h1>
              <BadgeCheck className="h-6 w-6 fill-[#e52b2f] text-white" />
            </div>
            <p className="mt-3 max-w-xl text-sm font-semibold text-[#6b7280]">
              Recherchez un joueur par son ID Astral4Gamer pour consulter ses statistiques et ses réalisations publiques.
            </p>

            <div className="mt-7 rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_50px_rgba(16,24,40,.08)]">
              <p className="text-base font-black text-[#111827]">Rechercher un joueur</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex h-12 flex-1 items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white px-4 shadow-[0_10px_26px_rgba(16,24,40,.06)] focus-within:border-[#e52b2f]">
                  <Search className="h-5 w-5 text-[#9ca3af]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[#9ca3af]"
                    placeholder="Entrez l'ID du joueur (ex : 904590059)"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const id = normalizeId(query);
                    setSubmitted(id);
                    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#e52b2f] px-6 text-sm font-black text-white shadow-[0_16px_40px_rgba(229,43,47,.24)] transition hover:bg-[#c91f27]"
                >
                  Rechercher <span aria-hidden>→</span>
                </button>
              </div>
              <p className="mt-3 text-xs font-semibold text-[#6b7280]">
                Saisissez l'ID exact du joueur pour afficher son profil public.
              </p>
            </div>
          </div>

          <div className="relative hidden items-end justify-end lg:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={characterImage} alt="" className="h-[360px] w-auto select-none object-contain" />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-center text-2xl font-black">Que pouvez-vous voir ?</h2>
          <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-[#e52b2f]" />

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <InfoCard icon={<Trophy className="h-6 w-6 text-[#e52b2f]" />} title="Statistiques du joueur" text="Consultez les stats générales, victoires, K/D et plus encore." />
            <InfoCard icon={<Zap className="h-6 w-6 text-[#e52b2f]" />} title="Rang actuel" text="Découvrez le rang actuel et le classement du joueur." />
            <InfoCard icon={<Globe2 className="h-6 w-6 text-[#e52b2f]" />} title="Historique des tournois" text="Voir les tournois joués et les performances." />
            <InfoCard icon={<BadgeCheck className="h-6 w-6 text-[#e52b2f]" />} title="Succès & badges" text="Consultez les badges et récompenses obtenus." />
            <InfoCard icon={<Users className="h-6 w-6 text-[#e52b2f]" />} title="Guilde" text="Découvrez la guilde actuelle du joueur." />
          </div>

          <div className="mt-7 flex items-start gap-4 rounded-2xl border border-[#fde2e2] bg-[#fff1f2] p-6">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#e52b2f] shadow-[0_12px_26px_rgba(229,43,47,.18)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-[#111827]">Sécurité & confidentialité</p>
              <p className="mt-1 text-sm font-semibold text-[#6b7280]">
                Seules les informations publiques des joueurs sont affichées. Les données privées et sensibles restent protégées.
              </p>
            </div>
          </div>
        </section>

        {submitted ? (
          <section
            ref={resultRef}
            className="relative left-1/2 mt-10 w-screen -translate-x-1/2 scroll-mt-24 rounded-none border-y border-[#e5e7eb] bg-white shadow-[0_20px_60px_rgba(16,24,40,.08)]"
          >
            <div className="w-full px-6 py-8">
            {selected ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black tracking-widest text-[#6b7280]">RÉSULTAT</p>
                    <h3 className="mt-2 text-2xl font-black">{selected.account_name}</h3>
                    <p className="mt-2 text-sm font-semibold text-[#6b7280]">ID: <span className="font-mono font-black text-[#111827]">{submitted}</span></p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#fff1f2] px-4 py-2 text-xs font-black text-[#e52b2f]">
                    <BadgeCheck className="h-4 w-4" /> Profil public
                  </span>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-3">
                  <DataCard title="Informations du compte">
                    <KeyValue k="Nom du compte" v={selected.account_name} />
                    <KeyValue k="Région du compte" v={selected.region} />
                    <KeyValue k="Niveau de compte" v={String(selected.level)} />
                    <KeyValue k="Mentions J’aime" v={String(selected.likes)} />
                    <KeyValue k="Temps de création" v={selected.account_created_at} />
                    <KeyValue k="Dernière connexion" v={selected.last_login_at} />
                    <KeyValue k="Rang Br Max" v={String(selected.br_max_rank)} />
                    <KeyValue k="Points BR" v={String(selected.br_rank_points)} />
                    <KeyValue k="Rang Cs Max" v={String(selected.cs_max_rank)} />
                    <KeyValue k="Points CS" v={String(selected.cs_rank_points)} />
                    <KeyValue k="Titre" v={selected.title} />
                  </DataCard>

                  <DataCard title="Profil">
                    <div className="grid gap-3">
                      <MediaCard label="Titre" src={selected.profile.images.title ?? undefined} />
                      <MediaCard label="Profil" src={selected.profile.images.profile ?? undefined} />
                    </div>
                    <RichChipList label="Unité équipée" items={selected.profile.equipped_outfit} />
                    <RichChipList label="Compétences équipées" items={selected.profile.equipped_skills} />
                  </DataCard>

                  <DataCard title="Guilde">
                    <KeyValue k="Nom de la guilde" v={selected.guild.name} />
                    <KeyValue k="Niveau de guilde" v={String(selected.guild.level)} />
                    <KeyValue k="Membres" v={String(selected.guild.members)} />
                    <KeyValue k="Capacité" v={String(selected.guild.capacity)} />
                    <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
                      <p className="text-xs font-black tracking-widest text-[#6b7280]">CAPITAINE</p>
                      <p className="mt-2 text-sm font-black text-[#111827]">{selected.captain.nickname}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-[#6b7280]">
                        <span>Niveau: <b className="text-[#111827]">{selected.captain.level}</b></span>
                        <span>XP: <b className="text-[#111827]">{selected.captain.xp}</b></span>
                        <span>Grade: <b className="text-[#111827]">{selected.captain.grade}</b></span>
                        <span>Pts: <b className="text-[#111827]">{selected.captain.rank_points}</b></span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[#e5e7eb] bg-white p-4">
                        <p className="text-xs font-black tracking-widest text-[#6b7280]">CRÉDIT</p>
                        <p className="mt-2 text-lg font-black text-[#111827]">{selected.credit_score.score}</p>
                        <p className="mt-1 text-[11px] font-semibold text-[#6b7280]">{selected.credit_score.reward_state}</p>
                      </div>
                      <div className="rounded-xl border border-[#e5e7eb] bg-white p-4">
                        <p className="text-xs font-black tracking-widest text-[#6b7280]">ANIMAL</p>
                        <p className="mt-2 text-sm font-black text-[#111827]">Niveau {selected.pet.level}</p>
                        <p className="mt-1 text-[11px] font-semibold text-[#6b7280]">XP {selected.pet.xp}</p>
                      </div>
                    </div>
                  </DataCard>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <DataCard title="Statistiques des joueurs">
                    <p className="text-xs font-semibold text-[#6b7280]">{selected.social.hint}</p>
                    <ExpandableSection title="Statistiques solo" icon={<Crown className="h-4 w-4 text-[#e52b2f]" />}>
                      <StatGrid stats={selected.social.solo} />
                    </ExpandableSection>
                    <ExpandableSection title="Statistiques duo" icon={<Users className="h-4 w-4 text-[#e52b2f]" />}>
                      <StatGrid stats={selected.social.duo} />
                    </ExpandableSection>
                    <ExpandableSection title="Statistiques de l’effectif" icon={<Swords className="h-4 w-4 text-[#e52b2f]" />}>
                      <StatGrid stats={selected.social.squad} />
                    </ExpandableSection>
                  </DataCard>

                  <DataCard title="Résumé rapide">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MiniStat icon={<Gamepad2 className="h-4 w-4 text-[#e52b2f]" />} label="Mode" value="Battle Royale / Clash Squad" />
                      <MiniStat icon={<Trophy className="h-4 w-4 text-[#e52b2f]" />} label="Niveau" value={String(selected.level)} />
                      <MiniStat icon={<Zap className="h-4 w-4 text-[#e52b2f]" />} label="Likes" value={String(selected.likes)} />
                      <MiniStat icon={<ShieldCheck className="h-4 w-4 text-[#e52b2f]" />} label="Crédit" value={String(selected.credit_score.score)} />
                    </div>
                    <p className="mt-4 text-xs font-semibold text-[#6b7280]">
                      Tout est en mode local pour l’instant. Quand on branche l’API, on remplacera ces champs par les valeurs réelles + les images (titre, unités, compétences).
                    </p>
                  </DataCard>
                </div>

                <p className="mt-6 text-xs font-semibold text-[#6b7280]">
                  Données affichées en mode local (exemple). En production, ce bloc sera alimenté par l’API et inclura les images réelles (titre, unités, compétences, etc.).
                </p>
              </>
            ) : (
              <div className="text-center">
                <p className="text-lg font-black">Aucun joueur trouvé</p>
                <p className="mt-2 text-sm font-semibold text-[#6b7280]">Vérifiez l’ID et réessayez.</p>
              </div>
            )}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_50px_rgba(16,24,40,.06)]">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff1f2]">{icon}</div>
      <p className="mt-4 text-sm font-black text-[#111827]">{title}</p>
      <p className="mt-2 text-xs font-semibold text-[#6b7280]">{text}</p>
    </div>
  );
}

function DataCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_50px_rgba(16,24,40,.06)]">
      <p className="text-sm font-black text-[#111827]">{title}</p>
      <div className="mt-4 grid gap-2">{children}</div>
    </div>
  );
}

function KeyValue({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#eef2f7] bg-[#fbfdff] px-3 py-2">
      <span className="text-xs font-semibold text-[#6b7280]">{k}</span>
      <span className="text-xs font-black text-[#111827]">{v}</span>
    </div>
  );
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#6b7280]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="inline-flex items-center rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-[11px] font-black text-[#111827]">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function RichChipList({ label, items }: { label: string; items: { id: string; label: string; image?: string | null }[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-[#6b7280]">{label}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-[#0b0f18]">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="h-10 w-10 object-cover" />
              ) : (
                <span className="text-[10px] font-black text-white/80">IMG</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-[#111827]">{item.label}</p>
              <p className="mt-0.5 font-mono text-[11px] font-bold text-[#6b7280]">{item.id}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaCard({ label, src }: { label: string; src?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <p className="text-xs font-black tracking-widest text-[#6b7280]">{label.toUpperCase()}</p>
        <span className="rounded-full bg-[#fff1f2] px-2 py-1 text-[10px] font-black text-[#e52b2f]">EXEMPLE</span>
      </div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-[140px] w-full object-cover" />
      ) : (
        <div className="grid h-[140px] place-items-center bg-[#0b0f18] text-xs font-black text-white/70">Aucune image</div>
      )}
    </div>
  );
}

function ExpandableSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="inline-flex items-center gap-2 text-sm font-black text-[#111827]">{icon}{title}</span>
        <ChevronDown className={`h-5 w-5 text-[#6b7280] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="border-t border-[#e5e7eb] p-4">{children}</div> : null}
    </div>
  );
}

function StatGrid({ stats }: { stats: StatBlock }) {
  const rows: { k: string; v: string }[] = [
    { k: "Matchs joués", v: String(stats.matches_played) },
    { k: "Total des éliminations", v: String(stats.total_kills) },
    { k: "Total des victoires", v: String(stats.total_wins) },
    { k: "Dégâts infligés", v: String(stats.damage_dealt) },
    { k: "Décès", v: String(stats.deaths) },
    { k: "Distance parcourue", v: String(stats.distance_travelled) },
    { k: "Tirs à la tête tués", v: String(stats.headshots_kills) },
    { k: "Tirs à la tête portés", v: String(stats.headshots_hits) },
    { k: "Plus haut kills (match)", v: String(stats.highest_kills_in_match) },
    { k: "Objets récupérés", v: String(stats.items_picked_up) },
    { k: "Revives terminées", v: String(stats.revives) },
    { k: "Animaux tués", v: String(stats.pets_killed) },
    { k: "Temps de survie (s)", v: String(stats.survival_time_seconds) },
    { k: "Top N Times", v: String(stats.top_n_times) }
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((row) => (
        <KeyValue key={row.k} k={row.k} v={row.v} />
      ))}
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff1f2]">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-black tracking-widest text-[#6b7280]">{label.toUpperCase()}</p>
        <p className="mt-1 truncate text-sm font-black text-[#111827]">{value}</p>
      </div>
    </div>
  );
}
