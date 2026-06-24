"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { livePurchases } from "@/lib/commerce-mock";

export function LivePurchaseToast() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!livePurchases.length) return;
    const tick = () => {
      setIndex((current) => (current + 1) % livePurchases.length);
      setVisible(true);
      window.setTimeout(() => setVisible(false), 5200);
    };
    const first = window.setTimeout(tick, 2200);
    const interval = window.setInterval(tick, 11000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, []);

  const item = livePurchases[index];
  if (!item) return null;

  return (
    <div className={`fixed bottom-24 left-4 z-40 max-w-[320px] transition duration-300 md:bottom-6 ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"}`}>
      <div className="rounded-2xl border border-white/10 bg-[#080d19]/95 p-4 text-white shadow-[0_18px_70px_rgba(0,0,0,.35)] backdrop-blur-xl">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-200">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Achat en direct</p>
            <p className="mt-1 text-sm leading-5 text-slate-200">
              <b className="font-semibold text-white">{item.name}</b> {item.verb} <b className="font-semibold text-white">{item.product}</b>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
