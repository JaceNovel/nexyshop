"use client";

import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Coins, Gamepad2, Info, Radio, ShieldCheck, Trophy, Users, Video } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";

const heroImage = "/ChatGPT_Image_28_mai_2026__20_26_02-removebg-preview.png";

const games = [
  { name: "Free Fire", reward: "diamants", modes: ["Solo", "Duo", "Squad", "Clash Squad"] },
  { name: "Call of Duty Mobile", reward: "CP", modes: ["Solo", "Duo", "Squad", "Battle Royale"] },
  { name: "Asphalt", reward: "jetons", modes: ["Course solo", "Duel", "Equipe"] },
  { name: "eFootball", reward: "coins", modes: ["1v1", "2v2", "Championnat"] }
];

type FundingMode = "astral" | "self";

export default function CreateTournamentPage() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [game, setGame] = useState(games[0].name);
  const [mode, setMode] = useState(games[0].modes[2]);
  const [teamType, setTeamType] = useState("Squad");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [region, setRegion] = useState("Afrique");
  const [platform, setPlatform] = useState("Android");
  const [participants, setParticipants] = useState("48");
  const [rewardAmount, setRewardAmount] = useState("");
  const [funding, setFunding] = useState<FundingMode>("astral");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "created">("idle");

  const selectedGame = useMemo(() => games.find((item) => item.name === game) ?? games[0], [game]);
  const rewardUnit = selectedGame.reward;
  const isAstralFunded = funding === "astral";
  const canSubmit = title.trim() && rewardAmount.trim() && startDate && startTime && participants.trim();

  function submitTournament() {
    if (!canSubmit) return;

    const tournament = {
      id: Date.now(),
      title,
      game,
      mode,
      teamType,
      startsAt: `${startDate}T${startTime}`,
      region,
      platform,
      participants,
      rewardAmount,
      rewardUnit,
      funding,
      status: isAstralFunded ? "pending_financing_validation" : "scheduled",
      description,
      createdAt: new Date().toISOString()
    };

    const stored = JSON.parse(localStorage.getItem("astral_created_tournaments") ?? "[]") as unknown[];
    localStorage.setItem("astral_created_tournaments", JSON.stringify([tournament, ...stored].slice(0, 20)));
    setStatus(isAstralFunded ? "pending" : "created");
  }

  return (
    <main className="min-h-screen bg-[#fbfbfd] text-[#080b15]">
      <SiteHeader />

      <section className="mx-auto grid max-w-[1480px] gap-6 px-5 py-7 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="space-y-5">
          <a href="/tournois" className="inline-flex items-center gap-2 text-xs font-black text-[#667085] transition hover:text-[#e52b2f]">
            <ArrowLeft className="h-4 w-4" />
            Retour aux tournois
          </a>

          <div>
            <p className="text-xs font-black uppercase text-[#e52b2f]">Astral4Gamer Arena</p>
            <h1 className="mt-2 text-4xl font-black leading-tight tracking-normal">Créer un <span className="text-[#e52b2f]">tournoi</span></h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#667085]">
              Organise une compétition, choisis la récompense et décide si Astral4Gamer finance le tournoi ou si tu le finances toi-même.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-[#ffe0e0] bg-white p-6 shadow-[0_16px_38px_rgba(229,43,47,.08)]">
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
            <img src={heroImage} alt="" className="mx-auto h-56 w-56 object-contain drop-shadow-[0_20px_40px_rgba(229,43,47,.18)]" />
            <div className="relative mt-3 rounded-lg border border-[#edf0f4] bg-white p-4">
              <p className="text-sm font-black">Besoin d’aide ?</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#667085]">Les tournois financés par Astral4Gamer sont vérifiés avant publication.</p>
            </div>
          </div>
        </aside>

        <section className="space-y-5">
          <StepBar step={step} />

          <div className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_46px_rgba(16,24,40,.07)]">
            <div className="flex items-center justify-between border-b border-[#edf0f4] pb-4">
              <h2 className="text-lg font-black">Informations du tournoi</h2>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-[#e52b2f]">Création guidée</span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Nom du tournoi" value={title} onChange={setTitle} placeholder="Ex : Astral Cup #1" className="md:col-span-2" />

              <SelectField
                label="Jeu"
                value={game}
                onChange={(value) => {
                  const nextGame = games.find((item) => item.name === value) ?? games[0];
                  setGame(nextGame.name);
                  setMode(nextGame.modes[0]);
                }}
                options={games.map((item) => item.name)}
                icon={<Gamepad2 className="h-4 w-4" />}
              />
              <SelectField label="Mode de jeu" value={mode} onChange={setMode} options={selectedGame.modes} icon={<Radio className="h-4 w-4" />} />

              <div className="md:col-span-2">
                <Label>Type de tournoi</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {["Solo", "Squad"].map((item) => (
                    <ChoiceCard key={item} active={teamType === item} onClick={() => setTeamType(item)} icon={item === "Solo" ? <Users className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />} title={item} text={item === "Solo" ? "Joueurs individuels" : "Equipes / escouades"} />
                  ))}
                </div>
              </div>

              <Field label="Date de début" type="date" value={startDate} onChange={setStartDate} icon={<CalendarDays className="h-4 w-4" />} />
              <Field label="Heure de début" type="time" value={startTime} onChange={setStartTime} icon={<Clock className="h-4 w-4" />} />
              <SelectField label="Plateforme" value={platform} onChange={setPlatform} options={["Android", "iOS", "PC / Emulateur", "Toutes"]} />
              <SelectField label="Région" value={region} onChange={setRegion} options={["Afrique", "Moyen-Orient", "Europe", "Brésil", "Inde", "Asie"]} />
              <Field label="Participants maximum" value={participants} onChange={setParticipants} placeholder="48" />
              <Field label={`Récompense à gagner (${rewardUnit})`} value={rewardAmount} onChange={setRewardAmount} placeholder={game === "Free Fire" ? "Ex : 1080" : "Ex : 500"} icon={<Coins className="h-4 w-4" />} />

              <div className="md:col-span-2">
                <Label>Financement</Label>
                <div className="mt-2 grid gap-3 xl:grid-cols-2">
                  <FundingCard
                    active={funding === "astral"}
                    onClick={() => setFunding("astral")}
                    title="Astral4Gamer finance votre tournoi"
                    price="2$"
                    text="Nous fournissons la récompense. Le tournoi passe en validation et le stream YouTube est réservé à Astral4Gamer."
                    icon={<Trophy className="h-5 w-5" />}
                  />
                  <FundingCard
                    active={funding === "self"}
                    onClick={() => setFunding("self")}
                    title="Je finance moi-même"
                    price="Gratuit"
                    text="Tu fournis la récompense. Le tournoi est créé directement avec le tag Non garantie."
                    icon={<Users className="h-5 w-5" />}
                  />
                </div>
              </div>

              <label className="md:col-span-2">
                <Label>Description du tournoi</Label>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} className="mt-2 min-h-28 w-full resize-none rounded-lg border border-[#d8dde7] px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#e52b2f] focus:ring-4 focus:ring-red-50" placeholder="Décris les règles principales, les objectifs, les conditions de participation..." />
                <span className="mt-1 block text-right text-[11px] font-bold text-[#98a2b3]">{description.length}/500</span>
              </label>
            </div>

            {isAstralFunded ? (
              <div className="mt-5 rounded-lg border border-[#fee2e2] bg-[#fff5f5] p-4 text-sm font-semibold leading-6 text-[#7f1d1d]">
                <Video className="mr-2 inline h-4 w-4 text-[#e52b2f]" />
                Important : si Astral4Gamer finance le tournoi, Astral4Gamer garde l’exclusivité du stream YouTube et la demande reste en attente de validation serveur.
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                Financement personnel : aucune facture Astral4Gamer, création directe après validation du formulaire.
              </div>
            )}

            {status !== "idle" ? (
              <div className={`mt-5 rounded-lg p-4 text-sm font-black ${status === "pending" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                {status === "pending" ? "Tournoi envoyé : en attente de validation du serveur. Si la demande est refusée, le client verra : votre tournoi n’a pas les conditions nécessaires pour un financement." : "Tournoi créé directement. Il sera affiché avec le tag Non garantie."}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button onClick={() => setStep(Math.max(1, step - 1))} className="h-11 rounded-lg border border-[#d8dde7] px-5 text-sm font-black text-[#111827]">Retour</button>
              <button disabled={!canSubmit} onClick={submitTournament} className="h-11 rounded-lg bg-[#e52b2f] px-6 text-sm font-black text-white shadow-[0_14px_28px_rgba(229,43,47,.22)] transition hover:bg-[#c91f27] disabled:cursor-not-allowed disabled:bg-[#fda4af]">
                {isAstralFunded ? "Payer 2$ et envoyer en validation" : "Créer gratuitement"}
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-[0_18px_46px_rgba(16,24,40,.07)]">
            <h2 className="text-sm font-black">Aperçu rapide</h2>
            <div className="mt-4 overflow-hidden rounded-lg bg-[#111827]">
              <div className="relative min-h-[116px] p-4 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(229,43,47,.75),transparent_34%),linear-gradient(135deg,#111827,#35040b)]" />
                <div className="relative">
                  <p className="text-xs font-black uppercase text-red-200">Astral Cup</p>
                  <h3 className="mt-2 text-2xl font-black uppercase">{title || "Nom du tournoi"}</h3>
                </div>
              </div>
            </div>
            <PreviewLine label="Jeu" value={game} />
            <PreviewLine label="Mode" value={mode} />
            <PreviewLine label="Type" value={teamType} />
            <PreviewLine label="Début" value={startDate && startTime ? `${startDate} ${startTime}` : "Non défini"} />
            <PreviewLine label="Plateforme" value={platform} />
            <PreviewLine label="Région" value={region} />
            <PreviewLine label="Participants" value={participants || "Non défini"} />
            <PreviewLine label="Récompense" value={rewardAmount ? `${rewardAmount} ${rewardUnit}` : "Non définie"} />
            <div className={`mt-4 rounded-lg p-3 text-xs font-black ${isAstralFunded ? "bg-red-50 text-[#e52b2f]" : "bg-[#f2f4f7] text-[#667085]"}`}>
              {isAstralFunded ? "Tag : Astral4Gamer garantit ce tournoi" : "Tag : Non garantie"}
            </div>
          </section>

          <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-[0_18px_46px_rgba(16,24,40,.07)]">
            <p className="flex items-start gap-2 text-sm font-black"><Info className="mt-0.5 h-4 w-4 text-[#e52b2f]" /> Règle de validation</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-[#667085]">Tu peux accepter ou refuser les tournois financés par Astral4Gamer depuis l’admin quand la validation serveur sera branchée.</p>
          </section>
        </aside>
      </section>
    </main>
  );
}

function StepBar({ step }: { step: number }) {
  const steps = ["Informations", "Règles", "Récompenses", "Aperçu"];

  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(16,24,40,.05)]">
      <div className="grid grid-cols-4 gap-2">
        {steps.map((item, index) => {
          const active = index + 1 <= step;
          return (
            <button key={item} onClick={() => setTimeout(() => {}, 0)} className="min-w-0">
              <span className="mx-auto grid h-9 w-9 place-items-center rounded-full border text-xs font-black transition" style={{ borderColor: active ? "#e52b2f" : "#e5e7eb", background: active ? "#e52b2f" : "#fff", color: active ? "#fff" : "#98a2b3" }}>
                {index + 1}
              </span>
              <span className={`mt-2 block truncate text-[11px] font-black ${active ? "text-[#e52b2f]" : "text-[#98a2b3]"}`}>{item}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="text-xs font-black text-[#111827]">{children}</span>;
}

function Field({ label, value, onChange, placeholder, type = "text", icon, className = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; icon?: ReactNode; className?: string }) {
  return (
    <label className={className}>
      <Label>{label}</Label>
      <span className="mt-2 flex h-12 items-center gap-2 rounded-lg border border-[#d8dde7] px-4 transition focus-within:border-[#e52b2f] focus-within:ring-4 focus-within:ring-red-50">
        {icon ? <span className="text-[#98a2b3]">{icon}</span> : null}
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#98a2b3]" placeholder={placeholder} />
      </span>
    </label>
  );
}

function SelectField({ label, value, onChange, options, icon }: { label: string; value: string; onChange: (value: string) => void; options: string[]; icon?: ReactNode }) {
  return (
    <label>
      <Label>{label}</Label>
      <span className="mt-2 flex h-12 items-center gap-2 rounded-lg border border-[#d8dde7] px-4 transition focus-within:border-[#e52b2f] focus-within:ring-4 focus-within:ring-red-50">
        {icon ? <span className="text-[#98a2b3]">{icon}</span> : null}
        <select value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none">
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
      </span>
    </label>
  );
}

function ChoiceCard({ active, onClick, icon, title, text }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; text: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 rounded-lg border p-4 text-left transition ${active ? "border-[#e52b2f] bg-red-50 text-[#e52b2f]" : "border-[#d8dde7] bg-white text-[#111827] hover:border-[#e52b2f]"}`}>
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-white shadow-[0_8px_20px_rgba(16,24,40,.06)]">{icon}</span>
      <span><b className="block text-sm">{title}</b><span className="mt-1 block text-xs font-semibold text-[#667085]">{text}</span></span>
    </button>
  );
}

function FundingCard({ active, onClick, icon, title, price, text }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; price: string; text: string }) {
  return (
    <button onClick={onClick} className={`rounded-lg border p-4 text-left transition ${active ? "border-[#e52b2f] bg-[#fff5f5] shadow-[0_14px_30px_rgba(229,43,47,.08)]" : "border-[#d8dde7] bg-white hover:border-[#e52b2f]"}`}>
      <span className="flex items-center justify-between gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-lg ${active ? "bg-[#e52b2f] text-white" : "bg-[#f2f4f7] text-[#667085]"}`}>{icon}</span>
        <b className={`rounded-full px-3 py-1 text-xs ${active ? "bg-[#e52b2f] text-white" : "bg-[#f2f4f7] text-[#111827]"}`}>{price}</b>
      </span>
      <b className="mt-4 block text-sm">{title}</b>
      <span className="mt-2 block text-xs font-semibold leading-5 text-[#667085]">{text}</span>
    </button>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-3 flex items-center justify-between gap-3 border-b border-[#edf0f4] pb-3 text-xs">
      <span className="font-bold text-[#667085]">{label}</span>
      <b className="max-w-[170px] truncate text-right text-[#111827]">{value}</b>
    </p>
  );
}
