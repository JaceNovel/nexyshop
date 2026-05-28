import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export default async function CheckoutReturnPage({ searchParams }: { searchParams: Promise<{ paymentStatus?: string; paymentId?: string; order_id?: string }> }) {
  const params = await searchParams;
  const status = params.paymentStatus ?? "pending";
  const isSuccess = status === "success";
  const isFailed = ["failed", "cancelled"].includes(status);
  const Icon = isSuccess ? CheckCircle2 : isFailed ? XCircle : Clock3;

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />
      <section className="mx-auto grid min-h-[520px] max-w-[760px] place-items-center px-6 text-center">
        <div>
          <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${isSuccess ? "bg-emerald-50 text-emerald-600" : isFailed ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
            <Icon className="h-8 w-8" />
          </span>
          <h1 className="mt-6 text-3xl font-black">{isSuccess ? "Paiement reçu" : isFailed ? "Paiement non finalisé" : "Paiement en vérification"}</h1>
          <p className="mt-3 text-sm leading-6 text-[#697081]">
            Référence Moneroo : <b>{params.paymentId ?? "non fournie"}</b><br />
            Commande : <b>{params.order_id ?? "non fournie"}</b>
          </p>
          <p className="mt-3 text-sm leading-6 text-[#697081]">Le serveur confirme toujours le statut final via webhook ou vérification Moneroo avant livraison.</p>
          <div className="mt-7 flex justify-center gap-3">
            <a href="/" className="rounded-lg border border-[#6d28d9] px-5 py-3 text-sm font-black text-[#6d28d9]">Accueil</a>
            <a href="/category/top-up" className="rounded-lg bg-[#6d28d9] px-5 py-3 text-sm font-black text-white">Continuer mes achats</a>
          </div>
        </div>
      </section>
    </main>
  );
}
