"use client";

import { useState } from "react";
import { BadgePercent } from "lucide-react";
import type { Product } from "@/lib/commerce-types";

export function PriceComparisonCard({ product }: { product: Product }) {
  const [sent, setSent] = useState(false);
  const saving = product.officialPrice ? product.officialPrice - product.price : 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-white">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400/15 text-amber-200"><BadgePercent className="h-5 w-5" /></span>
        <div>
          <h2 className="text-xl font-semibold">Meilleur prix garanti</h2>
          <p className="text-sm text-slate-400">Prix Astral: {product.price.toFixed(2)} {product.currency}{saving > 0 ? ` · Economie estimee ${saving.toFixed(2)} ${product.currency}` : ""}</p>
        </div>
      </div>
      <form className="mt-5 grid gap-3 sm:grid-cols-3" onSubmit={(event) => { event.preventDefault(); setSent(true); }}>
        <input className="h-12 rounded-xl border border-white/10 bg-[#070d19] px-4 outline-none focus:border-violet-400" placeholder="Lien concurrent" />
        <input className="h-12 rounded-xl border border-white/10 bg-[#070d19] px-4 outline-none focus:border-violet-400" placeholder="Prix vu" />
        <button className="h-12 rounded-xl bg-violet-600 px-4 text-sm font-semibold transition hover:bg-violet-500 active:scale-[.98]">Envoyer</button>
      </form>
      {sent ? <p className="mt-3 text-sm text-emerald-200">Demande envoyee. Si elle est validee, un coupon special sera prepare.</p> : null}
    </section>
  );
}
