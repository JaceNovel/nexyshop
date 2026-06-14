"use client";

import {
  acceptDiamondDuel,
  createDiamondDuel,
  declineDiamondDuel,
  getDiamondDuels,
  getMyDiamondDuels,
  joinDiamondDuel,
  type DiamondDuel,
  type DiamondDuelPlayer,
  type DiamondDuelStats
} from "@/lib/api";
import { animate, motion } from "framer-motion";
import {
  BadgeCheck,
  Diamond,
  FileText,
  Gamepad2,
  Loader2,
  Play,
  Radio,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Users,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type DuelTab = "waiting" | "active" | "done";

const heroImage = "/duel-hero.png";
const diamondOptions = [100, 300, 500, 1000, 5000, 10000];
const emptyStats: DiamondDuelStats = {
  duels_today: 0,
  diamonds_distributed: 0,
  active_players: 0,
  average_win_rate: 0
};

export function DuelPageClient() {
  const [stats, setStats] = useState<DiamondDuelStats>(emptyStats);
  const [duels, setDuels] = useState<DiamondDuel[]>([]);
  const [myDuels, setMyDuels] = useState<DiamondDuel[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [allowedGame, setAllowedGame] = useState<"free_fire" | "blocked" | "loading">("loading");

  const token = () => (typeof window === "undefined" ? null : localStorage.getItem("nexy_sanctum_token"));

  const loadDuels = useCallback(async (limit: number) => {
    const response = await getDiamondDuels(limit);
    setStats(response.stats);
    setDuels(response.available);
  }, []);

  const loadMine = useCallback(async () => {
    const response = await getMyDiamondDuels(token());
    setMyDuels(response.data);
  }, []);

  const refresh = useCallback(async (limit: number) => {
    setLoading(true);
    setNotice(null);
    try {
      await Promise.all([loadDuels(limit), loadMine()]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Les duels sont momentanément indisponibles.");
    } finally {
      setLoading(false);
    }
  }, [loadDuels, loadMine]);

  useEffect(() => {
    const favoriteGame = localStorage.getItem("astral_favorite_game");
    const hasFreeFire = Boolean(localStorage.getItem("astral_freefire_profile"));
    const normalized = favoriteGame?.trim().toLowerCase();
    setAllowedGame(!favoriteGame || normalized === "free_fire" || normalized === "freefire" || hasFreeFire ? "free_fire" : "blocked");
  }, []);

  useEffect(() => {
    if (allowedGame !== "free_fire") return;
    refresh(5);
  }, [allowedGame, refresh]);

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      await Promise.all([loadDuels(showAll ? 50 : 5), loadMine()]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  const handleShowAll = async () => {
    const next = !showAll;
    setShowAll(next);
    await refresh(next ? 50 : 5);
  };

  if (allowedGame === "loading") return <DuelSkeleton />;
  if (allowedGame === "blocked") return <DuelAccessBlocked />;
  if (loading && duels.length === 0) return <DuelSkeleton />;

  return (
    <div className="w-full px-1 py-4 sm:px-2 lg:px-4">
      <HeroSection />
      <StatsStrip stats={stats} />

      {notice && (
        <div className="mt-4 rounded-lg border border-[#ffd0d0] bg-[#fff6f6] px-4 py-3 text-sm font-bold text-[#b70d0d]">
          {notice}
        </div>
      )}

      <section className="mt-4 grid gap-4 xl:grid-cols-[360px_minmax(520px,1fr)_480px]">
        <CreateDuelCard
          busy={busy}
          onCreate={(payload) => runAction(() => createDiamondDuel(token(), payload), "Duel créé. En attente d'un adversaire.")}
        />
        <AvailableDuelsList
          busy={busy}
          duels={duels}
          showAll={showAll}
          onShowAll={handleShowAll}
          onJoin={(duelId) => runAction(() => joinDiamondDuel(token(), duelId), "Tu as rejoint le duel.")}
        />
        <div className="grid gap-4">
          <EventBanner />
          <MyDuelsCard
            busy={busy}
            duels={myDuels}
            onRefresh={() => runAction(() => loadMine(), "Mes duels sont à jour.")}
            onAccept={(duelId) => runAction(() => acceptDiamondDuel(token(), duelId), "Duel accepté. Bonne chance.")}
            onDecline={(duelId) => runAction(() => declineDiamondDuel(token(), duelId), "Duel refusé ou annulé.")}
          />
          <RulesCard />
        </div>
      </section>

      <SecurityFeatures />
    </div>
  );
}

function DuelAccessBlocked() {
  return (
    <div className="w-full px-3 py-6 sm:px-5">
      <section className="relative overflow-hidden rounded-lg border border-[#e4e8f0] bg-white p-8 shadow-[0_18px_45px_rgba(16,24,40,.08)]">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_40%,rgba(255,31,31,.16),transparent_36%)]" />
        <div className="relative max-w-2xl">
          <span className="inline-flex h-10 items-center rounded-lg bg-[#fff1f1] px-3 text-xs font-black uppercase text-[#ff1010] ring-1 ring-[#ffcaca]">Réservé Free Fire</span>
          <h1 className="mt-4 text-4xl font-black tracking-normal text-[#111827]">Duel 1V1 indisponible pour ce jeu</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#667085]">
            Les duels à mise en diamants sont réservés aux membres Free Fire. Les joueurs PUBG ont leur propre espace avec historique, TOP 500, recherche de match et comparateur.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/pubg" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#111827] px-5 text-sm font-black text-white">
              <Gamepad2 className="h-4 w-4" />
              Ouvrir PUBG Hub
            </a>
            <a href="/profil" className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#dfe4ee] bg-white px-5 text-sm font-black text-[#111827]">
              <ShieldCheck className="h-4 w-4" />
              Voir mon profil
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[338px] overflow-hidden rounded-lg border border-[#dfe4ee] bg-white shadow-[0_18px_45px_rgba(16,24,40,.10)]">
      <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#fff_0%,rgba(255,255,255,.94)_22%,rgba(255,255,255,.45)_38%,rgba(255,255,255,.06)_54%,rgba(2,8,20,.18)_74%,rgba(2,8,20,.88)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_46%,rgba(255,31,31,.42),transparent_18%),linear-gradient(105deg,rgba(255,31,31,.12),transparent_35%,rgba(15,82,255,.20)_80%)]" />

      <motion.div
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative z-10 flex min-h-[338px] flex-col justify-center px-10 py-9"
      >
        <span className="w-fit rounded bg-[#fff1f1] px-3 py-1.5 text-[10px] font-black uppercase text-[#ff1f1f] ring-1 ring-[#ffcaca]">Mode compétitif</span>
        <h1 className="mt-4 text-[54px] font-black uppercase leading-[.92] tracking-normal text-black">
          DUEL 1V1
          <span className="block text-[#ff1f1f]">DIAMANTS</span>
        </h1>
        <p className="mt-4 max-w-[360px] text-[15px] font-semibold leading-6 text-[#263041]">
          Affrontez n'importe qui en 1v1 et remportez jusqu'à 3x votre mise en Diamants 💎
        </p>
        <div className="mt-7 flex gap-4">
          <a href="#create-duel" className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#ff1010] px-6 text-sm font-black text-white shadow-[0_16px_34px_rgba(255,31,31,.32)] transition hover:-translate-y-0.5">
            <Swords className="h-4 w-4" />
            Créer un duel
          </a>
          <a href="#rules" className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-sm font-black text-[#111827] shadow-[0_12px_28px_rgba(16,24,40,.10)] transition hover:-translate-y-0.5">
            <Play className="h-4 w-4" />
            Comment ça marche ?
          </a>
        </div>
      </motion.div>

      <HowCard />
    </section>
  );
}

function HowCard() {
  const steps = [
    { icon: Diamond, title: "Choisissez votre mise", text: "Sélectionnez le montant en Diamants 💎" },
    { icon: Users, title: "Trouvez un adversaire", text: "Affrontez un joueur de votre niveau" },
    { icon: Gamepad2, title: "Jouez votre 1v1", text: "Jouez et montrez qui est le meilleur" },
    { icon: Trophy, title: "Gagnez et multipliez", text: "Le gagnant remporte jusqu'à 3x sa mise !" }
  ];

  return (
    <aside className="absolute bottom-5 right-5 top-5 z-20 hidden w-[305px] rounded-lg bg-[#111827]/94 p-5 text-white shadow-[0_22px_42px_rgba(0,0,0,.34)] ring-1 ring-white/10 xl:block">
      <h2 className="text-[15px] font-black uppercase">Comment ça marche ?</h2>
      <div className="mt-5 grid gap-4">
        {steps.map((step, index) => (
          <div key={step.title} className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/8 text-[#75cfff]">
              <step.icon className="h-5 w-5" />
            </span>
            <div>
              <b className="text-[12px] font-black">{index + 1}. {step.title}</b>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-white/62">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function StatsStrip({ stats }: { stats: DiamondDuelStats }) {
  const items = [
    { icon: Swords, label: "DUELS AUJOURD'HUI", value: stats.duels_today, suffix: "" },
    { icon: Diamond, label: "DIAMANTS DISTRIBUÉS", value: stats.diamonds_distributed, suffix: "" },
    { icon: Users, label: "JOUEURS ACTIFS", value: stats.active_players, suffix: "" },
    { icon: Target, label: "TAUX DE VICTOIRE MOYEN", value: stats.average_win_rate, suffix: "%" }
  ];

  return (
    <section className="mt-4 grid overflow-hidden rounded-lg border border-[#e4e8f0] bg-white shadow-[0_10px_30px_rgba(16,24,40,.07)] sm:grid-cols-2 xl:grid-cols-4">
      {items.map((stat, index) => (
        <article key={stat.label} className="flex min-h-[86px] items-center gap-4 border-b border-[#eef1f5] px-7 py-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
          <span className={`grid h-14 w-14 place-items-center rounded-full ${index === 1 ? "bg-[#ecf7ff] text-[#0ea5ff]" : "bg-[#fff1f1] text-[#ff1f1f]"}`}>
            <stat.icon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase text-[#8a94a6]">{stat.label}</p>
            <AnimatedCounter value={stat.value} suffix={stat.suffix} />
          </div>
        </article>
      ))}
    </section>
  );
}

function EventBanner() {
  return (
    <section className="relative h-[88px] overflow-hidden rounded-lg border border-[#270c0c] bg-[#0f0708] px-7 py-4 text-white shadow-[0_12px_30px_rgba(16,24,40,.10)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_83%_50%,rgba(255,31,31,.58),transparent_25%),linear-gradient(105deg,rgba(255,31,31,.14),transparent_52%)]" />
      <Diamond className="absolute right-12 top-2 h-20 w-20 rotate-12 text-[#ff1f1f]/45" />
      <div className="relative">
        <p className="text-[10px] font-black uppercase text-[#ff1f1f]">ÉVÉNEMENT <span className="text-white">SPONSORISÉ</span></p>
        <h2 className="mt-1 text-3xl font-black uppercase leading-none">x3 DIAMANTS</h2>
        <p className="mt-1 text-[11px] font-semibold text-white/70">Du 10 au 17 Mai 2026</p>
      </div>
    </section>
  );
}

function CreateDuelCard({ busy, onCreate }: { busy: boolean; onCreate: (payload: { stake: number; mode: string; map: string }) => void }) {
  const [stake, setStake] = useState(300);
  const [mode, setMode] = useState("1v1 Classique");
  const [map, setMap] = useState("Bermuda");

  return (
    <section id="create-duel" className="rounded-lg border border-[#e4e8f0] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,.07)]">
      <h2 className="text-[15px] font-black uppercase">Créer un duel</h2>
      <p className="mt-4 text-[12px] font-black">Montant de la mise</p>
      <div className="mt-2 grid grid-cols-4 gap-3">
        {diamondOptions.slice(0, 4).map((amount) => <StakeButton key={amount} amount={amount} active={stake === amount} onClick={() => setStake(amount)} />)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {diamondOptions.slice(4).map((amount) => <StakeButton key={amount} amount={amount} active={stake === amount} onClick={() => setStake(amount)} />)}
      </div>

      <SelectLine label="Mode de jeu" value={mode} onChange={setMode} values={["1v1 Classique", "Sniper", "Desert Eagle", "Clash Squad"]} />
      <SelectLine label="Carte" value={map} onChange={setMap} values={["Bermuda", "Kalahari", "Alpine", "Purgatory"]} />

      <button disabled={busy} onClick={() => onCreate({ stake, mode, map })} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#ff1010] text-[13px] font-black text-white shadow-[0_14px_28px_rgba(255,31,31,.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
        Créer le duel
      </button>

      <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-[#667085]">
        <span>Ticket d'entrée : <b className="text-[#111827]">{stake} 💎</b></span>
        <span>Prize pool estimé : <b className="text-[#111827]">{stake * 3} 💎</b></span>
      </div>
    </section>
  );
}

function StakeButton({ amount, active, onClick }: { amount: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`h-10 rounded-md border text-[12px] font-black transition ${active ? "border-[#ff1010] bg-[#fff5f5] text-[#ff1010]" : "border-[#dfe4ee] bg-white text-[#111827] hover:border-[#ff1010]"}`}>
      {amount} 💎
    </button>
  );
}

function SelectLine({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return (
    <label className="mt-4 block">
      <span className="text-[12px] font-black">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#dfe4ee] bg-white px-3 text-[12px] font-semibold outline-none">
        {values.map((item) => <option key={item}>{item}</option>)}
      </select>
    </label>
  );
}

function AvailableDuelsList({ busy, duels, showAll, onShowAll, onJoin }: { busy: boolean; duels: DiamondDuel[]; showAll: boolean; onShowAll: () => void; onJoin: (duelId: number) => void }) {
  return (
    <section className="rounded-lg border border-[#e4e8f0] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,.07)]">
      <Header title="Duels disponibles" actionLabel={showAll ? "Réduire" : "Voir tous les duels"} onAction={onShowAll} />
      <div className="mt-4 grid gap-3">
        {duels.length === 0 && <EmptyState text="Aucun duel disponible pour le moment." />}
        {duels.map((duel) => (
          <article key={duel.id} className="grid grid-cols-[1fr_34px_1fr_128px_82px] items-center gap-3">
            <PlayerBlock player={duel.creator} />
            <span className="text-center text-[10px] font-black text-[#667085]">VS</span>
            {duel.opponent ? <PlayerBlock player={duel.opponent} /> : <WaitingOpponent />}
            <div className="text-[11px] font-semibold leading-5 text-[#667085]">
              <p>Mise : <b className="text-[#111827]">{duel.stake} 💎</b></p>
              <p>Prize pool : <b className="text-[#111827]">{duel.prize_pool} 💎</b></p>
            </div>
            <button disabled={busy || duel.status !== "open"} onClick={() => onJoin(duel.id)} className="h-9 rounded-md bg-[#ff1010] text-[12px] font-black text-white shadow-[0_10px_22px_rgba(255,31,31,.22)] disabled:cursor-not-allowed disabled:bg-[#d0d5dd]">
              Rejoindre
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function MyDuelsCard({ busy, duels, onRefresh, onAccept, onDecline }: { busy: boolean; duels: DiamondDuel[]; onRefresh: () => void; onAccept: (duelId: number) => void; onDecline: (duelId: number) => void }) {
  const [tab, setTab] = useState<DuelTab>("waiting");
  const [showAllMine, setShowAllMine] = useState(false);
  const tabs: { value: DuelTab; label: string }[] = [
    { value: "waiting", label: "En attente" },
    { value: "active", label: "En cours" },
    { value: "done", label: "Terminés" }
  ];
  const filtered = useMemo(() => duels.filter((duel) => duelBucket(duel) === tab), [duels, tab]);

  return (
    <section className="rounded-lg border border-[#e4e8f0] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,.07)]">
      <Header
        title="Mes duels"
        actionLabel={showAllMine ? "Réduire" : "Voir tout"}
        onAction={() => {
          setShowAllMine((current) => !current);
          onRefresh();
        }}
      />
      <div className="mt-3 grid grid-cols-3 rounded-md bg-[#f4f6fa] p-1">
        {tabs.map((item) => (
          <button key={item.value} onClick={() => setTab(item.value)} className={`h-8 rounded text-[11px] font-black uppercase ${tab === item.value ? "bg-white text-[#ff1010] shadow-sm" : "text-[#667085]"}`}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {filtered.length === 0 && <EmptyState text="Aucun duel dans cette section." />}
        {filtered.slice(0, showAllMine ? filtered.length : 4).map((duel) => (
          <article key={duel.id} className="rounded-lg border border-[#eef1f5] bg-[#fbfcff] p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {duel.opponent ? <Avatar player={duel.opponent} /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-[#fff1f1] text-[#ff1010]"><Users className="h-5 w-5" /></span>}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black">{duelTitle(duel)}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[#667085]">Mise : {duel.stake} 💎</p>
                  <p className="text-[11px] font-semibold text-[#667085]">{duel.mode} • {duel.map}</p>
                </div>
              </div>
              {duel.status === "matched" ? (
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => onAccept(duel.id)} className="h-8 rounded-md bg-[#ff1010] px-4 text-[11px] font-black text-white disabled:opacity-60">Accepter</button>
                  <button disabled={busy} onClick={() => onDecline(duel.id)} className="h-8 rounded-md border border-[#dfe4ee] px-4 text-[11px] font-black disabled:opacity-60">Refuser</button>
                </div>
              ) : (
                <button disabled={busy || duel.status === "completed"} onClick={() => onDecline(duel.id)} className="h-8 rounded-md border border-[#dfe4ee] px-4 text-[11px] font-black disabled:opacity-60">
                  {duel.status === "completed" ? "Terminé" : "Annuler"}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RulesCard() {
  return (
    <section id="rules" className="rounded-lg border border-[#e4e8f0] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,.07)]">
      <h2 className="text-[15px] font-black uppercase">Règles rapides</h2>
      <ul className="mt-3 space-y-1 text-[12px] font-semibold leading-5 text-[#667085]">
        <li>• Les deux joueurs paient avant le début du duel.</li>
        <li>• Pas de remboursement en cas de défaite.</li>
        <li>• Preuve vidéo ou capture obligatoire.</li>
        <li>• Triche = bannissement définitif.</li>
      </ul>
    </section>
  );
}

function SecurityFeatures() {
  const features = [
    { icon: ShieldCheck, title: "100% Sécurisé", text: "Paiement sécurisé & équitable" },
    { icon: Zap, title: "Système Anti-Triche", text: "Détection et protection avancée" },
    { icon: Radio, title: "Support 24/7", text: "Équipe disponible à tout moment" },
    { icon: FileText, title: "Transaction Instantanée", text: "Diamants envoyés immédiatement" }
  ];

  return (
    <section className="mt-4 grid gap-4 rounded-lg border border-[#e4e8f0] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,.07)] md:grid-cols-2 xl:grid-cols-4">
      {features.map((feature) => (
        <article key={feature.title} className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ff1010] text-white">
            <feature.icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-[12px] font-black uppercase">{feature.title}</h3>
            <p className="mt-1 text-[11px] font-semibold text-[#667085]">{feature.text}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function Header({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] font-black uppercase">{title}</h2>
      <button onClick={onAction} className="text-[11px] font-black text-[#ff1010]">{actionLabel} →</button>
    </div>
  );
}

function PlayerBlock({ player }: { player: DiamondDuelPlayer }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar player={player} />
      <div className="min-w-0">
        <p className="truncate text-[12px] font-black uppercase">{player.name}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#667085]">
          <BadgeCheck className="h-3 w-3 fill-[#3b5bff] text-white" />
          {player.rank || "Diamant"}
        </p>
      </div>
    </div>
  );
}

function WaitingOpponent() {
  return (
    <div className="flex min-w-0 items-center gap-3 text-[#667085]">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f4f6fa]"><Users className="h-4 w-4" /></span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-black uppercase">En attente</p>
        <p className="mt-1 text-[11px] font-semibold">Adversaire libre</p>
      </div>
    </div>
  );
}

function Avatar({ player }: { player: DiamondDuelPlayer }) {
  return <img src={player.avatar || "/freefire-media/diamond-removebg-preview.png"} alt="" className="h-11 w-11 rounded-full bg-[#f4f6fa] object-cover ring-2 ring-white shadow-[0_8px_18px_rgba(16,24,40,.14)]" />;
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-[#dfe4ee] bg-[#fbfcff] px-4 py-5 text-center text-sm font-bold text-[#667085]">{text}</p>;
}

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (latest) => {
        const next = suffix === "%" ? latest.toFixed(1) : Math.round(latest).toLocaleString("fr-FR");
        setDisplay(`${next}${suffix}`);
      }
    });
    return () => controls.stop();
  }, [suffix, value]);

  return <b className="mt-1 block text-[24px] font-black leading-none text-[#111827]">{display}</b>;
}

function DuelSkeleton() {
  return (
    <div className="w-full px-1 py-4 sm:px-2 lg:px-4">
      <div className="grid h-[338px] animate-pulse rounded-lg border border-[#dfe4ee] bg-white p-8">
        <Loader2 className="m-auto h-8 w-8 animate-spin text-[#ff1010]" />
      </div>
    </div>
  );
}

function duelBucket(duel: DiamondDuel): DuelTab {
  if (duel.status === "active") return "active";
  if (duel.status === "completed" || duel.status === "cancelled") return "done";
  return "waiting";
}

function duelTitle(duel: DiamondDuel) {
  if (duel.status === "open") return "En attente d'adversaire...";
  if (duel.status === "matched") return `Adversaire trouvé : ${duel.opponent?.name ?? "Joueur"}`;
  if (duel.status === "active") return `Duel en cours : ${duel.opponent?.name ?? "Joueur"}`;
  return `Duel terminé : ${duel.prize_pool} 💎`;
}
