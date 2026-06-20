"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, BarChart3, Eye, EyeOff, Globe, Headset, Lock, Mail, Moon, ShieldCheck, SquareCode, Zap } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const highlights = [
  {
    title: "Sécurisé",
    text: "Vos données sont protégées avec un chiffrement de niveau bancaire.",
    icon: ShieldCheck
  },
  {
    title: "Rapide",
    text: "Une API ultra-rapide et fiable conçue pour la performance.",
    icon: Zap
  },
  {
    title: "Fiable",
    text: "Disponibilité 24/7 et infrastructure haute résilience.",
    icon: BarChart3
  },
  {
    title: "Support",
    text: "Une équipe dédiée pour vous accompagner à chaque étape.",
    icon: Headset
  }
] as const;

export default function ResellerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/reseller/panel/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message ?? "Connexion reseller impossible.");
      }

      localStorage.setItem("astral_reseller_token", payload.token);
      localStorage.setItem("astral_reseller_partner", JSON.stringify(payload.partner));
      window.location.href = "/panel";
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Connexion reseller impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b14] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(92,41,255,.18),transparent_28%),radial-gradient(circle_at_18%_100%,rgba(91,52,244,.2),transparent_26%),linear-gradient(180deg,#070b14_0%,#050912_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-[-8%] h-[260px] bg-[radial-gradient(ellipse_at_center,rgba(122,62,255,.2),transparent_60%)] blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[200px] opacity-90">
        <div className="absolute inset-x-[-6%] bottom-[-36px] h-[180px] rounded-[100%] border-t border-[#8b5cff]/45" />
        <div className="absolute inset-x-[-8%] bottom-[-54px] h-[210px] rounded-[100%] border-t border-[#5d2dff]/35" />
        <div className="absolute inset-x-[-10%] bottom-[-78px] h-[240px] rounded-[100%] border-t border-[#a855f7]/25" />
      </div>
      <div className="pointer-events-none absolute right-[7%] top-[24%] hidden h-[320px] w-[320px] bg-[radial-gradient(circle,rgba(122,62,255,.18)_1px,transparent_1.4px)] bg-[length:12px_12px] opacity-70 lg:block" />

      <section className="relative mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 gap-12 px-6 py-8 lg:grid-cols-[320px_minmax(420px,1fr)_420px] lg:px-9">
        <div className="absolute right-6 top-6 z-20 hidden items-center gap-2 lg:flex">
          <button className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#1f2937] bg-[#0f1521]/92 px-3 text-[12px] font-medium text-slate-200 backdrop-blur">
            <Moon className="h-4 w-4 text-[#b492ff]" />
            Thème
          </button>
          <button className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#1f2937] bg-[#0f1521]/92 px-3 text-[12px] font-medium text-slate-200 backdrop-blur">
            <Globe className="h-4 w-4 text-[#b492ff]" />
            Français
          </button>
        </div>

        <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-between py-2 lg:col-span-1 lg:py-0">
          <div>
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-[linear-gradient(180deg,#7d3cff,#5b34f4)] shadow-[0_18px_44px_rgba(91,52,244,.22)]">
                <SquareCode className="h-7 w-7 text-white" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-[22px] font-black tracking-[-0.05em] text-white">Game<span className="text-[#8f5bff]">API</span></p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">API Panel</p>
              </div>
            </div>

            <div className="mt-16 max-w-[275px] lg:mt-24">
              <h1 className="text-[29px] font-black leading-[1.16] tracking-[-0.05em] text-white sm:text-[32px]">
                La puissance de notre <span className="text-[#8f5bff]">API</span>,
                <br />
                au service de vos projets.
              </h1>
              <div className="mt-6 h-[2px] w-9 rounded-full bg-[linear-gradient(90deg,#7d3cff,#a874ff)]" />
            </div>

            <div className="mt-8 grid max-w-[315px] gap-6 lg:mt-10">
              {highlights.map(({ title, text, icon: Icon }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center text-[#8d45ff]">
                    <Icon className="h-5 w-5" strokeWidth={2.1} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-white">{title}</p>
                    <p className="mt-1 text-[13px] leading-7 text-slate-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-12 text-[12px] text-slate-500">© 2024 GameAPI. Tous droits réservés.</p>
        </div>

        <div className="hidden lg:block" />

        <div className="relative flex items-center justify-center lg:justify-center">
          <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-[368px] rounded-[20px] border border-[#273043] bg-[linear-gradient(180deg,rgba(16,22,36,.96),rgba(10,16,28,.98))] px-6 py-7 shadow-[0_25px_90px_rgba(0,0,0,.35)] backdrop-blur sm:px-7 sm:py-8">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[radial-gradient(circle_at_center,rgba(125,60,255,.34),rgba(125,60,255,.12))] text-[#a67dff] shadow-[0_14px_34px_rgba(125,60,255,.16)]">
              <Lock className="h-7 w-7" />
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-[24px] font-black tracking-[-0.05em] text-white">Connexion</h2>
              <p className="mt-2 text-[13px] text-slate-400">Accédez à votre espace GameAPI</p>
            </div>

            <div className="mt-7 space-y-4">
              <label className="block">
                <span className="text-[13px] font-medium text-slate-300">Email</span>
                <span className="mt-2 flex h-11 items-center rounded-[8px] border border-[#273043] bg-[#0f1521] px-3 text-slate-500 focus-within:border-[#8f5bff] focus-within:text-[#b492ff]">
                  <Mail className="mr-3 h-4 w-4" />
                  <input value={email} onChange={(event) => setEmail(event.target.value)} className="h-full flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-slate-600" autoComplete="username" placeholder="votre@email.com" required />
                </span>
              </label>

              <label className="block">
                <span className="text-[13px] font-medium text-slate-300">Mot de passe</span>
                <span className="mt-2 flex h-11 items-center rounded-[8px] border border-[#273043] bg-[#0f1521] px-3 text-slate-500 focus-within:border-[#8f5bff] focus-within:text-[#b492ff]">
                  <Lock className="mr-3 h-4 w-4" />
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} className="h-full flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-slate-600" autoComplete="current-password" placeholder="••••••••••" required />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} className="grid h-8 w-8 place-items-center rounded-[8px]">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              <div className="flex items-center justify-between gap-3 text-[12px]">
                <label className="inline-flex items-center gap-2 text-slate-400">
                  <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe((current) => !current)} className="h-4 w-4 rounded border-white/10 bg-transparent text-[#7d3cff] focus:ring-[#7d3cff]" />
                  Se souvenir de moi
                </label>
                <a href="#" className="text-[#b492ff]">Mot de passe oublié ?</a>
              </div>

              {error ? <p className="rounded-[10px] border border-red-900 bg-red-950/40 px-3 py-2.5 text-[12px] text-red-100">{error}</p> : null}

              <button type="submit" disabled={isSubmitting} className="flex h-[42px] w-full items-center justify-center gap-2 rounded-[8px] bg-[linear-gradient(90deg,#5b34f4,#8f5bff)] text-[13px] font-black text-white shadow-[0_16px_30px_rgba(110,64,255,.18)] disabled:opacity-60">
                {isSubmitting ? "Connexion..." : "Se connecter"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-slate-600">
              <span className="h-px flex-1 bg-[#273043]" />
              <span>Ou</span>
              <span className="h-px flex-1 bg-[#273043]" />
            </div>

            <button type="button" className="mt-5 inline-flex h-[42px] w-full items-center justify-center gap-3 rounded-[8px] border border-[#273043] bg-[#0f1521] text-[13px] font-medium text-white">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-black text-[#ea4335]">G</span>
              Continuer avec Google
            </button>

            <p className="mt-6 text-center text-[13px] text-slate-400">
              Pas encore de compte ? <a href="/partenariat" className="font-semibold text-[#b492ff]">Créer un compte</a>
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-2 rounded-[10px] border border-[#273043] bg-[#0f1521] px-3 py-2.5">
                <SquareCode className="h-4 w-4 text-[#b492ff]" />
                API privée
              </span>
              <span className="flex items-center gap-2 rounded-[10px] border border-[#273043] bg-[#0f1521] px-3 py-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Hors Clerk
              </span>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
