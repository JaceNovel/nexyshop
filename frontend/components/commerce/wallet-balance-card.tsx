import { Wallet as WalletIcon } from "lucide-react";
import type { Wallet } from "@/lib/commerce-types";

export function WalletBalanceCard({ wallet }: { wallet: Wallet }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#111827] to-[#170b2e] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,.25)]">
      <div className="flex items-center justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/15 text-red-200">
          <WalletIcon className="h-6 w-6" />
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">Wallet Astral</span>
      </div>
      <p className="mt-6 text-sm text-slate-400">Solde disponible</p>
      <strong className="mt-2 block text-4xl font-semibold">{wallet.balance.toFixed(2)} {wallet.currency}</strong>
      <p className="mt-3 text-sm text-slate-400">Recharge, cashback et remboursements sont centralises ici.</p>
    </section>
  );
}
