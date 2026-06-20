"use client";

import { Globe2, WalletCards } from "lucide-react";
import { useState } from "react";
import { type DisplayCurrency, type SiteLanguage, useLanguage } from "@/components/language-provider";

const languageOptions: Array<{ value: SiteLanguage; label: string; flag: string }> = [
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "en", label: "English", flag: "🇺🇸" }
];

const currencyOptions: Array<{ value: DisplayCurrency; label: string; hint: string }> = [
  { value: "USD", label: "USD", hint: "Dollar américain" },
  { value: "EUR", label: "EUR", hint: "Euro" },
  { value: "XOF", label: "FCFA", hint: "Franc CFA" }
];

export function PreferenceDialog() {
  const { language, currency, hasCompletedPreferences, completePreferences } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<SiteLanguage>(language);
  const [selectedCurrency, setSelectedCurrency] = useState<DisplayCurrency>(currency);
  const isFrench = selectedLanguage === "fr";

  if (hasCompletedPreferences) return null;

  return (
    <div className="fixed inset-0 z-[220] grid place-items-center bg-[#020617]/55 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-[520px] rounded-2xl border border-white/70 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,.25)] md:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eff6ff] text-[#0b55d9]">
            <Globe2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0b55d9]">Astral4Gamer</p>
            <h2 className="mt-1 text-2xl font-black text-[#061126]">{isFrench ? "Personnalise ton affichage" : "Set your preferences"}</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              {isFrench
                ? "Choisis ta langue et la devise utilisée pour afficher les prix sur le site."
                : "Choose your language and the currency used to display prices across the site."}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <section>
            <h3 className="flex items-center gap-2 text-sm font-black text-[#111827]"><Globe2 className="h-4 w-4 text-[#0b55d9]" /> {isFrench ? "Langue" : "Language"}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {languageOptions.map((option) => (
                <button key={option.value} type="button" onClick={() => setSelectedLanguage(option.value)} className={`interactive-button flex h-12 items-center gap-3 rounded-xl border px-3 text-left text-sm font-bold transition ${selectedLanguage === option.value ? "border-[#0b55d9] bg-[#eff6ff] text-[#0b55d9]" : "border-[#e5e7eb] bg-white text-[#111827] hover:border-[#bfd7ff]"}`}>
                  <span className="text-xl">{option.flag}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-black text-[#111827]"><WalletCards className="h-4 w-4 text-[#0b55d9]" /> {isFrench ? "Devise des prix" : "Price currency"}</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {currencyOptions.map((option) => (
                <button key={option.value} type="button" onClick={() => setSelectedCurrency(option.value)} className={`interactive-button rounded-xl border px-3 py-3 text-left transition ${selectedCurrency === option.value ? "border-[#0b55d9] bg-[#eff6ff]" : "border-[#e5e7eb] bg-white hover:border-[#bfd7ff]"}`}>
                  <span className="block text-sm font-black text-[#111827]">{option.label}</span>
                  <span className="mt-1 block text-[11px] font-medium text-[#667085]">{option.hint}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <button type="button" onClick={() => completePreferences(selectedLanguage, selectedCurrency)} className="interactive-button mt-6 h-12 w-full rounded-xl bg-[#0b55d9] text-sm font-black text-white shadow-[0_14px_30px_rgba(11,85,217,.22)]">
          {isFrench ? "Continuer" : "Continue"}
        </button>
      </div>
    </div>
  );
}
