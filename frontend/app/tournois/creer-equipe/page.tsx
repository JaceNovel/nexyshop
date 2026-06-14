"use client";

import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, CircleHelp, CloudUpload, Crown, Gamepad2, Globe2, Headphones, Instagram, Loader2, Medal, MessageCircle, ShieldCheck, Trash2, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getTournament, getTournaments, registerTournamentTeam, type Tournament } from "@/lib/api";

const steps = ["Informations de l'équipe", "Ajouter les membres", "Vérification & Confirmation"];
const memberRoles = ["Capitaine", "Joueur 2", "Joueur 3", "Joueur 4", "Remplaçant"];
const fallbackCover = "/ChatGPT%20Image%2029%20mai%202026,%2014_34_08.png";

type TeamMember = {
  role: string;
  nickname: string;
  uid: string;
  whatsapp: string;
};

const emptyMembers = memberRoles.map((role) => ({ role, nickname: "", uid: "", whatsapp: "" }));

export default function CreateTeamPage() {
  return (
    <Suspense fallback={<CreateTeamFallback />}>
      <CreateTeamContent />
    </Suspense>
  );
}

function CreateTeamFallback() {
  return (
    <main className="min-h-screen bg-[#fbfbfd] text-[#080b15]">
      <SiteHeader />
      <section className="mx-auto grid min-h-[60vh] w-full max-w-[1700px] place-items-center px-6 py-10">
        <div className="flex items-center gap-3 rounded-lg border border-[#edf0f4] bg-white px-5 py-4 text-sm font-black text-[#6d28d9] shadow-[0_2px_12px_rgba(16,24,40,.05)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement de l'inscription...
        </div>
      </section>
    </main>
  );
}

