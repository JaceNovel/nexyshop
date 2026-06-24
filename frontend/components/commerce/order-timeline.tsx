import { CheckCircle2, Circle, Clock } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/commerce-types";

const steps: { status: OrderStatus; label: string }[] = [
  { status: "payment_pending", label: "Paiement en attente" },
  { status: "payment_received", label: "Paiement recu" },
  { status: "verification", label: "Verification" },
  { status: "supplier_submitted", label: "Commande transmise" },
  { status: "manual_processing", label: "Traitement manuel" },
  { status: "delivery_in_progress", label: "Livraison en cours" },
  { status: "delivered", label: "Produit livre" }
];

export function OrderTimeline({ order }: { order: Order }) {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.status === order.status));
  const progress = Math.round(((currentIndex + 1) / steps.length) * 100);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0b1120] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-red-300">Suivi commande</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">{order.reference}</h2>
        </div>
        <span className="rounded-full border border-blue-400/25 bg-blue-400/10 px-3 py-1 text-sm text-blue-100">
          Livraison estimee: {order.estimatedDelivery}
        </span>
      </div>
      <div className="mt-6 h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-violet-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-7">
        {steps.map((step, index) => {
          const done = index <= currentIndex;
          return (
            <div key={step.status} className={`rounded-2xl border p-3 ${done ? "border-emerald-400/30 bg-emerald-400/10" : "border-white/10 bg-white/[0.03]"}`}>
              {done ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Circle className="h-5 w-5 text-slate-600" />}
              <p className="mt-3 text-xs text-slate-200">{step.label}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-6 space-y-3">
        {order.events.filter((event) => event.visibleToCustomer).map((event) => (
          <div key={event.id} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
            <div>
              <p className="text-sm font-semibold text-white">{event.title}</p>
              <p className="mt-1 text-sm text-slate-400">{event.message}</p>
              <p className="mt-2 text-xs text-slate-600">{new Date(event.createdAt).toLocaleString("fr-FR")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
