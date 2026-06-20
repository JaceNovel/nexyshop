import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

type DeliveryResponse = {
  order?: {
    id: number;
    status: string;
    fulfillment_status?: string | null;
    amount?: number;
    currency?: string;
  };
  supplier_order?: {
    external_id?: string | null;
    status?: string | null;
  } | null;
  delivery_codes?: Array<{ label?: string; value?: string }>;
};

export default async function CheckoutReturnPage({ searchParams }: { searchParams: Promise<{ paymentStatus?: string; paymentId?: string; order_id?: string }> }) {
  const params = await searchParams;
  const status = params.paymentStatus ?? "pending";
  const isSuccess = status === "success";
  const isFailed = ["failed", "cancelled"].includes(status);
  const Icon = isSuccess ? CheckCircle2 : isFailed ? XCircle : Clock3;
  const delivery = isSuccess ? await getDelivery(params.order_id, params.paymentId) : null;
  const codes = delivery?.delivery_codes?.filter((item) => item.value) ?? [];

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
          {delivery?.supplier_order ? (
            <p className="mt-3 text-sm leading-6 text-[#697081]">
              Livraison : <b>{delivery.supplier_order.status ?? delivery.order?.fulfillment_status ?? "en cours"}</b><br />
              Ta commande est en cours de traitement.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#697081]">Ta commande est confirmée. La livraison est en cours de préparation.</p>
          )}
          {codes.length ? (
            <div className="mx-auto mt-6 max-w-[520px] rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left">
              <p className="text-sm font-black text-emerald-800">Code livré</p>
              <div className="mt-3 space-y-2">
                {codes.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="rounded-lg bg-white px-3 py-2">
                    <span className="block text-[11px] font-black uppercase text-emerald-700">{item.label ?? "Code"}</span>
                    <code className="mt-1 block break-all text-sm font-black text-[#111827]">{item.value}</code>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-7 flex justify-center gap-3">
            <a href="/" className="rounded-lg border border-[#6d28d9] px-5 py-3 text-sm font-black text-[#6d28d9]">Accueil</a>
            <a href="/category/top-up" className="rounded-lg bg-[#6d28d9] px-5 py-3 text-sm font-black text-white">Continuer mes achats</a>
          </div>
        </div>
      </section>
    </main>
  );
}

async function getDelivery(orderId?: string, paymentId?: string): Promise<DeliveryResponse | null> {
  if (!orderId || !paymentId) return null;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "https://api.astral4gamer.com";
  const url = `${baseUrl}/api/orders/${encodeURIComponent(orderId)}/delivery?payment_reference=${encodeURIComponent(paymentId)}`;

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });

    if (!response.ok) return null;

    return response.json() as Promise<DeliveryResponse>;
  } catch {
    return null;
  }
}
