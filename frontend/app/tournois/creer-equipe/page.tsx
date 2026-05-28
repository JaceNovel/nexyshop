"use client";

import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronDown, CircleHelp, CloudUpload, Crown, Gamepad2, Globe2, Headphones, Instagram, Medal, MessageCircle, ShieldCheck, Trash2, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";

const cupImage = "https://wallpapercave.com/wp/wp7536967.jpg";
const steps = ["Informations de l'équipe", "Ajouter les membres", "Vérification & Confirmation"];
const members = ["Capitaine", "Joueur 2", "Joueur 3", "Joueur 4", "Remplaçant"];

export default function CreateTeamPage() {
  const [step, setStep] = useState(1);

  return (
    <main className="min-h-screen bg-[#fbfbfd] text-[#080b15]">
      <SiteHeader />
      <section className="mx-auto w-full max-w-[1700px] px-6 py-4">
        <div className="mb-5 flex items-center gap-3 text-xs text-[#6b7280]">
          <a href="/" className="hover:text-[#6d28d9]">Accueil</a><span>›</span><a href="/tournois" className="hover:text-[#6d28d9]">Tournois</a><span>›</span><a href="/tournois/detail" className="hover:text-[#6d28d9]">NEXY CUP #12 - GRANDE FINALE</a><span>›</span><b className="text-[#111827]">Créer une équipe</b>
        </div>

        <div className="grid grid-cols-[300px_minmax(0,1fr)_300px] gap-6">
          <aside className="space-y-4">
            <section className="rounded-lg border border-[#edf0f4] bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,.05)]">
              <img src={cupImage} alt="" className="h-[220px] w-full rounded-md object-cover" />
              <div className="mt-4 flex items-center gap-2"><h2 className="text-lg font-black">NEXY CUP #12</h2><span className="rounded bg-[#6d28d9] px-2 py-1 text-[10px] font-black text-white">OFFICIEL</span></div>
              <div className="mt-4 space-y-4 text-xs text-[#4b5563]">
                <InfoRow icon={<Gamepad2 />} label="Mode" value="BR - Squad" />
                <InfoRow icon={<Users />} label="Équipes" value="32 Équipes" />
                <InfoRow icon={<CalendarDays />} label="Date" value="25 Mai 2024 - 16:00" />
                <InfoRow icon={<Globe2 />} label="Map" value="Bermuda" />
                <InfoRow icon={<Medal />} label="Récompense" value="💎 100,000" strong />
              </div>
            </section>

            <section className="rounded-lg border border-[#edf0f4] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,.05)]">
              <h2 className="mb-5 text-xs font-black uppercase">Étapes</h2>
              <div className="space-y-5">
                {steps.map((label, index) => <div key={label} className="flex items-center gap-3 text-xs">
                  <span className={`grid h-7 w-7 place-items-center rounded-full border font-black ${step === index + 1 ? "border-[#6d28d9] bg-[#6d28d9] text-white" : step > index + 1 ? "border-emerald-500 bg-emerald-500 text-white" : "border-[#cfd5df] bg-white text-[#6b7280]"}`}>{step > index + 1 ? <Check className="h-4 w-4" /> : index + 1}</span>
                  <b className={step === index + 1 ? "text-[#6d28d9]" : "text-[#4b5563]"}>{label}</b>
                </div>)}
              </div>
            </section>

            <section className="rounded-lg bg-[#f5f3ff] p-5 text-xs">
              <div className="flex gap-3"><Headphones className="h-6 w-6 text-[#6d28d9]" /><div><b>Besoin d'aide ?</b><p className="mt-1 text-[#4b5563]">Consulte notre guide pour créer une équipe.</p></div></div>
            </section>
          </aside>

          <section className="min-w-0">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><h1 className="text-[30px] font-black leading-none">CRÉER UNE ÉQUIPE</h1><p className="mt-2 text-sm text-[#6b7280]">Forme ton équipe de rêve et sois prêt pour la victoire !</p></div>
              <a href="/tournois/detail" className="interactive-button flex h-10 items-center gap-2 rounded bg-[#6d28d9] px-5 text-xs font-black text-white"><ArrowLeft className="h-4 w-4" />Retour au tournoi</a>
            </div>

            <section className="rounded-lg border border-[#edf0f4] bg-white p-7 shadow-[0_2px_12px_rgba(16,24,40,.05)]">
              {step === 1 && <TeamInfo />}
              {step === 2 && <MembersStep />}
              {step === 3 && <ConfirmStep />}

              <div className="mt-7 flex gap-3">
                {step > 1 && <button onClick={() => setStep(step - 1)} className="interactive-button h-12 rounded border border-[#6d28d9] px-6 text-xs font-black text-[#6d28d9]">RETOUR</button>}
                <button onClick={() => setStep(step < 3 ? step + 1 : 3)} className="interactive-button flex h-12 flex-1 items-center justify-center gap-3 rounded bg-[#6d28d9] text-xs font-black text-white">
                  {step === 1 && "CONTINUER : AJOUTER LES MEMBRES"}
                  {step === 2 && "CONTINUER : VÉRIFICATION"}
                  {step === 3 && "CONFIRMER ET CRÉER L'ÉQUIPE"}
                  {step < 3 ? <ArrowRight className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                </button>
              </div>
            </section>
          </section>

          <aside className="space-y-4">
            <HelpPanel title="À SAVOIR" items={["Chaque équipe doit avoir 4 joueurs + 1 remplaçant optionnel.", "Le capitaine de l'équipe sera le responsable principal.", "Assure-toi que toutes les informations sont correctes avant de continuer."]} />
            <HelpPanel title="RÈGLES RAPIDES" items={["Pas d'insultes ou de triche", "Respect des adversaires", "Présence 15 min avant le match", "Respect du règlement officiel"]} />
            <section className="rounded-lg bg-[#f5f3ff] p-5 text-xs">
              <h2 className="text-sm font-black text-[#6d28d9]">BESOIN D'AIDE ?</h2>
              <p className="mt-3 leading-5 text-[#374151]">Notre support est disponible 24/7 pour t'accompagner.</p>
              <button className="interactive-button mt-4 flex h-10 w-full items-center justify-center gap-2 rounded border border-[#ddd6fe] bg-white text-xs font-black text-[#6d28d9]"><Headphones className="h-4 w-4" />Contacter le support</button>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function TeamInfo() {
  return (
    <>
      <h2 className="mb-7 text-lg font-black uppercase">Informations de l'équipe</h2>
      <div className="grid grid-cols-2 gap-6">
        <Field label="Nom de l'équipe *" placeholder="Ex: NEXY ELITE" count="0/20" />
        <Field label="Tag (optionnel)" placeholder="Ex: NXE" count="0/5" />
      </div>
      <div className="mt-7 grid grid-cols-[minmax(0,1fr)_210px_300px] gap-7">
        <div><Label>Logo de l'équipe *</Label><div className="mt-3 grid h-[210px] place-items-center rounded-lg border border-dashed border-[#7c3aed] bg-[#fbfbff] text-center text-xs text-[#6d28d9]"><div><CloudUpload className="mx-auto mb-3 h-9 w-9" /><b>Clique pour télécharger</b><p className="mt-3 text-[#6b7280]">PNG, JPG ou WEBP (max. 2MB)</p></div></div></div>
        <div><Label>Aperçu</Label><div className="mt-3 rounded-lg border border-[#edf0f4] bg-white p-4 text-center"><div className="mx-auto grid h-32 w-32 place-items-center rounded-[28px] border-[6px] border-[#6d28d9] bg-[#111827] text-6xl font-black text-[#8b5cf6] shadow-[0_14px_30px_rgba(109,40,217,.22)]">N</div><button className="mt-4 inline-flex h-9 items-center gap-2 rounded border border-red-200 px-4 text-xs font-black text-red-500"><Trash2 className="h-3.5 w-3.5" />Supprimer le logo</button></div></div>
        <div className="space-y-7"><SelectField label="Région principale *" value="Afrique" icon="🌍" /><SelectField label="Pays *" value="Sénégal" icon="🇸🇳" /></div>
      </div>
      <div className="mt-7"><Label>Description (optionnelle)</Label><textarea className="mt-3 h-28 w-full resize-none rounded-lg border border-[#edf0f4] px-4 py-3 text-sm outline-none focus:border-[#6d28d9]" placeholder="Décris ton équipe, ton objectif, ton style de jeu..." /><p className="-mt-7 mr-4 text-right text-xs text-[#6b7280]">0/150</p></div>
      <div className="mt-7 grid grid-cols-3 gap-5">
        <Field label="Contact équipe (WhatsApp)" placeholder="+221 77 123 45 67" icon={<MessageCircle className="h-5 w-5 text-emerald-500" />} />
        <Field label="Compte Instagram (optionnel)" placeholder="@nexy.elite" icon={<Instagram className="h-5 w-5 text-pink-500" />} />
        <Field label="Compte Discord (optionnel)" placeholder="Lien Discord (ex: https://discord.gg/...)" icon={<Crown className="h-5 w-5 text-indigo-500" />} />
      </div>
    </>
  );
}

function MembersStep() {
  return (
    <>
      <h2 className="text-lg font-black uppercase">Ajouter les membres</h2>
      <p className="mt-2 text-sm text-[#6b7280]">Ajoute les joueurs qui représenteront ton équipe pendant le tournoi.</p>
      <div className="mt-6 grid gap-4">
        {members.map((role, index) => <div key={role} className="grid grid-cols-[150px_1fr_1fr_1fr] gap-4 rounded-lg border border-[#edf0f4] bg-[#fbfbfd] p-4">
          <div><span className={`rounded px-2 py-1 text-[10px] font-black ${index === 0 ? "bg-[#6d28d9] text-white" : "bg-white text-[#6d28d9]"}`}>{role}</span></div>
          <input className="h-11 rounded border border-[#edf0f4] px-3 text-sm outline-none focus:border-[#6d28d9]" placeholder="Pseudo Free Fire" />
          <input className="h-11 rounded border border-[#edf0f4] px-3 text-sm outline-none focus:border-[#6d28d9]" placeholder="ID joueur" />
          <input className="h-11 rounded border border-[#edf0f4] px-3 text-sm outline-none focus:border-[#6d28d9]" placeholder="WhatsApp" />
        </div>)}
      </div>
    </>
  );
}

function ConfirmStep() {
  return (
    <>
      <h2 className="text-lg font-black uppercase">Vérification & confirmation</h2>
      <p className="mt-2 text-sm text-[#6b7280]">Relis les informations avant de créer l'équipe.</p>
      <div className="mt-6 grid grid-cols-2 gap-5">
        <div className="rounded-lg border border-[#edf0f4] p-5"><h3 className="font-black">Équipe</h3><p className="mt-3 text-sm text-[#4b5563]">Nom : <b>NEXY ELITE</b></p><p className="mt-2 text-sm text-[#4b5563]">Tag : <b>NXE</b></p><p className="mt-2 text-sm text-[#4b5563]">Pays : <b>Sénégal</b></p></div>
        <div className="rounded-lg border border-[#edf0f4] p-5"><h3 className="font-black">Tournoi</h3><p className="mt-3 text-sm text-[#4b5563]">NEXY CUP #12 - GRANDE FINALE</p><p className="mt-2 text-sm text-[#4b5563]">Mode : BR - Squad</p><p className="mt-2 text-sm text-[#4b5563]">Joueurs requis : 4</p></div>
      </div>
      <div className="mt-6 rounded-lg bg-[#f5f3ff] p-5 text-sm text-[#4b5563]"><ShieldCheck className="mr-2 inline h-5 w-5 text-[#6d28d9]" />En confirmant, tu acceptes le règlement officiel du tournoi.</div>
    </>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <label className="text-xs font-black uppercase text-[#111827]">{children}</label>;
}

function Field({ label, placeholder, count, icon }: { label: string; placeholder: string; count?: string; icon?: ReactNode }) {
  return <div><Label>{label}</Label><div className="mt-3 flex h-12 items-center gap-3 rounded-lg border border-[#edf0f4] px-4 focus-within:border-[#6d28d9]">{icon}<input className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder={placeholder} />{count && <span className="text-xs text-[#6b7280]">{count}</span>}</div></div>;
}

function SelectField({ label, value, icon }: { label: string; value: string; icon: string }) {
  return <div><Label>{label}</Label><button className="mt-3 flex h-12 w-full items-center justify-between rounded-lg border border-[#edf0f4] px-4 text-sm"><span>{icon} <b className="ml-2">{value}</b></span><ChevronDown className="h-4 w-4" /></button></div>;
}

function InfoRow({ icon, label, value, strong }: { icon: ReactNode; label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2">{icon}<span>{label}</span></span><b className={strong ? "text-lg text-[#111827]" : "text-[#374151]"}>{value}</b></div>;
}

function HelpPanel({ title, items }: { title: string; items: string[] }) {
  return <section className="rounded-lg border border-[#edf0f4] bg-white p-5 text-xs shadow-[0_2px_12px_rgba(16,24,40,.05)]"><h2 className="text-sm font-black text-[#6d28d9]">{title}</h2><div className="mt-4 space-y-4">{items.map((item) => <p key={item} className="flex gap-3 leading-5 text-[#374151]"><CircleHelp className="h-4 w-4 shrink-0 text-[#6d28d9]" />{item}</p>)}</div></section>;
}
