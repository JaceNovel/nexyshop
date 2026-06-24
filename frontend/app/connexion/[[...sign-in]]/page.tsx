"use client";

import { Eye, EyeOff, Gift, Lock, ShieldCheck, Trophy, User, Users } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useSignIn } from "@clerk/nextjs/legacy";
import { API_BASE_URL, getSteamRedirectUrl } from "@/lib/api";

const brandLogo = "/ChatGPT_Image_28_mai_2026__20_26_02-removebg-preview.png";
const heroImage = "/signup-hero.png";
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const adminEmail = "adminpanel@astral.com";

function authRedirectTarget() {
  if (typeof window === "undefined") return "/";

  const target = new URLSearchParams(window.location.search).get("redirect_url");

  if (!target?.startsWith("/") || target.startsWith("//")) return "/";

  return target;
}

function authPageLink(path: "/connexion" | "/inscription") {
  const target = authRedirectTarget();

  return target === "/" ? path : `${path}?redirect_url=${encodeURIComponent(target)}`;
}

export default function ConnexionPage() {
  const { signIn, setActive } = useSignIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedIdentifier = identifier.trim().toLowerCase();

    setIsSubmitting(true);
    setError(null);

    if (normalizedIdentifier === adminEmail) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: normalizedIdentifier, password })
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message || payload?.errors?.email?.[0] || "Identifiants administrateur incorrects.");
        }

        localStorage.setItem("nexy_sanctum_token", payload.token);
        localStorage.setItem("astral_admin_user", JSON.stringify(payload.user));
        window.location.href = "/admin";
        return;
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Connexion administrateur impossible.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!clerkPublishableKey) {
      setError("Clerk n'est pas configure sur le serveur. Ajoute NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY dans frontend/.env.local puis rebuild.");
      setIsSubmitting(false);
      return;
    }

    if (!signIn) {
      setError("Clerk n'est pas prêt côté navigateur. Vérifie le domaine astral4gamer.com dans Clerk et recharge la page.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signIn.create({ identifier: identifier.trim(), password });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = authRedirectTarget();
        return;
      }

      setError("Connexion incomplète. Vérifie tes informations ou termine la validation demandée.");
    } catch (requestError) {
      setError(getClerkError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSocialSignIn(strategy: "oauth_google" | "oauth_discord") {
    if (!clerkPublishableKey) {
      setError("Clerk n'est pas configure sur le serveur. Ajoute NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY dans frontend/.env.local puis rebuild.");
      return;
    }

    if (!signIn) {
      setError("Clerk n'est pas prêt côté navigateur. Vérifie le domaine astral4gamer.com dans Clerk et recharge la page.");
      return;
    }

    setError(null);

    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: authRedirectTarget()
      });
    } catch (requestError) {
      setError(getClerkError(requestError));
    }
  }

  async function handleSteamSignIn() {
    setError(null);

    try {
      const token = localStorage.getItem("nexy_sanctum_token");
      const payload = await getSteamRedirectUrl(token);
      window.location.href = payload.url;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Connexion Steam impossible pour le moment.");
    }
  }

  function handleForgotPassword() {
    setError("Entre ton adresse e-mail, puis utilise la récupération de mot de passe depuis Clerk.");
  }

  return (
    <main className="h-screen overflow-hidden bg-white text-[#111827]">
      <section className="mx-auto grid h-screen max-w-[1360px] grid-rows-[auto_1fr] px-4 py-4 sm:px-6 lg:px-10">
        <header className="flex items-center justify-between gap-6">
          <a href="/" className="inline-flex items-center gap-3" aria-label="Astral4Gamer">
            <span className="relative h-[64px] w-[64px] shrink-0 overflow-hidden">
              <img src={brandLogo} alt="" className="absolute left-[-48px] top-[-9px] h-auto w-[154px] max-w-none" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[25px] font-black italic text-black">
                ASTRAL<span className="text-[#ff1f2f]">4</span>GAMER
              </span>
              <span className="mt-2 text-center text-[8px] font-black tracking-[.42em] text-black">
                <span className="text-[#ff1f2f]">PLAY</span> • COMPETE • WIN
              </span>
            </span>
          </a>
          <div className="flex items-center gap-3 text-[12px] font-medium text-[#111827]">
            <span className="hidden sm:inline">Pas encore de compte ?</span>
            <a href={authPageLink("/inscription")} className="inline-flex h-9 items-center justify-center rounded-lg border border-[#ff2334] px-4 text-[12px] font-black text-[#ff1f2f] transition hover:bg-[#ff1f2f] hover:text-white">
              Créer un compte
            </a>
          </div>
        </header>

        <div className="grid min-h-0 items-center gap-6 py-3 lg:grid-cols-[minmax(0,1fr)_520px] lg:py-5">
          <section className="relative hidden min-h-0 lg:block">
            <div className="relative z-10 max-w-[560px]">
              <h1 className="text-[34px] font-black leading-[1.08] tracking-normal text-[#111827] xl:text-[40px]">
                <span className="text-[#ff1f2f]">Bienvenue</span> de retour
                <br />
                dans l’univers ASTRAL<span className="text-[#ff1f2f]">4</span>GAMER
              </h1>
              <p className="mt-4 max-w-[500px] text-[13px] font-medium leading-6 text-[#5b6472]">
                Connecte-toi pour accéder à ton compte, suivre tes commandes, participer aux tournois et profiter d’avantages exclusifs.
              </p>
            </div>

            <div className="relative mt-1 h-[360px] max-w-[600px] xl:h-[390px]">
              <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-contain object-bottom" />
              <FeatureCard className="left-0 top-[72px]" icon={<Trophy className="h-4 w-4" />} title="Tournois" text="Participe & Gagne" />
              <FeatureCard className="right-[36px] top-[98px]" icon={<Users className="h-4 w-4" />} title="Communauté" text="Rejoins des gamers" />
              <FeatureCard className="bottom-[70px] left-0" icon={<Lock className="h-4 w-4" />} title="Boutique" text="Produits exclusifs" />
              <FeatureCard className="bottom-[42px] right-[58px]" icon={<Gift className="h-4 w-4" />} title="Récompenses" text="Points et bonus" />
            </div>
          </section>

          <section className="mx-auto w-full max-w-[520px] rounded-xl border border-[#eef0f4] bg-white px-5 py-5 shadow-[0_18px_56px_rgba(17,24,39,.10)] sm:px-8 lg:px-9">
            <div className="text-center">
              <h2 className="text-[26px] font-black tracking-normal text-[#111827]">Connexion</h2>
              <p className="mt-2 text-[12px] font-medium text-[#6b7280]">
                Accède à ton compte <span className="font-black text-[#ff1f2f]">ASTRAL4GAMER</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-[12px] font-black text-[#111827]">E-mail</span>
                <span className="mt-2 flex h-11 items-center rounded-lg border border-[#d8dde7] px-3 text-[#9aa3b2] transition focus-within:border-[#ff1f2f] focus-within:ring-4 focus-within:ring-red-500/10">
                  <User className="mr-2 h-4 w-4" />
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    className="h-full flex-1 bg-transparent text-[13px] font-medium text-[#111827] outline-none placeholder:text-[#9aa3b2]"
                    placeholder="Entrez votre e-mail"
                    autoComplete="username"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="text-[12px] font-black text-[#111827]">Mot de passe</span>
                <span className="mt-2 flex h-11 items-center rounded-lg border border-[#d8dde7] px-3 text-[#9aa3b2] transition focus-within:border-[#ff1f2f] focus-within:ring-4 focus-within:ring-red-500/10">
                  <Lock className="mr-2 h-4 w-4" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    className="h-full flex-1 bg-transparent text-[13px] font-medium text-[#111827] outline-none placeholder:text-[#9aa3b2]"
                    placeholder="Entrez votre mot de passe"
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} className="grid h-8 w-8 place-items-center text-[#7a8494]" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              <div className="flex items-center justify-between gap-4">
                <label className="inline-flex items-center gap-2 text-[12px] font-medium text-[#7a8494]">
                  <input checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} type="checkbox" className="h-3.5 w-3.5 rounded border-[#d8dde7] accent-[#ff1f2f]" />
                  Se souvenir de moi
                </label>
                <button type="button" onClick={handleForgotPassword} className="text-[12px] font-black text-[#ff1f2f] hover:text-[#d91625]">
                  Mot de passe oublié ?
                </button>
              </div>

              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-[#b91c1c]">{error}</p> : null}

              <button disabled={isSubmitting} type="submit" className="h-11 w-full rounded-lg bg-[#ff1f2f] text-[13px] font-black text-white shadow-[0_12px_26px_rgba(255,31,47,.18)] transition hover:bg-[#e51b2a] disabled:cursor-not-allowed disabled:opacity-70">
                {isSubmitting ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#e5e7eb]" />
              <span className="text-[12px] font-medium text-[#9aa3b2]">ou continuer avec</span>
              <span className="h-px flex-1 bg-[#e5e7eb]" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <SocialButton label="Google" provider="google" onClick={() => handleSocialSignIn("oauth_google")} />
              <SocialButton label="Discord" provider="discord" onClick={() => handleSocialSignIn("oauth_discord")} />
            </div>
            <button type="button" onClick={handleSteamSignIn} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#1b2838] bg-[#171a21] px-3 text-[12px] font-black text-white transition hover:bg-[#0b1118]">
              <SteamIcon />
              Se connecter avec Steam
            </button>

            <p className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium text-[#8a93a3]">
              <ShieldCheck className="h-3.5 w-3.5" />
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
    <div className={`absolute hidden min-h-[62px] w-[158px] items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-[0_14px_34px_rgba(17,24,39,.12)] lg:flex ${className}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-[#ff1f2f]">{icon}</span>
      <span>
        <b className="block text-[12px] font-black text-[#111827]">{title}</b>
        <small className="mt-0.5 block text-[10px] font-semibold leading-4 text-[#5f6878]">{text}</small>
      </span>
    </div>
  );
}

function SocialButton({ label, provider, onClick }: { label: string; provider: "google" | "facebook" | "discord"; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe4ec] bg-white px-2 text-[12px] font-black text-[#111827] transition hover:border-[#ff1f2f] hover:text-[#ff1f2f]">
      <ProviderIcon provider={provider} />
      {label}
    </button>
  );
}

function ProviderIcon({ provider }: { provider: "google" | "facebook" | "discord" }) {
  if (provider === "google") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z" />
      </svg>
    );
  }

  if (provider === "facebook") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.53-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#5865F2" d="M20.32 4.37A19.79 19.79 0 0 0 15.36 2.8a13.78 13.78 0 0 0-.64 1.32 18.27 18.27 0 0 0-5.44 0 12.64 12.64 0 0 0-.65-1.32 19.74 19.74 0 0 0-4.96 1.57C.54 9.06-.32 13.63.1 18.13a19.93 19.93 0 0 0 6.08 3.07 14.6 14.6 0 0 0 1.3-2.1 12.91 12.91 0 0 1-2.05-.98c.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.14 0c.17.14.33.27.5.4-.65.39-1.33.72-2.06.98.38.74.82 1.45 1.3 2.1a19.86 19.86 0 0 0 6.09-3.07c.5-5.22-.86-9.75-3.58-13.76ZM8.02 15.36c-1.18 0-2.16-1.09-2.16-2.42s.95-2.42 2.16-2.42c1.2 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.96 0c-1.18 0-2.16-1.09-2.16-2.42s.95-2.42 2.16-2.42c1.2 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Z" />
    </svg>
  );
}

function SteamIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 0a12 12 0 0 0-12 11.54l6.44 2.66a3.39 3.39 0 0 1 1.91-.58h.19l2.86-4.15v-.06a4.55 4.55 0 1 1 4.55 4.55h-.1l-4.07 2.91v.16a3.44 3.44 0 0 1-6.79.78L.38 15.9A12 12 0 1 0 12 0Zm-3.63 18.74-1.47-.61a2.58 2.58 0 0 0 1.42 1.18 2.55 2.55 0 0 0 1.95-.16 2.57 2.57 0 0 0 1.02-3.48 2.57 2.57 0 0 0-3.3-1.15l1.52.63a1.9 1.9 0 1 1-1.14 3.59Zm7.58-6.3a3.03 3.03 0 1 0 0-6.06 3.03 3.03 0 0 0 0 6.06Zm0-.75a2.28 2.28 0 1 1 0-4.56 2.28 2.28 0 0 1 0 4.56Z" />
    </svg>
  );
}

function getClerkError(error: unknown) {
  const clerkError = error as { errors?: { longMessage?: string; message?: string }[] };
  return clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? "Connexion impossible pour le moment.";
}
