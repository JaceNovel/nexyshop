import { Crown, Sparkles } from "lucide-react";
import type { VipLevelName } from "@/lib/commerce-types";
import { vipLevels } from "@/lib/commerce-mock";

export function VipProgressCard({
  currentLevel,
  orders,
  spend
}: {
  currentLevel: VipLevelName;
  orders: number;
  spend: number;
}) {
  const currentIndex = vipLevels.findIndex((level) => level.name === currentLevel);
  const current = vipLevels[currentIndex] ?? vipLevels[0];
  const next = vipLevels[currentIndex + 1] ?? current;
  const orderProgress = Math.min(100, Math.round((orders / Math.max(1, next.minOrders)) * 100));
  const spendProgress = Math.min(100, Math.round((spend / Math.max(1, next.minSpend)) * 100));
  const progress = Math.max(orderProgress, spendProgress);

  return (
    <section className="rounded-3xl border border-white/10 bg-[#0b1120] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,.28)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-violet-300">Programme VIP</p>
          <h2 className="mt-2 flex items-center gap-2 text-3xl font-semibold">
            <Crown className="h-7 w-7 text-amber-300" />
            {current.name}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {current.cashbackPercent}% cashback et {current.discountPercent}% remise automatique.
          </p>
        </div>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
          {orders} commandes · {spend.toFixed(2)} USD depenses
        </span>
      </div>
      <div className="mt-6">
        <div className="flex justify-between text-sm text-slate-400">
          <span>Progression vers {next.name}</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-violet-500 to-blue-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {current.perks.map((perk) => (
          <div key={perk} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-200">
            <Sparkles className="h-4 w-4 text-violet-300" />
            {perk}
          </div>
        ))}
      </div>
    </section>
  );
}
