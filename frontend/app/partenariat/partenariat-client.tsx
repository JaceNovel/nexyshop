"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, BadgeCheck, Crown, Handshake, Megaphone, Send, ShieldCheck, Store, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { submitPartnershipRequest } from "@/lib/api";

const discordPartnerUrl =
  process.env.NEXT_PUBLIC_DISCORD_PARTNER_URL ??
  process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ??
  "https://discord.gg/wutKWRh5H";

const partnerTypes = [
  {
    title: "Créateurs de contenu",
    description: "Codes promo, lots pour ta communauté et campagnes dédiées.",
    icon: Megaphone,
    earning: "5 000 à 500 000+ FCFA / mois",
    points: ["Code créateur", "Commissions validées", "Campagnes prioritaires"]
  },
  {
    title: "Revendeurs",
    description: "Accès à des offres boutique pour cybercafés, groupes WhatsApp et réseaux locaux.",
    icon: Store,
    earning: "30 000 à 1 000 000+ FCFA / mois",
    points: ["Prix volume", "Support commande", "Catalogue prêt à vendre"]
  },
];

const steps = [
  ["1", "Présente ton profil", "Explique ton audience, ton réseau ou ton volume de vente."],
  ["2", "Envoie ton dossier", "Rejoins Discord et poste ta demande dans l'espace partenariat."],
  ["3", "Analyse Astral4Gamer", "Notre équipe vérifie le potentiel et propose une formule adaptée."]
];

const heroStats: Array<[string, string, LucideIcon]> = [
  ["Dossiers analysés", "24 à 72h", ShieldCheck],
  ["Créateurs & revendeurs", "Programme ouvert", Users],
  ["Paiements estimés", "Selon performance", Crown]
];

