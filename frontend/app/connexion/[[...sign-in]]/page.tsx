"use client";

import { Eye, EyeOff, Gift, Lock, ShieldCheck, Trophy, User, Users } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useSignIn } from "@clerk/nextjs/legacy";

const brandLogo = "/ChatGPT_Image_28_mai_2026__15_33_21-removebg-preview.png";
const heroImage = "/ChatGPT Image 28 mai 2026, 15_36_59.png";

export default function ConnexionPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn.create({ identifier, password });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/";
        return;
      }

      setError("Connexion incomplète. Vérifie tes informations ou termine la validation demandée.");
    } catch (requestError) {
      setError(getClerkError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSocialSignIn(strategy: "oauth_google" | "oauth_facebook" | "oauth_discord") {
    if (!isLoaded || !signIn) return;

    setError(null);

    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/"
      });
    } catch (requestError) {
      setError(getClerkError(requestError));
    }
  }

  function handleForgotPassword() {
    setError("Entre ton adresse e-mail, puis utilise la récupération de mot de passe depuis Clerk.");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#111827]">
      <section className="mx-auto grid min-h-screen max-w-[1440px] grid-rows-[auto_1fr] px-7 py-8 lg:px-16">
        <header className="flex items-center justify-between gap-6">
          <a href="/" className="inline-flex items-center">
            <img src={brandLogo} alt="Astral4Gamer" className="h-16 w-auto object-contain" />
          </a>
          <div className="flex items-center gap-4 text-[13px] font-medium text-[#111827]">
            <span className="hidden sm:inline">Pas encore de compte ?</span>
            <a href="/inscription" className="inline-flex h-11 items-center justify-center rounded-lg border border-[#ff2334] px-6 text-[13px] font-black text-[#ff1f2f] transition hover:bg-[#ff1f2f] hover:text-white">
              Créer un compte
            </a>
          </div>
        </header>

        <div className="grid items-center gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_640px] lg:py-12">
          <section className="relative min-h-[620px]">
            <div className="relative z-10 max-w-[620px]">
              <h1 className="text-[42px] font-black leading-[1.14] tracking-normal text-[#111827] md:text-[48px]">
                <span className="text-[#ff1f2f]">Bienvenue</span> de retour
                <br />
                dans l’univers ASTRAL<span className="text-[#ff1f2f]">4</span>GAMER
              </h1>
              <p className="mt-6 max-w-[540px] text-[15px] font-medium leading-7 text-[#5b6472]">
                Connecte-toi pour accéder à ton compte, suivre tes commandes, participer aux tournois et profiter d’avantages exclusifs.
              </p>
            </div>

            <div className="relative mt-4 h-[470px] max-w-[680px]">
              <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-contain object-bottom" />
              <FeatureCard className="left-0 top-[120px]" icon={<Trophy className="h-5 w-5" />} title="Tournois" text="Participe & Gagne" />
              <FeatureCard className="right-[56px] top-[150px]" icon={<Users className="h-5 w-5" />} title="Communauté" text="Rejoins des milliers de gamers" />
              <FeatureCard className="bottom-[86px] left-0" icon={<Lock className="h-5 w-5" />} title="Boutique" text="Produits exclusifs" />
              <FeatureCard className="bottom-[58px] right-[78px]" icon={<Gift className="h-5 w-5" />} title="Récompenses" text="Gagne des points et des bonus" />
            </div>
          </section>

          <section className="mx-auto w-full max-w-[640px] rounded-2xl border border-[#eef0f4] bg-white px-14 py-12 shadow-[0_24px_80px_rgba(17,24,39,.10)]">
            <div className="text-center">
              <h2 className="text-[34px] font-black tracking-normal text-[#111827]">Connexion</h2>
              <p className="mt-3 text-[13px] font-medium text-[#6b7280]">
                Accède à ton compte <span className="font-black text-[#ff1f2f]">ASTRAL4GAMER</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-9 space-y-6">
              <label className="block">
                <span className="text-[13px] font-black text-[#111827]">Adresse e-mail ou nom d’utilisateur</span>
                <span className="mt-3 flex h-14 items-center rounded-lg border border-[#d8dde7] px-4 text-[#9aa3b2] transition focus-within:border-[#ff1f2f] focus-within:ring-4 focus-within:ring-red-500/10">
                  <User className="mr-3 h-5 w-5" />
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    className="h-full flex-1 bg-transparent text-[14px] font-medium text-[#111827] outline-none placeholder:text-[#9aa3b2]"
                    placeholder="Entrez votre e-mail ou nom d’utilisateur"
                    autoComplete="username"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="text-[13px] font-black text-[#111827]">Mot de passe</span>
                <span className="mt-3 flex h-14 items-center rounded-lg border border-[#d8dde7] px-4 text-[#9aa3b2] transition focus-within:border-[#ff1f2f] focus-within:ring-4 focus-within:ring-red-500/10">
                  <Lock className="mr-3 h-5 w-5" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    className="h-full flex-1 bg-transparent text-[14px] font-medium text-[#111827] outline-none placeholder:text-[#9aa3b2]"
                    placeholder="Entrez votre mot de passe"
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} className="grid h-9 w-9 place-items-center text-[#7a8494]" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </span>
              </label>

              <div className="flex items-center justify-between gap-4">
                <label className="inline-flex items-center gap-2 text-[13px] font-medium text-[#7a8494]">
                  <input checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-[#d8dde7] accent-[#ff1f2f]" />
                  Se souvenir de moi
                </label>
                <button type="button" onClick={handleForgotPassword} className="text-[13px] font-black text-[#ff1f2f] hover:text-[#d91625]">
                  Mot de passe oublié ?
                </button>
              </div>

              {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-[13px] font-semibold text-[#b91c1c]">{error}</p> : null}

              <button disabled={!isLoaded || isSubmitting} type="submit" className="h-14 w-full rounded-lg bg-[#ff1f2f] text-[14px] font-black text-white shadow-[0_16px_34px_rgba(255,31,47,.22)] transition hover:bg-[#e51b2a] disabled:cursor-not-allowed disabled:opacity-70">
                {isSubmitting ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <span className="h-px flex-1 bg-[#e5e7eb]" />
              <span className="text-[12px] font-medium text-[#9aa3b2]">ou continuer avec</span>
              <span className="h-px flex-1 bg-[#e5e7eb]" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SocialButton label="Google" mark="G" onClick={() => handleSocialSignIn("oauth_google")} />
              <SocialButton label="Facebook" mark="f" onClick={() => handleSocialSignIn("oauth_facebook")} />
              <SocialButton label="Discord" mark="D" onClick={() => handleSocialSignIn("oauth_discord")} />
            </div>

            <p className="mt-10 flex items-center justify-center gap-2 text-[12px] font-medium text-[#8a93a3]">
              <ShieldCheck className="h-4 w-4" />
              Connexion sécurisée & données protégées
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, text, className }: { icon: ReactNode; title: string; text: string; className: string }) {
  return (
    <div className={`absolute hidden min-h-[76px] w-[178px] items-center gap-4 rounded-lg bg-white px-5 py-4 shadow-[0_18px_42px_rgba(17,24,39,.12)] lg:flex ${className}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-[#ff1f2f]">{icon}</span>
      <span>
        <b className="block text-[13px] font-black text-[#111827]">{title}</b>
        <small className="mt-1 block text-[10px] font-semibold leading-4 text-[#5f6878]">{text}</small>
      </span>
    </div>
  );
}

function SocialButton({ label, mark, onClick }: { label: string; mark: string; onClick: () => void }) {
  const markClassName = label === "Google" ? "text-[#1a73e8]" : label === "Facebook" ? "text-[#1877f2]" : "text-[#5865f2]";

  return (
    <button type="button" onClick={onClick} className="inline-flex h-[52px] items-center justify-center gap-3 rounded-lg border border-[#dfe4ec] bg-white px-4 text-[13px] font-black text-[#111827] transition hover:border-[#ff1f2f] hover:text-[#ff1f2f]">
      <span className={`text-[20px] font-black ${markClassName}`}>{mark}</span>
      {label}
    </button>
  );
}

function getClerkError(error: unknown) {
  const clerkError = error as { errors?: { longMessage?: string; message?: string }[] };
  return clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? "Connexion impossible pour le moment.";
}
