"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, ShieldCheck, UserRound } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const brandLogo = "/ChatGPT_Image_28_mai_2026__20_26_02-removebg-preview.png";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("adminpanel@astral.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || payload?.errors?.email?.[0] || "Connexion admin impossible.";
        throw new Error(message);
      }

      localStorage.setItem("nexy_sanctum_token", payload.token);
      localStorage.setItem("astral_admin_user", JSON.stringify(payload.user));
      window.location.href = "/admin";
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Connexion admin impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#070b16] px-4 text-white">
      <section className="w-full max-w-[460px] rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col items-center text-center">
          <span className="relative h-[82px] w-[82px] overflow-hidden">
            <img src={brandLogo} alt="" className="absolute left-[-60px] top-[-12px] h-auto w-[196px] max-w-none" />
          </span>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">Astral4Gamer</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal">Admin Panel</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Connexion reservee a l'administration Astral4Gamer.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-300">E-mail admin</span>
            <span className="mt-2 flex h-12 items-center rounded-xl border border-white/10 bg-black/20 px-3 text-slate-400 focus-within:border-violet-400/70">
              <UserRound className="mr-3 h-4 w-4" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                autoComplete="username"
                required
              />
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-300">Mot de passe</span>
            <span className="mt-2 flex h-12 items-center rounded-xl border border-white/10 bg-black/20 px-3 text-slate-400 focus-within:border-violet-400/70">
              <Lock className="mr-3 h-4 w-4" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                placeholder="Mot de passe admin"
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)} className="grid h-8 w-8 place-items-center text-slate-400">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          {error ? <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-100">{error}</p> : null}

          <button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4" />
          Acces protege par token admin Sanctum
        </p>
      </section>
    </main>
  );
}
