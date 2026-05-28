"use client";

import { ChevronRight, Loader2, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCatalogProducts, type CatalogProduct } from "@/lib/api";

const fallbackImages = {
  topup: "https://media.rawg.io/media/resize/640/-/screenshots/96a/96ab17437e722c8e22240923dfdfcdd0_ftUmkIh.jpg",
  gift: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=900&q=80"
};

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const isGift = params.slug === "carte-cadeau";
  const title = isGift ? "Cartes cadeaux" : "Top up jeux mobiles";

  useEffect(() => {
    setLoading(true);
    getCatalogProducts(36, { category: isGift ? "gift-card" : undefined })
      .then((payload) => setProducts(payload.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [isGift]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;

    return products.filter((product) => `${product.name} ${product.game}`.toLowerCase().includes(normalized));
  }, [products, query]);

  return (
    <main className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="mx-auto max-w-[1284px] px-6 py-11">
        <p className="text-sm text-[#697081]">Accueil / Boutique</p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#697081]">Catalogue branché sur l’API Laravel. Les produits restent achetables en mode préparation de commande, avant l’intégration paiement.</p>
          </div>
          <label className="flex h-11 min-w-[280px] items-center rounded-lg border border-[#e5e7eb] px-3">
            <Search className="mr-2 h-4 w-4 text-[#6d28d9]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Rechercher un produit" />
          </label>
        </div>

        <div className="mt-6 flex h-12 items-center gap-6 overflow-x-auto rounded-lg bg-[#f4f4f5] px-5 text-sm">
          <b>Trier par :</b>
          {["Popularité", "Plus récent", "Moins cher", "Plus cher"].map((item, index) => (
            <button key={item} className={`h-full px-2 font-bold ${index === 0 ? "border-b-2 border-black" : "text-[#697081]"}`}>{item}</button>
          ))}
        </div>

        {loading ? (
          <div className="grid h-80 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#6d28d9]" /></div>
        ) : (
          <div className="mt-9 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-6">
            {visibleProducts.map((product) => (
              <a href={`/product/${product.id}`} key={product.id} className="rounded-xl bg-white p-3 shadow-[0_8px_24px_rgba(17,24,39,.05)] transition hover:-translate-y-1">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-[#f8fafc]">
                  <img src={product.image_url ?? (isGift ? fallbackImages.gift : fallbackImages.topup)} alt={product.name} className="h-full w-full object-cover" />
                </div>
                <h2 className="mt-3 min-h-[44px] text-sm font-black leading-5 text-[#004bd6]">{product.name}</h2>
                <p className="mt-2 text-right text-sm font-black">{new Intl.NumberFormat("fr-FR").format(product.price)} {product.currency}</p>
              </a>
            ))}
          </div>
        )}

        <div className="mt-12 flex justify-center gap-4">
          <button className="rounded bg-[#0b55d9] px-3 py-2 font-bold text-white">1</button>
          <button className="flex items-center gap-1 px-3 py-2 font-bold">Page suivante <ChevronRight className="h-4 w-4" /></button>
        </div>
      </section>
      <Footer />
    </main>
  );
}
