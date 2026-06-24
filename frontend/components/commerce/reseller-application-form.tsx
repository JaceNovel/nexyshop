"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function ResellerApplicationForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {["Nom boutique", "Pays", "WhatsApp", "Email", "Site web", "Volume estime de commandes"].map((label) => (
          <label key={label} className="text-sm text-slate-300">
            {label}
            <input required={label !== "Site web"} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#070d19] px-4 text-white outline-none focus:border-violet-400" />
          </label>
        ))}
      </div>
      <label className="mt-3 block text-sm text-slate-300">
        Produits souhaites
        <textarea className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-[#070d19] px-4 py-3 text-white outline-none focus:border-violet-400" placeholder="Free Fire, PUBG, cartes cadeaux..." />
      </label>
      <button className="mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(220,38,38,.25)] transition hover:bg-red-500 active:scale-[.98]">
        <Send className="h-4 w-4" />
        Envoyer la demande
      </button>
      {submitted ? <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">Demande recue. Elle passera en validation admin.</p> : null}
    </form>
  );
}