export function PartenariatClient() {
  const [form, setForm] = useState({
    name: "",
    company_name: "",
    email: "",
    discord: "",
    country: "",
    type: "Revendeur API Free Fire",
    audience: "",
    network_url: "",
    expected_earning: "30 000 à 1 000 000+ FCFA / mois",
    message: ""
  });
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    try {
      const response = await submitPartnershipRequest(form);
      setStatus(`Dossier reçu: ${response.reference}. Analyse en attente.`);
      setForm((current) => ({ ...current, message: "" }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#08111f]">
      <SiteHeader />

      <section className="mx-auto max-w-[1520px] px-4 py-8 sm:px-6 lg:py-12">
        <div className="relative overflow-hidden rounded-xl bg-[#08111f] text-white shadow-[0_28px_90px_rgba(8,17,31,.20)]">
          <img src="/partnership-hero.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08111f] via-[#08111f]/88 to-[#08111f]/42" />
          <div className="relative grid min-h-[430px] items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-14 lg:py-14">
            <div>
              <p className="inline-flex h-9 items-center rounded-full bg-white/10 px-4 text-xs font-black uppercase tracking-[.18em] text-white/80 ring-1 ring-white/15">
                Partenariat Astral4Gamer
              </p>
              <h1 className="mt-5 max-w-3xl text-[28px] font-black leading-[1.08] tracking-normal sm:text-[40px] lg:text-[52px]">
                Gagne avec ta communauté gaming.
              </h1>
              <p className="mt-5 max-w-2xl text-[13px] font-semibold leading-6 text-white/76 sm:text-[15px]">
                Créateur, revendeur ou organisateur: propose ton dossier, reçois une formule adaptée et développe tes revenus avec Astral4Gamer.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a href={discordPartnerUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#ef2331] px-6 text-sm font-black text-white shadow-[0_18px_38px_rgba(239,35,49,.28)]">
                  Rejoindre Discord
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#programmes" className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-black text-[#08111f]">
                  Voir les programmes
                </a>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
              {heroStats.map(([label, value, Icon]) => (
                <div key={label} className="flex items-center gap-4 rounded-lg bg-white/10 p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-[#ef2331]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-[13px] font-black">{label}</span>
                    <span className="mt-1 block text-xs font-semibold text-white/68">{value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="programmes" className="mx-auto max-w-[1520px] px-4 pb-8 sm:px-6 lg:pb-12">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#ef2331]">Programmes</p>
            <h2 className="mt-2 text-xl font-black sm:text-2xl">Choisis ton type de partenariat</h2>
          </div>
          <p className="max-w-xl text-[13px] font-semibold leading-6 text-[#667085]">
            Les montants indiqués sont des estimations. La proposition finale dépend de ton audience, ton volume et la qualité du dossier.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {partnerTypes.map((plan) => {
            const Icon = plan.icon;

            return (
              <article key={plan.title} className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,.06)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#08111f] text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-black text-[#ef2331]">Ouvert</span>
                </div>
                <h3 className="mt-5 text-lg font-black">{plan.title}</h3>
                <p className="mt-3 min-h-[68px] text-[13px] font-semibold leading-6 text-[#667085]">{plan.description}</p>
                <p className="mt-4 text-base font-black text-[#ef2331]">{plan.earning}</p>
                <div className="mt-5 grid gap-2">
                  {plan.points.map((point) => (
                    <span key={point} className="flex items-center gap-2 text-[13px] font-bold text-[#344054]">
                      <BadgeCheck className="h-4 w-4 text-[#16a34a]" />
                      {point}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1520px] px-4 pb-10 sm:px-6">
        <div className="grid gap-5 rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,.06)] lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#ef2331]">Demande officielle</p>
            <h2 className="mt-2 text-xl font-black sm:text-2xl">Devenir revendeur API Free Fire</h2>
            <p className="mt-3 text-[13px] font-semibold leading-6 text-[#667085]">
              Remplis ce dossier. Il part directement dans le salon partenariat Discord, puis l’admin peut créer ton accès reseller.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nom du responsable" className="h-11 rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none focus:border-[#ef2331]" required />
              <input value={form.company_name} onChange={(event) => setForm({ ...form, company_name: event.target.value })} placeholder="Nom société / boutique" className="h-11 rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none focus:border-[#ef2331]" />
              <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email souhaité" type="email" className="h-11 rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none focus:border-[#ef2331]" required />
              <input value={form.discord} onChange={(event) => setForm({ ...form, discord: event.target.value })} placeholder="Discord" className="h-11 rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none focus:border-[#ef2331]" />
              <input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} placeholder="Pays" className="h-11 rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none focus:border-[#ef2331]" />
              <input value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} placeholder="Volume estimé / audience" className="h-11 rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none focus:border-[#ef2331]" />
              <input value={form.network_url} onChange={(event) => setForm({ ...form, network_url: event.target.value })} placeholder="Site web / réseau social" className="h-11 rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none focus:border-[#ef2331] sm:col-span-2" />
            </div>
            <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Décris ton projet, ton site, tes clients et ton volume prévu." className="min-h-28 rounded-lg border border-[#d0d5dd] px-3 py-3 text-sm outline-none focus:border-[#ef2331]" required />
            {status ? <p className="rounded-lg bg-[#f6f7fb] px-3 py-2 text-sm font-bold text-[#344054]">{status}</p> : null}
            <button disabled={isSubmitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#ef2331] px-5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60">
              {isSubmitting ? "Envoi..." : "Envoyer le dossier"}
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-[1520px] px-4 pb-16 sm:px-6">
        <div className="grid gap-5 rounded-xl bg-[#f6f7fb] p-5 md:grid-cols-[.9fr_1.1fr] md:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#ef2331]">Comment ça marche</p>
            <h2 className="mt-2 text-xl font-black sm:text-2xl">Un dossier simple, une réponse claire.</h2>
            <p className="mt-3 text-[13px] font-semibold leading-6 text-[#667085]">
              Clique sur Discord, présente ton projet et notre équipe te répond avec les conditions possibles.
            </p>
            <a href={discordPartnerUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#5865f2] px-5 text-sm font-black text-white">
              Ouvrir Discord
              <Handshake className="h-4 w-4" />
            </a>
          </div>
          <div className="grid gap-3">
            {steps.map(([number, title, text]) => (
              <div key={number} className="flex gap-4 rounded-lg bg-white p-4 ring-1 ring-[#e5e7eb]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#ef2331] text-sm font-black text-white">{number}</span>
                <span>
                  <span className="block text-[13px] font-black text-[#08111f]">{title}</span>
                  <span className="mt-1 block text-[13px] font-semibold leading-6 text-[#667085]">{text}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