function CreateTeamContent() {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournament") ?? searchParams.get("id");
  const [step, setStep] = useState(1);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [teamTag, setTeamTag] = useState("");
  const [region, setRegion] = useState("Afrique");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [discord, setDiscord] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [logoError, setLogoError] = useState("");
  const [members, setMembers] = useState<TeamMember[]>(emptyMembers);
  const [submitError, setSubmitError] = useState("");
  const [created, setCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rules = tournament?.rules ?? {};
  const cover = typeof rules.cover_image === "string" && rules.cover_image ? rules.cover_image : fallbackCover;
  const rewardUnit = typeof rules.reward_unit === "string" ? rules.reward_unit : "points";
  const canContinueStep1 = Boolean(teamName.trim() && contactWhatsapp.trim());
  const captain = members[0];
  const requiredMembers = useMemo(() => members.slice(0, 4), [members]);
  const canSubmit = canContinueStep1 && requiredMembers.every((member) => member.nickname.trim() && member.uid.trim()) && Boolean(tournament) && !submitting;

  useEffect(() => {
    let cancelled = false;

    async function loadTournament() {
      setLoadingTournament(true);
      setSubmitError("");

      try {
        if (tournamentId) {
          const loaded = await getTournament(tournamentId);
          if (!cancelled) setTournament(loaded);
          return;
        }

        const payload = await getTournaments();
        if (!cancelled) setTournament(payload.data[0] ?? null);
      } catch {
        if (!cancelled) setTournament(null);
      } finally {
        if (!cancelled) setLoadingTournament(false);
      }
    }

    loadTournament();

    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  function updateMember(index: number, key: keyof TeamMember, value: string) {
    setMembers((current) => current.map((member, memberIndex) => memberIndex === index ? { ...member, [key]: value } : member));
  }

  function handleLogo(file?: File) {
    setLogoError("");

    if (!file) return;
    if (file.size > 1_200_000) {
      setLogoError("Logo trop lourd. Choisis une image de 1,2 Mo maximum.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setLogoPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return preview;
    });

    const reader = new FileReader();
    reader.onload = () => setLogoData(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => {
      setLogoData(null);
      setLogoError("Impossible de lire ce logo.");
    };
    reader.readAsDataURL(file);
  }

  function nextStep() {
    setSubmitError("");
    if (step === 1 && !canContinueStep1) {
      setSubmitError("Ajoute le nom de l’équipe et un contact WhatsApp avant de continuer.");
      return;
    }

    if (step === 2 && !requiredMembers.every((member) => member.nickname.trim() && member.uid.trim())) {
      setSubmitError("Ajoute au minimum les 4 joueurs principaux avec pseudo Free Fire et ID joueur.");
      return;
    }

    setStep(Math.min(3, step + 1));
  }

  async function submitTeam() {
    if (!canSubmit || !tournament) return;

    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token) {
      setSubmitError("Connecte-toi pour inscrire ton équipe au tournoi.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const team = await registerTournamentTeam(token, tournament.id, {
        name: teamName.trim(),
        tag: teamTag.trim() || null,
        region,
        country: country.trim() || null,
        description: description.trim() || null,
        contact_whatsapp: contactWhatsapp.trim() || null,
        instagram: instagram.trim() || null,
        discord: discord.trim() || null,
        logo: logoData,
        members: members
          .filter((member) => member.nickname.trim() || member.uid.trim())
          .map((member) => ({
            role: member.role,
            nickname: member.nickname.trim() || null,
            uid: member.uid.trim() || null,
            whatsapp: member.whatsapp.trim() || null
          }))
      });

      const stored = JSON.parse(localStorage.getItem("astral_created_teams") ?? "[]") as unknown[];
      localStorage.setItem("astral_created_teams", JSON.stringify([{ id: team.id, name: team.name, points: team.points, tournament_id: tournament.id, createdAt: new Date().toISOString() }, ...stored].slice(0, 50)));
      setCreated(true);
      setStep(3);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Création de l’équipe impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fbfbfd] text-[#080b15]">
      <SiteHeader />
      <section className="mx-auto w-full max-w-[1700px] px-6 py-4">
        <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-[#6b7280]">
          <a href="/" className="hover:text-[#6d28d9]">Accueil</a><span>›</span><a href="/tournois" className="hover:text-[#6d28d9]">Tournois</a><span>›</span><b className="text-[#111827]">Créer une équipe</b>
        </div>

        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
          <aside className="space-y-4">
            <section className="rounded-lg border border-[#edf0f4] bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,.05)]">
              {loadingTournament ? (
                <div className="grid h-[220px] place-items-center rounded-md bg-[#f5f3ff] text-[#6d28d9]"><Loader2 className="h-7 w-7 animate-spin" /></div>
              ) : tournament ? (
                <>
                  <img src={cover} alt="" className="h-[220px] w-full rounded-md object-cover" />
                  <div className="mt-4 flex items-center gap-2">
                    <h2 className="line-clamp-2 text-lg font-black">{tournament.title}</h2>
                    <span className="rounded bg-[#6d28d9] px-2 py-1 text-[10px] font-black uppercase text-white">{tournament.status}</span>
                  </div>
                  <div className="mt-4 space-y-4 text-xs text-[#4b5563]">
                    <InfoRow icon={<Gamepad2 />} label="Mode" value={tournament.mode} />
                    <InfoRow icon={<Users />} label="Équipes" value={`${tournament.teams_count ?? tournament.teams?.length ?? 0} inscrites`} />
                    <InfoRow icon={<CalendarDays />} label="Date" value={formatDate(tournament.starts_at)} />
                    <InfoRow icon={<Globe2 />} label="Région" value={String(rules.region ?? "Toutes")} />
                    <InfoRow icon={<Medal />} label="Récompense" value={`${Number(tournament.prize_pool ?? 0).toLocaleString("fr-FR")} ${rewardUnit}`} strong />
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-[#fee2e2] bg-[#fff5f5] p-4 text-sm font-black text-[#b42318]">
                  Aucun tournoi disponible pour inscrire une équipe.
                </div>
              )}
            </section>

            <section className="rounded-lg border border-[#edf0f4] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,.05)]">
              <h2 className="mb-5 text-xs font-black uppercase">Étapes</h2>
              <div className="space-y-5">
                {steps.map((label, index) => (
                  <button key={label} type="button" onClick={() => setStep(index + 1)} className="flex w-full items-center gap-3 text-left text-xs">
                    <span className={`grid h-7 w-7 place-items-center rounded-full border font-black ${step === index + 1 ? "border-[#6d28d9] bg-[#6d28d9] text-white" : step > index + 1 ? "border-emerald-500 bg-emerald-500 text-white" : "border-[#cfd5df] bg-white text-[#6b7280]"}`}>{step > index + 1 ? <Check className="h-4 w-4" /> : index + 1}</span>
                    <b className={step === index + 1 ? "text-[#6d28d9]" : "text-[#4b5563]"}>{label}</b>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="min-w-0">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[30px] font-black leading-none">CRÉER UNE ÉQUIPE</h1>
                <p className="mt-2 text-sm text-[#6b7280]">Forme ton équipe et inscris-la directement au tournoi sélectionné.</p>
              </div>
              <a href={tournament ? `/tournois/detail?id=${tournament.id}` : "/tournois"} className="interactive-button flex h-10 items-center gap-2 rounded bg-[#6d28d9] px-5 text-xs font-black text-white"><ArrowLeft className="h-4 w-4" />Retour au tournoi</a>
            </div>

            <section className="rounded-lg border border-[#edf0f4] bg-white p-7 shadow-[0_2px_12px_rgba(16,24,40,.05)]">
              {step === 1 && (
                <TeamInfo
                  teamName={teamName}
                  teamTag={teamTag}
                  region={region}
                  country={country}
                  description={description}
                  contactWhatsapp={contactWhatsapp}
                  instagram={instagram}
                  discord={discord}
                  logoPreview={logoPreview}
                  logoError={logoError}
                  onTeamNameChange={setTeamName}
                  onTeamTagChange={setTeamTag}
                  onRegionChange={setRegion}
                  onCountryChange={setCountry}
                  onDescriptionChange={setDescription}
                  onContactWhatsappChange={setContactWhatsapp}
                  onInstagramChange={setInstagram}
                  onDiscordChange={setDiscord}
                  onLogoChange={handleLogo}
                  onLogoRemove={() => {
                    if (logoPreview) URL.revokeObjectURL(logoPreview);
                    setLogoPreview(null);
                    setLogoData(null);
                  }}
                />
              )}
              {step === 2 && <MembersStep members={members} onMemberChange={updateMember} />}
              {step === 3 && <ConfirmStep teamName={teamName} teamTag={teamTag} country={country} tournament={tournament} members={members} created={created} />}

              {submitError ? <div className="mt-6 rounded-lg border border-[#fee2e2] bg-[#fff5f5] p-4 text-sm font-black text-[#b42318]">{submitError}</div> : null}

              <div className="mt-7 flex gap-3">
                {step > 1 ? <button type="button" onClick={() => setStep(step - 1)} className="interactive-button h-12 rounded border border-[#6d28d9] px-6 text-xs font-black text-[#6d28d9]">RETOUR</button> : null}
                <button
                  type="button"
                  disabled={loadingTournament || !tournament || submitting || created}
                  onClick={() => (step < 3 ? nextStep() : submitTeam())}
                  className="interactive-button flex h-12 flex-1 items-center justify-center gap-3 rounded bg-[#6d28d9] text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-[#c4b5fd]"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {step === 1 && "CONTINUER : AJOUTER LES MEMBRES"}
                  {step === 2 && "CONTINUER : VÉRIFICATION"}
                  {step === 3 && (created ? "ÉQUIPE ENVOYÉE AU BACKEND" : submitting ? "ENVOI AU BACKEND..." : "CONFIRMER ET CRÉER L'ÉQUIPE")}
                  {step < 3 ? <ArrowRight className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                </button>
              </div>
            </section>
          </section>

          <aside className="space-y-4">
            <HelpPanel title="À SAVOIR" items={["Les 4 joueurs principaux sont obligatoires.", "Le capitaine est le responsable principal.", "L’équipe sera en attente de validation après inscription."]} />
            <HelpPanel title="RÈGLES RAPIDES" items={["Pas d'insultes ou de triche", "Respect des adversaires", "Présence 15 min avant le match", "Respect du règlement officiel"]} />
            <section className="rounded-lg bg-[#f5f3ff] p-5 text-xs">
              <h2 className="text-sm font-black text-[#6d28d9]">BESOIN D'AIDE ?</h2>
              <p className="mt-3 leading-5 text-[#374151]">Le support peut t’accompagner si une inscription bloque.</p>
              <a href="/contact" className="interactive-button mt-4 flex h-10 w-full items-center justify-center gap-2 rounded border border-[#ddd6fe] bg-white text-xs font-black text-[#6d28d9]"><Headphones className="h-4 w-4" />Contacter le support</a>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function TeamInfo({
  teamName,
  teamTag,
  region,
  country,
  description,
  contactWhatsapp,
  instagram,
  discord,
  logoPreview,
  logoError,
  onTeamNameChange,
  onTeamTagChange,
  onRegionChange,
  onCountryChange,
  onDescriptionChange,
  onContactWhatsappChange,
  onInstagramChange,
  onDiscordChange,
  onLogoChange,
  onLogoRemove
}: {
  teamName: string;
  teamTag: string;
  region: string;
  country: string;
  description: string;
  contactWhatsapp: string;
  instagram: string;
  discord: string;
  logoPreview: string | null;
  logoError: string;
  onTeamNameChange: (value: string) => void;
  onTeamTagChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContactWhatsappChange: (value: string) => void;
  onInstagramChange: (value: string) => void;
  onDiscordChange: (value: string) => void;
  onLogoChange: (file?: File) => void;
  onLogoRemove: () => void;
}) {
  return (
    <>
      <h2 className="mb-7 text-lg font-black uppercase">Informations de l'équipe</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Nom de l'équipe *" placeholder="Nom officiel de l’équipe" value={teamName} onChange={onTeamNameChange} maxLength={20} count={`${teamName.length}/20`} />
        <Field label="Tag (optionnel)" placeholder="Ex: AXG" value={teamTag} onChange={onTeamTagChange} maxLength={5} count={`${teamTag.length}/5`} />
      </div>
      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_210px_300px]">
        <div>
          <Label>Logo de l'équipe</Label>
          <label className="mt-3 grid h-[210px] cursor-pointer place-items-center rounded-lg border border-dashed border-[#7c3aed] bg-[#fbfbff] text-center text-xs text-[#6d28d9]">
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => onLogoChange(event.target.files?.[0])} />
            <span><CloudUpload className="mx-auto mb-3 h-9 w-9" /><b>Clique pour télécharger</b><p className="mt-3 text-[#6b7280]">PNG, JPG ou WEBP (max. 1,2MB)</p></span>
          </label>
          {logoError ? <p className="mt-2 text-xs font-black text-[#b42318]">{logoError}</p> : null}
        </div>
        <div>
          <Label>Aperçu</Label>
          <div className="mt-3 rounded-lg border border-[#edf0f4] bg-white p-4 text-center">
            <div className="mx-auto grid h-32 w-32 place-items-center overflow-hidden rounded-[28px] border-[6px] border-[#6d28d9] bg-[#111827] text-6xl font-black text-[#8b5cf6] shadow-[0_14px_30px_rgba(109,40,217,.22)]">
              {logoPreview ? <img src={logoPreview} alt="" className="h-full w-full object-cover" /> : (teamName.trim()[0] ?? "A").toUpperCase()}
            </div>
            <button type="button" onClick={onLogoRemove} className="mt-4 inline-flex h-9 items-center gap-2 rounded border border-red-200 px-4 text-xs font-black text-red-500"><Trash2 className="h-3.5 w-3.5" />Supprimer le logo</button>
          </div>
        </div>
        <div className="space-y-7">
          <SelectField label="Région principale *" value={region} onChange={onRegionChange} options={["Afrique", "Moyen-Orient", "Europe", "Brésil", "Inde", "Asie"]} />
          <Field label="Pays" placeholder="Pays de l’équipe" value={country} onChange={onCountryChange} />
        </div>
      </div>
      <div className="mt-7">
        <Label>Description (optionnelle)</Label>
        <textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} maxLength={150} className="mt-3 h-28 w-full resize-none rounded-lg border border-[#edf0f4] px-4 py-3 text-sm outline-none focus:border-[#6d28d9]" placeholder="Décris ton équipe, ton objectif, ton style de jeu..." />
        <p className="-mt-7 mr-4 text-right text-xs text-[#6b7280]">{description.length}/150</p>
      </div>
      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        <Field label="Contact équipe (WhatsApp) *" placeholder="+221 77 123 45 67" icon={<MessageCircle className="h-5 w-5 text-emerald-500" />} value={contactWhatsapp} onChange={onContactWhatsappChange} />
        <Field label="Compte Instagram (optionnel)" placeholder="@team" icon={<Instagram className="h-5 w-5 text-pink-500" />} value={instagram} onChange={onInstagramChange} />
        <Field label="Compte Discord (optionnel)" placeholder="https://discord.gg/..." icon={<Crown className="h-5 w-5 text-indigo-500" />} value={discord} onChange={onDiscordChange} />
      </div>
    </>
  );
}

function MembersStep({ members, onMemberChange }: { members: TeamMember[]; onMemberChange: (index: number, key: keyof TeamMember, value: string) => void }) {
  return (
    <>
      <h2 className="text-lg font-black uppercase">Ajouter les membres</h2>
      <p className="mt-2 text-sm text-[#6b7280]">Ajoute les pseudos Free Fire et ID joueur des 4 titulaires. Le remplaçant reste optionnel.</p>
      <div className="mt-6 grid gap-4">
        {members.map((member, index) => (
          <div key={member.role} className="grid gap-4 rounded-lg border border-[#edf0f4] bg-[#fbfbfd] p-4 lg:grid-cols-[150px_1fr_1fr_1fr]">
            <div><span className={`rounded px-2 py-1 text-[10px] font-black ${index === 0 ? "bg-[#6d28d9] text-white" : "bg-white text-[#6d28d9]"}`}>{member.role}</span></div>
            <input value={member.nickname} onChange={(event) => onMemberChange(index, "nickname", event.target.value)} className="h-11 rounded border border-[#edf0f4] px-3 text-sm outline-none focus:border-[#6d28d9]" placeholder="Pseudo Free Fire" />
            <input value={member.uid} onChange={(event) => onMemberChange(index, "uid", event.target.value)} className="h-11 rounded border border-[#edf0f4] px-3 text-sm outline-none focus:border-[#6d28d9]" placeholder="ID joueur" />
            <input value={member.whatsapp} onChange={(event) => onMemberChange(index, "whatsapp", event.target.value)} className="h-11 rounded border border-[#edf0f4] px-3 text-sm outline-none focus:border-[#6d28d9]" placeholder="WhatsApp" />
          </div>
        ))}
      </div>
    </>
  );
}

function ConfirmStep({ teamName, teamTag, country, tournament, members, created }: { teamName: string; teamTag: string; country: string; tournament: Tournament | null; members: TeamMember[]; created: boolean }) {
  return (
    <>
      <h2 className="text-lg font-black uppercase">Vérification & confirmation</h2>
      <p className="mt-2 text-sm text-[#6b7280]">Relis les informations avant d’envoyer l’équipe au backend.</p>
      {created ? <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm font-black text-emerald-800">Équipe créée et envoyée au backend. Elle est en attente de validation.</div> : null}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#edf0f4] p-5">
          <h3 className="font-black">Équipe</h3>
          <p className="mt-3 text-sm text-[#4b5563]">Nom : <b>{teamName || "—"}</b></p>
          <p className="mt-2 text-sm text-[#4b5563]">Tag : <b>{teamTag || "—"}</b></p>
          <p className="mt-2 text-sm text-[#4b5563]">Pays : <b>{country || "—"}</b></p>
          <p className="mt-2 text-sm text-[#4b5563]">Joueurs prêts : <b>{members.filter((member) => member.nickname && member.uid).length}</b></p>
        </div>
        <div className="rounded-lg border border-[#edf0f4] p-5">
          <h3 className="font-black">Tournoi</h3>
          <p className="mt-3 text-sm text-[#4b5563]">{tournament?.title ?? "—"}</p>
          <p className="mt-2 text-sm text-[#4b5563]">Mode : {tournament?.mode ?? "—"}</p>
          <p className="mt-2 text-sm text-[#4b5563]">Début : {tournament?.starts_at ? formatDate(tournament.starts_at) : "—"}</p>
        </div>
      </div>
      <div className="mt-6 rounded-lg bg-[#f5f3ff] p-5 text-sm text-[#4b5563]"><ShieldCheck className="mr-2 inline h-5 w-5 text-[#6d28d9]" />En confirmant, tu acceptes le règlement officiel du tournoi.</div>
    </>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <label className="text-xs font-black uppercase text-[#111827]">{children}</label>;
}

function Field({ label, placeholder, count, icon, value, onChange, maxLength }: { label: string; placeholder: string; count?: string; icon?: ReactNode; value?: string; onChange?: (value: string) => void; maxLength?: number }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-3 flex h-12 items-center gap-3 rounded-lg border border-[#edf0f4] px-4 focus-within:border-[#6d28d9]">
        {icon}
        <input value={value ?? ""} onChange={(event) => onChange?.(event.target.value)} maxLength={maxLength} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder={placeholder} />
        {count ? <span className="text-xs text-[#6b7280]">{count}</span> : null}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-3 h-12 w-full rounded-lg border border-[#edf0f4] bg-white px-4 text-sm font-black outline-none focus:border-[#6d28d9]">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </div>
  );
}

function InfoRow({ icon, label, value, strong }: { icon: ReactNode; label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2">{icon}<span>{label}</span></span><b className={strong ? "text-lg text-[#111827]" : "text-[#374151]"}>{value}</b></div>;
}

function HelpPanel({ title, items }: { title: string; items: string[] }) {
  return <section className="rounded-lg border border-[#edf0f4] bg-white p-5 text-xs shadow-[0_2px_12px_rgba(16,24,40,.05)]"><h2 className="text-sm font-black text-[#6d28d9]">{title}</h2><div className="mt-4 space-y-4">{items.map((item) => <p key={item} className="flex gap-3 leading-5 text-[#374151]"><CircleHelp className="h-4 w-4 shrink-0 text-[#6d28d9]" />{item}</p>)}</div></section>;
}

function formatDate(value?: string | null) {
  if (!value) return "Date à confirmer";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
