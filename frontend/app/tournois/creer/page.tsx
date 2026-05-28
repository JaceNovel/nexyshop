"use client";

import { ArrowLeft, CalendarDays, Lock, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";

export default function CreateTournamentPage() {
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("BR Squad");
  const [startsAt, setStartsAt] = useState("");
  const [prizePool, setPrizePool] = useState("");

  return (
    <main className="min-h-screen bg-[#fbfbfd] text-[#080b15]">
      <SiteHeader />
      <section className="mx-auto max-w-[960px] px-6 py-8">
        <a href="/tournois" className="inline-flex items-center gap-2 text-sm font-black text-[#6d28d9]"><ArrowLeft className="h-4 w-4" /> Retour aux tournois</a>
        <div className="mt-6 rounded-lg border border-[#edf0f4] bg-white p-6 shadow-[0_2px_12px_rgba(16,24,40,.05)]">
          <p className="text-xs font-black uppercase text-[#6d28d9]">Admin requis</p>
          <h1 className="mt-2 text-3xl font-black">Créer un tournoi</h1>
          <p className="mt-2 text-sm leading-6 text-[#697081]">Le formulaire est prêt côté interface. L’enregistrement passe par `/api/admin/tournaments`, donc il sera actif dès que l’auth admin Sanctum sera branchée côté frontend.</p>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <Field label="Titre" value={title} onChange={setTitle} placeholder="NEXY CUP #13" />
            <label>
              <span className="text-xs font-black uppercase">Mode</span>
              <select value={mode} onChange={(event) => setMode(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-[#e5e7eb] bg-white px-4 outline-none focus:border-[#6d28d9]">
                {["BR Squad", "Solo", "Duo", "Clash Squad", "Guild Wars"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <Field label="Date de début" value={startsAt} onChange={setStartsAt} placeholder="2026-06-01 20:00" icon={<CalendarDays className="h-4 w-4" />} />
            <Field label="Prize pool" value={prizePool} onChange={setPrizePool} placeholder="250000" />
          </div>

          <div className="mt-7 rounded-lg bg-[#f8fafc] p-4 text-sm text-[#4b5563]">
            <Lock className="mr-2 inline h-4 w-4 text-[#6d28d9]" />
            Création désactivée tant que la connexion admin n’est pas présente dans le frontend.
          </div>

          <button disabled className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#6d28d9] px-5 text-sm font-black text-white opacity-60">
            <Plus className="h-4 w-4" /> Créer après connexion admin
          </button>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, icon }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; icon?: ReactNode }) {
  return (
    <label>
      <span className="text-xs font-black uppercase">{label}</span>
      <span className="mt-2 flex h-12 items-center gap-2 rounded-lg border border-[#e5e7eb] px-4 focus-within:border-[#6d28d9]">
        {icon}
        <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" placeholder={placeholder} />
      </span>
    </label>
  );
}
