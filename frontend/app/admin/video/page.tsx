import { AlertTriangle, Bot, Radio, Settings, Video, type LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const actions: Array<[string, string, LucideIcon]> = [
  ["Connexion YouTube", "OAuth 2.0 admin, tokens stockés côté Laravel.", Settings],
  ["Créer live YouTube", "Prépare broadcast, embed URL et watch URL.", Radio],
  ["Analyser replay", "Crée un job IA et propose des moments clés.", Bot],
  ["Générer clip", "Crée un job FFmpeg puis prépare l’upload YouTube.", Video]
];

export default function AdminVideoPage() {
  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />
      <section className="mx-auto max-w-[1280px] px-6 py-8">
        <p className="text-xs font-black uppercase text-[#6d28d9]">Admin vidéo</p>
        <h1 className="mt-2 text-4xl font-black tracking-normal">YouTube, OBS et IA highlights</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5b6170]">Interface de pilotage prévue pour les endpoints protégés Sanctum + rôle admin. Les actions privées passent par Laravel, jamais par le frontend.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {actions.map(([title, text, Icon]) => (
            <section key={title} className="rounded-lg border border-[#ececf3] bg-[#fbfbff] p-5">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#f5f3ff] text-[#6d28d9]"><Icon className="h-5 w-5" /></span>
              <h2 className="mt-4 text-lg font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#697081]">{text}</p>
              <button className="mt-5 h-10 rounded-lg bg-[#111827] px-4 text-xs font-black text-white">Ouvrir</button>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-amber-900"><AlertTriangle className="h-4 w-4" /> Sécurité</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">Configurez `YOUTUBE_CLIENT_SECRET`, `OPENAI_API_KEY` et `OBS_WEBSOCKET_PASSWORD` uniquement dans `.env`. Les routes admin sont protégées par `auth:sanctum` et `can:admin`.</p>
        </section>
      </section>
    </main>
  );
}
