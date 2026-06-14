"use client";

import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { Search, Send, Share2, UsersRound } from "lucide-react";
import { searchCommunityTeam, shareCommunityProfile } from "@/lib/api";

export default function CommunityPage() {
  const [status, setStatus] = useState("");

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runAction(
      () => shareCommunityProfile(readToken(), {
        game: String(form.get("game") ?? ""),
        message: String(form.get("message") ?? "")
      }),
      setStatus
    );
  }

  async function submitTeamSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runAction(
      () => searchCommunityTeam(readToken(), {
        game: String(form.get("game") ?? ""),
        role: String(form.get("role") ?? ""),
        region: String(form.get("region") ?? ""),
        discord: String(form.get("discord") ?? ""),
        message: String(form.get("message") ?? "")
      }),
      setStatus
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-semibold text-[#64748b]">Accueil / Communauté</p>
      <h1 className="mt-3 text-3xl font-black text-[#061126] md:text-5xl">Communauté Astral4Gamer</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#475569]">
        Partage ton profil, trouve une équipe et envoie tes clips/replays dans le salon communauté Discord.
      </p>

      {status ? <div className="mt-6 rounded-lg bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#334155]">{status}</div> : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <CommunityForm title="Partager mon profil" icon={<Share2 className="h-5 w-5" />} onSubmit={submitProfile} button="Partager dans Discord">
          <Field name="game" label="Jeu" placeholder="Free Fire, PUBG, Fortnite..." />
          <Field name="message" label="Message" placeholder="Présente ton profil, ton style de jeu..." textarea />
        </CommunityForm>

        <CommunityForm title="Recherche team" icon={<UsersRound className="h-5 w-5" />} onSubmit={submitTeamSearch} button="Publier la recherche">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="game" label="Jeu" placeholder="Free Fire" required />
            <Field name="role" label="Rôle" placeholder="Rusher, sniper, support..." />
            <Field name="region" label="Région" placeholder="Afrique, Europe, ME..." />
            <Field name="discord" label="Discord" placeholder="@pseudo" />
          </div>
          <Field name="message" label="Message" placeholder="Dis ce que tu recherches: niveau, horaires, objectif tournoi..." textarea />
        </CommunityForm>
      </section>

      <section className="mt-8 rounded-lg border border-[#e5e7eb] bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#fee2e2] text-[#ef233c]"><Search className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-black text-[#061126]">Clips et screens</h2>
            <p className="text-sm text-[#64748b]">Depuis une page replay, utilise le bouton “Publier clip” pour envoyer une vidéo issue d’un live passé dans Discord.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function CommunityForm({ title, icon, children, button, onSubmit }: { title: string; icon: ReactNode; children: ReactNode; button: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[#061126]">{icon}{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
      <button className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#ef233c] px-5 text-sm font-black text-white" type="submit">
        <Send className="h-4 w-4" /> {button}
      </button>
    </form>
  );
}

function Field({ name, label, placeholder, textarea = false, required = false }: { name: string; label: string; placeholder: string; textarea?: boolean; required?: boolean }) {
  return (
    <label className="block text-sm font-bold text-[#0f172a]">
      {label}
      {textarea ? (
        <textarea name={name} required={required} rows={5} placeholder={placeholder} className="mt-2 w-full resize-none rounded-lg border border-[#dbe3ef] px-4 py-3 text-sm outline-none focus:border-[#ef233c]" />
      ) : (
        <input name={name} required={required} placeholder={placeholder} className="mt-2 h-11 w-full rounded-lg border border-[#dbe3ef] px-4 text-sm outline-none focus:border-[#ef233c]" />
      )}
    </label>
  );
}

function readToken() {
  return typeof window === "undefined" ? null : localStorage.getItem("nexy_sanctum_token");
}

async function runAction(action: () => Promise<{ message?: string }>, setStatus: (value: string) => void) {
  try {
    const result = await action();
    setStatus(result.message ?? "Action envoyée.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Action impossible.");
  }
}
