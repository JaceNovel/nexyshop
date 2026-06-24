import type { ProductAvailability } from "@/lib/commerce-types";

const statusMap: Record<ProductAvailability, { label: string; className: string }> = {
  available: { label: "Disponible", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" },
  unavailable: { label: "Indisponible", className: "border-red-400/30 bg-red-400/10 text-red-200" },
  high_demand: { label: "Forte demande", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  maintenance: { label: "Maintenance", className: "border-slate-400/30 bg-slate-400/10 text-slate-200" },
  slow_delivery: { label: "Livraison lente", className: "border-orange-400/30 bg-orange-400/10 text-orange-200" },
  fast_delivery: { label: "Livraison rapide", className: "border-blue-400/30 bg-blue-400/10 text-blue-200" }
};

export function ProductAvailabilityBadge({ status }: { status: ProductAvailability }) {
  const item = statusMap[status];

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${item.className}`}>
      {item.label}
    </span>
  );
}
