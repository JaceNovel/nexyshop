"use client";

import { useState } from "react";
import { Gift, X } from "lucide-react";
import type { Product } from "@/lib/commerce-types";

export function GiftProductModal({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08] active:scale-[.98]">
        <Gift className="h-4 w-4" />
        Offrir ce produit
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0b1120] p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Offrir {product.name}</h2>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <form className="mt-5 grid gap-3" onSubmit={(event) => { event.preventDefault(); setDone(true); }}>
              <input className="h-12 rounded-xl border border-white/10 bg-[#070d19] px-4 outline-none focus:border-red-400" placeholder="ID ou pseudo de l'ami" />
              <input className="h-12 rounded-xl border border-white/10 bg-[#070d19] px-4 outline-none focus:border-red-400" placeholder="Email ou WhatsApp optionnel" />
              <textarea className="min-h-24 rounded-xl border border-white/10 bg-[#070d19] px-4 py-3 outline-none focus:border-red-400" placeholder="Message cadeau optionnel" />
              <button className="h-12 rounded-xl bg-red-600 font-semibold transition hover:bg-red-500 active:scale-[.98]">Preparer le cadeau</button>
            </form>
            {done ? <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">Carte cadeau preparee. Elle sera liee a la commande apres paiement.</div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
