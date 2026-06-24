import { ShieldCheck } from "lucide-react";

export function VerifiedPurchaseBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-200">
      <ShieldCheck className="h-3.5 w-3.5" />
      Achat verifie
    </span>
  );
}
