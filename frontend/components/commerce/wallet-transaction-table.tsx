import type { WalletTransaction } from "@/lib/commerce-types";

export function WalletTransactionTable({ transactions }: { transactions: WalletTransaction[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
          <tr><th className="p-4">Type</th><th className="p-4">Raison</th><th className="p-4">Date</th><th className="p-4 text-right">Montant</th></tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-t border-white/10">
              <td className="p-4 text-white">{tx.type}</td>
              <td className="p-4 text-slate-300">{tx.reason}</td>
              <td className="p-4 text-slate-500">{new Date(tx.createdAt).toLocaleString("fr-FR")}</td>
              <td className={`p-4 text-right ${tx.amount >= 0 ? "text-emerald-300" : "text-red-300"}`}>{tx.amount.toFixed(2)} {tx.currency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
