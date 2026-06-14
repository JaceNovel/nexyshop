"use client";

import { MessageCircle, ShieldCheck, Trophy, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const discordUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ?? "https://discord.gg/astral4gamer";
const joinedKey = "astral_discord_joined";
const postponedKey = "astral_discord_popup_postponed_until";
const signupTriggerKey = "astral_discord_popup_after_signup";
const paymentTriggerKey = "astral_discord_popup_after_payment";
const visitSeenKey = "astral_discord_visit_seen_this_session";
const oneDayMs = 24 * 60 * 60 * 1000;

function hasJoinedDiscord() {
  return typeof window !== "undefined" && localStorage.getItem(joinedKey) === "1";
}

function isPostponed() {
  if (typeof window === "undefined") return true;
  const postponedUntil = Number(localStorage.getItem(postponedKey) ?? 0);
  return Number.isFinite(postponedUntil) && postponedUntil > Date.now();
}

export function markDiscordPopupAfterSignup() {
  if (typeof window === "undefined") return;
  localStorage.setItem(signupTriggerKey, "1");
}

export function markDiscordPopupAfterPayment() {
  if (typeof window === "undefined") return;
  localStorage.setItem(paymentTriggerKey, "1");
}

export function markDiscordJoined() {
  if (typeof window === "undefined") return;
  localStorage.setItem(joinedKey, "1");
}

export function DiscordFollowPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<"visit" | "signup" | "payment">("visit");

  useEffect(() => {
    if (hasJoinedDiscord() || isPostponed()) return;

    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("paymentStatus") ?? params.get("payment_status") ?? params.get("status") ?? "";
    const paymentSuccess = pathname === "/checkout/return" && ["success", "paid", "completed", "complete"].includes(paymentStatus.toLowerCase());

    if (paymentSuccess) {
      localStorage.setItem(paymentTriggerKey, "1");
    }

    const afterPayment = localStorage.getItem(paymentTriggerKey) === "1";
    const afterSignup = localStorage.getItem(signupTriggerKey) === "1";

    if (afterPayment) {
      setReason("payment");
      setOpen(true);
      localStorage.removeItem(paymentTriggerKey);
      return;
    }

    if (afterSignup && pathname === "/profil") {
      setReason("signup");
      setOpen(true);
      localStorage.removeItem(signupTriggerKey);
      return;
    }

    if (!sessionStorage.getItem(visitSeenKey) && !["/connexion", "/inscription"].some((prefix) => pathname.startsWith(prefix))) {
      sessionStorage.setItem(visitSeenKey, "1");
      const timer = window.setTimeout(() => {
        if (!hasJoinedDiscord() && !isPostponed()) {
          setReason("visit");
          setOpen(true);
        }
      }, 12000);

      return () => window.clearTimeout(timer);
    }
  }, [pathname]);

  if (!open) return null;

  const title = reason === "payment" ? "Paiement validé, rejoins la communauté" : reason === "signup" ? "Ton compte est prêt" : "Rejoins Astral4Gamer sur Discord";
  const text = reason === "payment"
    ? "Suis ta commande, reçois les annonces et contacte le support plus rapidement depuis notre serveur."
    : reason === "signup"
      ? "Viens récupérer les annonces, tournois, lives et avantages réservés aux membres Astral4Gamer."
      : "Suis nos tournois, nouveautés, codes, lives et annonces boutique directement sur Discord.";

  function joinDiscord() {
    markDiscordJoined();
    setOpen(false);
    window.open(discordUrl, "_blank", "noopener,noreferrer");
  }

  function postpone() {
    localStorage.setItem(postponedKey, String(Date.now() + oneDayMs));
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-black/45 px-3 py-6 backdrop-blur-sm">
      <section className="w-full max-w-[460px] overflow-hidden rounded-lg bg-white shadow-[0_30px_90px_rgba(15,23,42,.32)]">
        <div className="relative bg-[#111827] px-5 py-6 text-white">
          <button onClick={postpone} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#5865f2]">
            <MessageCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-black leading-tight">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/76">{text}</p>
        </div>

        <div className="grid gap-3 px-5 py-5">
          <div className="grid gap-2 text-sm font-semibold text-[#344054]">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#e52b2f]" /> Support, suivi commandes et annonces importantes</span>
            <span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-[#e52b2f]" /> Tournois, lives, nouveautés et avantages membres</span>
          </div>

          <button onClick={joinDiscord} className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#5865f2] px-5 text-sm font-black text-white shadow-[0_16px_34px_rgba(88,101,242,.28)]">
            Rejoindre le Discord
            <MessageCircle className="h-4 w-4" />
          </button>
          <button onClick={postpone} className="h-10 rounded-lg text-sm font-bold text-[#667085] hover:bg-[#f8fafc]">
            Plus tard
          </button>
        </div>
      </section>
    </div>
  );
}
