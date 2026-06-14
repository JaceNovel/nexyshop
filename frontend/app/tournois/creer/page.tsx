"use client";

import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Coins, Gamepad2, Image as ImageIcon, Info, Loader2, Phone, Radio, ShieldCheck, Trophy, Users, Video } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { getTournamentSlots, requestTournamentCreation, type TournamentSlot } from "@/lib/api";

const heroImage = "/ChatGPT%20Image%2029%20mai%202026,%2014_34_08.png";

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
  const [slots, setSlots] = useState<TournamentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TournamentSlot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [region, setRegion] = useState("Afrique");
  const [platform, setPlatform] = useState("Android");
  const [phone, setPhone] = useState("");
  const [participants, setParticipants] = useState("48");
  const [rewardAmount, setRewardAmount] = useState("");
  const [funding, setFunding] = useState<FundingMode>("astral");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "created">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverImageData, setCoverImageData] = useState<string | null>(null);
  const [coverError, setCoverError] = useState("");

  const selectedGame = useMemo(() => games.find((item) => item.name === game) ?? games[0], [game]);
  const rewardUnit = selectedGame.reward;
  const isAstralFunded = funding === "astral";
  const canSubmit = Boolean(title.trim() && rewardAmount.trim() && selectedSlot && participants.trim() && phone.trim() && !submitting);

  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      setSlotsLoading(true);
      const payload = await getTournamentSlots();

      if (!cancelled) {
        setSlots(payload.data);
        setSelectedSlot(payload.data[0] ?? null);
        if (payload.data[0]) {
          syncSlotFields(payload.data[0]);
        }
        setSlotsLoading(false);
      }
    }

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  async function submitTournament() {
    if (!canSubmit) return;
    const slot = selectedSlot;
    if (!slot) return;

    setSubmitError("");
    setPaymentNotice("");
    setSubmitting(true);

    const tournament = {
      id: Date.now(),
      title,
      game,
      mode,
      teamType,
      startsAt: slot.starts_at,
      region,
      platform,
      phone,
      participants,
      rewardAmount,
      rewardUnit,
      funding,
      status: isAstralFunded ? "pending_financing_validation" : "scheduled",
      description,
      coverImage: coverImageData,
      createdAt: new Date().toISOString()
    };

    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) {
      setSubmitError("Connecte-toi pour réserver un créneau calendrier et créer le tournoi.");
      setSubmitting(false);
      return;
    }

    let createdTournamentId: number | null = null;
    let checkoutUrl: string | null | undefined = null;
    let paymentStatus: string | null | undefined = null;

    try {
      const response = await requestTournamentCreation(token, {
        title,
        game,
        mode,
        team_type: teamType,
        slot: { starts_at: slot.starts_at, ends_at: slot.ends_at },
        region,
        platform,
        phone,
        participants: Number(participants),
        reward_amount: Number(rewardAmount),
        reward_unit: rewardUnit,
        funding,
        description,
        cover_image: coverImageData
      });
      createdTournamentId = response.data.id;
      checkoutUrl = response.checkout_url;
      paymentStatus = response.payment_status;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Création du tournoi impossible.");
      setSubmitting(false);
      return;
    }

    const stored = JSON.parse(localStorage.getItem("astral_created_tournaments") ?? "[]") as unknown[];
    localStorage.setItem("astral_created_tournaments", JSON.stringify([{ ...tournament, id: createdTournamentId ?? tournament.id }, ...stored].slice(0, 20)));
    setStatus(isAstralFunded ? "pending" : "created");
    setStep(4);
    setSubmitting(false);

    if (checkoutUrl) {
      window.location.assign(checkoutUrl);
      return;
    }

    if (isAstralFunded && paymentStatus === "not_configured") {
      setPaymentNotice("Le tournoi est enregistré. Le paiement 2$ sera disponible dès que Moneroo sera configuré côté serveur.");
    } else if (isAstralFunded && paymentStatus === "unavailable") {
      setPaymentNotice("Le tournoi est enregistré. Le lien de paiement n’a pas pu être généré pour le moment.");
    }
  }

  function selectSlot(slot: TournamentSlot) {
    setSelectedSlot(slot);
    syncSlotFields(slot);
  }

  function syncSlotFields(slot: TournamentSlot) {
    const start = new Date(slot.starts_at);
    setStartDate(start.toISOString().slice(0, 10));
    setStartTime(start.toTimeString().slice(0, 5));
  }

  function handleCoverChange(file?: File) {
    setCoverError("");

    if (!file) return;

    if (file.size > 1_200_000) {
      setCoverError("Image trop lourde. Choisis une image de 1,2 Mo maximum pour l’envoyer au backend.");
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextPreview;
    });

    const reader = new FileReader();
    reader.onload = () => {
      setCoverImageData(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => {
      setCoverError("Impossible de lire cette image.");
      setCoverImageData(null);
    };
    reader.readAsDataURL(file);
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
            <h1 className="mt-2 text-2xl font-black leading-tight tracking-normal sm:text-3xl">Créer un <span className="text-[#e52b2f]">tournoi</span></h1>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
              Organise une compétition, choisis la récompense et décide si Astral4Gamer finance le tournoi ou si tu le finances toi-même.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-[#ffe0e0] bg-white p-6 shadow-[0_16px_38px_rgba(229,43,47,.08)]">
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
            <img src={heroImage} alt="" className="mx-auto h-44 w-44 object-contain drop-shadow-[0_20px_40px_rgba(229,43,47,.18)]" />
            <div className="relative mt-3 rounded-lg border border-[#edf0f4] bg-white p-4">
              <p className="text-[13px] font-black">Besoin d’aide ?</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#667085]">Les tournois financés par Astral4Gamer sont vérifiés avant publication.</p>
            </div>
          </div>
        </aside>

        <section className="space-y-5">
          <StepBar step={step} onStepChange={setStep} />

          <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-[0_18px_46px_rgba(16,24,40,.07)]">
            <div className="flex items-center justify-between border-b border-[#edf0f4] pb-4">
              <h2 className="text-base font-black">Informations du tournoi</h2>
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

              <Field label="Date de début" type="date" value={startDate} onChange={setStartDate} icon={<CalendarDays className="h-4 w-4" />} disabled />
              <Field label="Heure de début" type="time" value={startTime} onChange={setStartTime} icon={<Clock className="h-4 w-4" />} disabled />
              <div className="md:col-span-2">
                <Label>Créneau disponible Astral4Gamer</Label>
                {slotsLoading ? (
                  <div className="mt-2 flex h-24 items-center justify-center gap-2 rounded-lg border border-[#d8dde7] bg-[#fbfbfd] text-sm font-black text-[#667085]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement du calendrier...
                  </div>
                ) : slots.length ? (
                  <div className="mt-2 grid max-h-[190px] gap-2 overflow-y-auto rounded-lg border border-[#d8dde7] bg-[#fbfbfd] p-2 sm:grid-cols-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => selectSlot(slot)}
                        className={`rounded-md border px-3 py-2 text-left text-xs font-black transition ${selectedSlot?.id === slot.id ? "border-[#e52b2f] bg-white text-[#e52b2f] shadow-[0_8px_18px_rgba(229,43,47,.1)]" : "border-[#e5e7eb] bg-white text-[#111827] hover:border-[#e52b2f]"}`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-[#fee2e2] bg-[#fff5f5] p-3 text-sm font-bold text-[#b42318]">
                    Aucun créneau disponible pour le moment.
                  </div>
                )}
                <p className="mt-2 text-xs font-semibold text-[#667085]">Créneaux d’1h uniquement, disponibles à partir de 18h GMT, calculés depuis le calendrier Astral4Gamer et les tournois déjà réservés.</p>
              </div>
              <SelectField label="Plateforme" value={platform} onChange={setPlatform} options={["Android", "iOS", "PC / Emulateur", "Toutes"]} />
              <SelectField label="Région" value={region} onChange={setRegion} options={["Afrique", "Moyen-Orient", "Europe", "Brésil", "Inde", "Asie"]} />
              <Field label="Numéro de téléphone" type="tel" value={phone} onChange={setPhone} placeholder="Ex : +225 01 02 03 04 05" icon={<Phone className="h-4 w-4" />} />
              <Field label="Participants maximum" value={participants} onChange={setParticipants} placeholder="48" />
              <Field label={`Récompense à gagner (${rewardUnit})`} value={rewardAmount} onChange={setRewardAmount} placeholder={game === "Free Fire" ? "Ex : 1080" : "Ex : 500"} icon={<Coins className="h-4 w-4" />} />

              <label className="md:col-span-2">
                <Label>Image de couverture</Label>
                <span className="mt-2 flex items-center gap-3 rounded-lg border border-[#d8dde7] px-4 py-2.5 transition focus-within:border-[#e52b2f] focus-within:ring-4 focus-within:ring-red-50">
                  <span className="text-[#98a2b3]">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="min-w-0 flex-1 text-sm font-semibold text-[#111827] file:mr-4 file:rounded-md file:border-0 file:bg-[#f2f4f7] file:px-3 file:py-1.5 file:text-xs file:font-black file:text-[#111827] hover:file:bg-[#e5e7eb]"
                    onChange={(event) => {
                      handleCoverChange(event.target.files?.[0]);
                    }}
                  />
                </span>
                <p className="mt-2 text-xs font-semibold text-[#667085]">Ajoute une image : elle s’affichera dans l’aperçu et sur la carte du tournoi.</p>
                {coverError ? <p className="mt-2 text-xs font-black text-[#b42318]">{coverError}</p> : null}
              </label>

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
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} className="mt-2 min-h-24 w-full resize-none rounded-lg border border-[#d8dde7] px-4 py-3 text-[13px] font-semibold outline-none transition focus:border-[#e52b2f] focus:ring-4 focus:ring-red-50" placeholder="Décris les règles principales, les objectifs, les conditions de participation..." />
                <span className="mt-1 block text-right text-[11px] font-bold text-[#98a2b3]">{description.length}/500</span>
              </label>
            </div>

            {isAstralFunded ? (
              <div className="mt-5 rounded-lg border border-[#fee2e2] bg-[#fff5f5] p-4 text-[13px] font-semibold leading-6 text-[#7f1d1d]">
                <Video className="mr-2 inline h-4 w-4 text-[#e52b2f]" />
                Important : si Astral4Gamer finance le tournoi, il sera vérifié avant publication et Astral4Gamer garde l’exclusivité du stream YouTube.
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-[13px] font-semibold leading-6 text-emerald-800">
                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                Financement personnel : aucune facture Astral4Gamer, création directe après validation du formulaire.
              </div>
            )}

            {status !== "idle" ? (
              <div className={`mt-5 rounded-lg p-4 text-sm font-black ${status === "pending" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                {status === "pending" ? "Tournoi envoyé : en attente de validation du serveur. Si la demande est refusée, le client verra : votre tournoi n’a pas les conditions nécessaires pour un financement." : "Tournoi créé directement. Il sera affiché avec le tag Non garantie."}
              </div>
            ) : null}

            {submitError ? (
              <div className="mt-5 rounded-lg border border-[#fee2e2] bg-[#fff5f5] p-4 text-sm font-black text-[#b42318]">
                {submitError}
              </div>
            ) : null}

            {paymentNotice ? (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-800">
                {paymentNotice}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button type="button" disabled={step === 1} onClick={() => setStep(Math.max(1, step - 1))} className="h-10 rounded-lg border border-[#d8dde7] px-4 text-[13px] font-black text-[#111827] transition hover:border-[#e52b2f] hover:text-[#e52b2f] disabled:cursor-not-allowed disabled:opacity-50">Retour</button>
              <button type="button" disabled={!canSubmit} onClick={submitTournament} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#e52b2f] px-5 text-[13px] font-black text-white shadow-[0_14px_28px_rgba(229,43,47,.22)] transition hover:bg-[#c91f27] disabled:cursor-not-allowed disabled:bg-[#fda4af]">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Envoi au backend..." : isAstralFunded ? "Payer 2$ et envoyer en validation" : "Créer gratuitement"}
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-[0_18px_46px_rgba(16,24,40,.07)]">
            <h2 className="text-sm font-black">Aperçu rapide</h2>
            <div className="mt-4 overflow-hidden rounded-lg bg-[#111827]">
              <div className="relative min-h-[116px] p-4 text-white">
                {coverPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreviewUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(229,43,47,.75),transparent_34%),linear-gradient(135deg,#111827,#35040b)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
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
            <p className="mt-2 text-xs font-semibold leading-5 text-[#667085]">Les tournois financés par Astral4Gamer sont vérifiés avant publication. Les autres tournois sont publiés dès que le formulaire est valide.</p>
          </section>
        </aside>
      </section>
    </main>
  );
}

function StepBar({ step, onStepChange }: { step: number; onStepChange: (step: number) => void }) {
  const steps = ["Informations", "Règles", "Récompenses", "Aperçu"];

  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(16,24,40,.05)]">
      <div className="grid grid-cols-4 gap-2">
        {steps.map((item, index) => {
          const active = index + 1 <= step;
          return (
            <button key={item} type="button" onClick={() => onStepChange(index + 1)} className="min-w-0">
              <span className="mx-auto grid h-8 w-8 place-items-center rounded-full border text-[11px] font-black transition" style={{ borderColor: active ? "#e52b2f" : "#e5e7eb", background: active ? "#e52b2f" : "#fff", color: active ? "#fff" : "#98a2b3" }}>
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

function Field({ label, value, onChange, placeholder, type = "text", icon, className = "", disabled = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; icon?: ReactNode; className?: string; disabled?: boolean }) {
  return (
    <label className={className}>
      <Label>{label}</Label>
      <span className="mt-2 flex h-10 items-center gap-2 rounded-lg border border-[#d8dde7] px-4 transition focus-within:border-[#e52b2f] focus-within:ring-4 focus-within:ring-red-50">
        {icon ? <span className="text-[#98a2b3]">{icon}</span> : null}
        <input disabled={disabled} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none placeholder:text-[#98a2b3] disabled:text-[#667085]" placeholder={placeholder} />
      </span>
    </label>
  );
}

function SelectField({ label, value, onChange, options, icon }: { label: string; value: string; onChange: (value: string) => void; options: string[]; icon?: ReactNode }) {
  return (
    <label>
      <Label>{label}</Label>
      <span className="mt-2 flex h-10 items-center gap-2 rounded-lg border border-[#d8dde7] px-4 transition focus-within:border-[#e52b2f] focus-within:ring-4 focus-within:ring-red-50">
        {icon ? <span className="text-[#98a2b3]">{icon}</span> : null}
        <select value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[13px] font-black outline-none">
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
      </span>
    </label>
  );
}

function ChoiceCard({ active, onClick, icon, title, text }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; text: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${active ? "border-[#e52b2f] bg-red-50 text-[#e52b2f]" : "border-[#d8dde7] bg-white text-[#111827] hover:border-[#e52b2f]"}`}>
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-white shadow-[0_8px_20px_rgba(16,24,40,.06)]">{icon}</span>
      <span><b className="block text-[13px]">{title}</b><span className="mt-1 block text-xs font-semibold text-[#667085]">{text}</span></span>
    </button>
  );
}

function FundingCard({ active, onClick, icon, title, price, text }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; price: string; text: string }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg border p-3 text-left transition ${active ? "border-[#e52b2f] bg-[#fff5f5] shadow-[0_14px_30px_rgba(229,43,47,.08)]" : "border-[#d8dde7] bg-white hover:border-[#e52b2f]"}`}>
      <span className="flex items-center justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${active ? "bg-[#e52b2f] text-white" : "bg-[#f2f4f7] text-[#667085]"}`}>{icon}</span>
        <b className={`rounded-full px-3 py-1 text-xs ${active ? "bg-[#e52b2f] text-white" : "bg-[#f2f4f7] text-[#111827]"}`}>{price}</b>
      </span>
      <b className="mt-3 block text-[13px]">{title}</b>
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
