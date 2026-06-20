"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { usePanelData } from "@/components/panel/panel-data";
import { MiniInfo, PageSection, productSearch } from "@/components/panel/panel-ui";

export default function PanelDeveloppeursPage() {
  const { products } = usePanelData();
  const [query, setQuery] = useState("");

  const visibleProducts = useMemo(() => productSearch(products, query), [products, query]);

  return (
    <div className="space-y-4">
      <PageSection title="Catalogue développeur" description="Vue exploitable du catalogue produit pour brancher votre intégration.">
        <label className="flex h-10 items-center rounded-[12px] border border-[#1a2231] bg-[#0c1221] px-3 text-slate-500 focus-within:border-[#7c4dff]">
          <Search className="mr-3 h-4 w-4" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-full flex-1 bg-transparent text-[12px] text-white outline-none" placeholder="Rechercher un produit..." />
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => (
            <article key={product.id} className="rounded-[14px] border border-[#1a2231] bg-[#0f1521] p-3">
              <div className="flex gap-3">
                {product.image_url ? <img src={product.image_url} alt="" className="h-14 w-14 rounded-[10px] object-cover" /> : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[10px] bg-[#7c4dff]/12 text-[10px] font-black text-[#b8a6ff]">API</div>}
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-[12px] font-bold leading-5 text-white">{product.name}</h3>
                  <p className="mt-1 text-[12px] text-[#a78bfa]">Dès {product.price} {product.currency}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{product.variations.length} variations</p>
                </div>
              </div>
            </article>
          ))}
          {!visibleProducts.length ? <p className="rounded-[12px] border border-[#1a2231] bg-[#0c1221] p-4 text-[12px] text-slate-500 sm:col-span-2 xl:col-span-3">Aucun produit trouvé.</p> : null}
        </div>
      </PageSection>

      <section className="grid gap-4 xl:grid-cols-3">
        <MiniInfo label="Produits visibles" value={String(products.length)} />
        <MiniInfo label="Recherche active" value={query || "Aucune"} />
        <MiniInfo label="Variations" value={String(products.reduce((total, product) => total + product.variations.length, 0))} />
      </section>
    </div>
  );
}