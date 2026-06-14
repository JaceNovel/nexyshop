"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Loader2, Send } from "lucide-react";

type Status = "idle" | "asking" | "enabled" | "blocked" | "unsupported";

export function LaunchAlerts() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("Activez les notifications pour être informé en avant-première des sorties, bêtas, tournois et récompenses exclusives.");

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window)) {
      setStatus("unsupported");
      setMessage("Les notifications ne sont pas supportées par ce navigateur.");
      return;
    }

    if (Notification.permission === "granted") {
      setStatus("enabled");
      setMessage("Alertes activées. Vous recevrez les prochains lancements importants.");
    } else if (Notification.permission === "denied") {
      setStatus("blocked");
      setMessage("Les notifications sont bloquées dans ce navigateur.");
      return;
    }

    if (localStorage.getItem("astral_launch_alerts_enabled") === "true") {
      setStatus("enabled");
      setEmail(localStorage.getItem("astral_launch_alerts_email") ?? "");
      setMessage("Alertes activées. Vous recevrez les prochains lancements importants.");
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await activateAlerts();
  }

  async function activateAlerts() {
    if (status === "unsupported") return;
    if (status === "asking") return;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("Entrez une adresse email valide pour recevoir les alertes.");
      return;
    }

    setStatus("asking");
    setMessage("Activation des alertes en cours...");

    try {
      const registration = "serviceWorker" in navigator
        ? await navigator.serviceWorker.register("/sw.js").catch(() => null)
        : null;
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus("blocked");
        setMessage("Permission refusée. Vous pouvez l’activer plus tard dans les paramètres du navigateur.");
        return;
      }

      localStorage.setItem("astral_launch_alerts_enabled", "true");
      if (email) localStorage.setItem("astral_launch_alerts_email", email);

      setStatus("enabled");
      setMessage(email ? "Alertes activées avec votre email." : "Alertes navigateur activées.");

      if (registration) {
        await registration.showNotification("Alertes Astral4Gamer activées", {
          body: "Vous serez prévenu des prochains lancements, bêtas et récompenses.",
          icon: "/icon.svg",
          badge: "/icon.svg",
          data: { url: "/jeux-avenir" }
        });
      } else {
        new Notification("Alertes Astral4Gamer activées", {
          body: "Vous serez prévenu des prochains lancements, bêtas et récompenses.",
          icon: "/icon.svg"
        });
      }
    } catch {
      setStatus("blocked");
      setMessage("Impossible d’activer les alertes pour le moment.");
    }
  }

  const enabled = status === "enabled";
  const loading = status === "asking";

  return (
    <section className={`launch-alerts group relative mt-8 overflow-hidden rounded-xl border p-5 shadow-[0_16px_38px_rgba(239,35,60,.08)] transition ${
      enabled ? "border-emerald-200 bg-emerald-50" : "border-[#ffd6db] bg-[#fff6f7]"
    }`}>
      <div className="pointer-events-none absolute -left-12 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[#ef233c]/10 blur-2xl transition group-hover:scale-125" />
      <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/45 blur-sm launch-alerts-shine" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => void (enabled ? pingEnabledBell() : activateAlerts())}
            disabled={loading || status === "unsupported"}
            className={`relative grid h-16 w-16 shrink-0 place-items-center rounded-full transition ${
              enabled ? "bg-emerald-100 text-emerald-600" : "bg-[#ffe5e8] text-[#ef233c]"
            } disabled:cursor-not-allowed disabled:opacity-70`}
            aria-label={enabled ? "Tester la cloche des alertes" : "Activer la cloche des alertes"}
          >
            <span className={`absolute inset-0 rounded-full ${enabled ? "animate-ping bg-emerald-400/25" : "launch-alerts-pulse bg-[#ef233c]/12"}`} />
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-[#ef233c] shadow-[0_0_0_5px_rgba(239,35,60,.16)]" />
            {loading ? (
              <Loader2 className="relative h-8 w-8 animate-spin" />
            ) : enabled ? (
              <CheckCircle2 className="relative h-8 w-8" />
            ) : (
              <Bell className="launch-alerts-bell relative h-8 w-8" />
            )}
          </button>
          <div>
            <h2 className="text-base font-black">{enabled ? "Alertes activées" : "Ne manquez aucun lancement !"}</h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold text-[#384152]">{message}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full max-w-[520px] flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Votre adresse email"
            className="h-12 flex-1 rounded-lg border border-[#dce2ec] bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#ef233c] focus:shadow-[0_0_0_4px_rgba(239,35,60,.10)]"
          />
          <button
            type="submit"
            disabled={loading || enabled}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-black text-white shadow-[0_14px_32px_rgba(239,35,60,.24)] transition ${
              enabled ? "bg-emerald-600" : "bg-[#ef233c] hover:bg-[#d90429]"
            } disabled:cursor-not-allowed disabled:opacity-80`}
          >
            {enabled ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {loading ? "Activation..." : enabled ? "Activé" : "Activer les alertes"}
          </button>
        </form>
      </div>
      <style jsx>{`
        .launch-alerts {
          isolation: isolate;
        }

        .launch-alerts-bell {
          animation: bell-ring 1.65s ease-in-out infinite;
          transform-origin: 50% 8%;
        }

        .launch-alerts-pulse {
          animation: soft-pulse 1.75s ease-in-out infinite;
        }

        .launch-alerts-shine {
          animation: alert-shine 4.8s ease-in-out infinite;
        }

        @keyframes bell-ring {
          0%, 100% { transform: rotate(0deg); }
          8% { transform: rotate(16deg); }
          16% { transform: rotate(-14deg); }
          24% { transform: rotate(10deg); }
          32% { transform: rotate(-7deg); }
          40% { transform: rotate(4deg); }
          52% { transform: rotate(0deg); }
        }

        @keyframes soft-pulse {
          0%, 100% { opacity: .42; transform: scale(.9); }
          50% { opacity: .9; transform: scale(1.16); }
        }

        @keyframes alert-shine {
          0%, 58% { transform: translateX(0) skewX(-18deg); opacity: 0; }
          68% { opacity: .65; }
          100% { transform: translateX(520%) skewX(-18deg); opacity: 0; }
        }
      `}</style>
    </section>
  );

  function pingEnabledBell() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    navigator.serviceWorker?.ready
      .then((registration) =>
        registration.showNotification("La cloche est active", {
          body: "Astral4Gamer vous préviendra des nouveaux lancements.",
          icon: "/icon.svg",
          badge: "/icon.svg",
          data: { url: "/jeux-avenir" }
        })
      )
      .catch(() => new Notification("La cloche est active", { body: "Astral4Gamer vous préviendra des nouveaux lancements.", icon: "/icon.svg" }));
  }
}
