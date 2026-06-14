"use client";

import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { Headphones, Mail, PackageSearch, Send, UserRound } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submitSupportRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const payload = {
      order_reference: String(form.get("order_reference") ?? ""),
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      message: String(form.get("message") ?? "")
    };

    try {
      const response = await fetch(`${API_URL}/api/support/order-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.message ?? "Impossible d'envoyer la demande.");
      }

      event.currentTarget.reset();
      setStatus("sent");
      setMessage(body.message ?? "Demande envoyée.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Impossible d'envoyer la demande.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <div className="mb-8">
        <p className="text-sm font-semibold text-[#64748b]">Accueil / Support</p>
        <h1 className="mt-3 text-3xl font-black text-[#061126] md:text-5xl">Support commande</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#475569] md:text-base">
          Envoie une demande privée à l’équipe Astral4Gamer pour une commande, une recharge ou une carte cadeau.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-[1fr_360px]">
        <form onSubmit={submitSupportRequest} className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm md:p-7">
          <div className="grid gap-4 md:grid-cols-2">
            <Field icon={<PackageSearch className="h-5 w-5" />} label="Commande" name="order_reference" placeholder="#1234 ou référence paiement" />
            <Field icon={<UserRound className="h-5 w-5" />} label="Nom" name="name" placeholder="Ton nom" />
            <Field icon={<Mail className="h-5 w-5" />} label="E-mail" name="email" placeholder="client@example.com" type="email" />
          </div>

          <label className="mt-5 block text-sm font-bold text-[#0f172a]">
            Message
            <textarea
              name="message"
              required
              minLength={5}
              rows={6}
              placeholder="Explique ton problème: produit acheté, ID joueur, statut paiement, capture si besoin..."
              className="mt-2 w-full resize-none rounded-lg border border-[#dbe3ef] px-4 py-3 text-sm outline-none transition focus:border-[#ef233c] focus:ring-4 focus:ring-[#ef233c]/10"
            />
          </label>

          {message ? (
            <div className={`mt-4 rounded-lg px-4 py-3 text-sm font-semibold ${status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#ef233c] px-6 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-[#d90429] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {status === "sending" ? "Envoi..." : "Envoyer au support"}
          </button>
        </form>

        <aside className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-[#ef233c]">
            <Headphones className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-black text-[#061126]">Traitement privé</h2>
          <p className="mt-2 text-sm leading-6 text-[#475569]">
            Ta demande arrive directement dans le salon privé support commande de l’équipe. Ajoute le maximum de détails pour accélérer la vérification.
          </p>
        </aside>
      </section>
    </main>
  );
}

function Field({ icon, label, name, placeholder, type = "text" }: { icon: ReactNode; label: string; name: string; placeholder: string; type?: string }) {
  return (
    <label className="block text-sm font-bold text-[#0f172a]">
      {label}
      <span className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-[#dbe3ef] px-4 text-[#94a3b8] transition focus-within:border-[#ef233c] focus-within:ring-4 focus-within:ring-[#ef233c]/10">
        {icon}
        <input name={name} type={type} placeholder={placeholder} className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#0f172a] outline-none" />
      </span>
    </label>
  );
}
