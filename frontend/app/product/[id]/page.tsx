"use client";

import { CheckCircle2, Loader2, Minus, Plus, Shield, Star, Truck } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { createGuestOrder, getCatalogProduct, initiateMonerooPayment, type CatalogProduct, verifyGameUid } from "@/lib/api";

const fallbackProduct: CatalogProduct = {
  id: 1,
  name: "Free Fire Diamonds",
  game: "Free Fire",
  sku: "FF-110D",
  price: 1000,
  currency: "XOF",
  image_url: "https://media.rawg.io/media/resize/900/-/screenshots/96a/96ab17437e722c8e22240923dfdfcdd0_ftUmkIh.jpg",
  supplier: "internal",
  delivery: "automatic",
  requires_uid: true,
  amounts: ["110 Diamants", "310 Diamants", "520 Diamants", "1060 Diamants"]
};

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<CatalogProduct>(fallbackProduct);
  const [recommended, setRecommended] = useState<CatalogProduct[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [gameUid, setGameUid] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "verified" | "ordered" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!params.id || Number.isNaN(Number(params.id))) return;

    getCatalogProduct(params.id)
      .then((payload) => {
        setProduct(payload.data);
        setRecommended(payload.recommended);
      })
      .catch(() => setMessage("Produit de démonstration affiché, API produit indisponible."));
  }, [params.id]);

  const amounts = useMemo(() => product.amounts?.length ? product.amounts : [product.name], [product]);
  const total = product.price * quantity;

  async function verifyUid() {
    if (!gameUid.trim()) {
      setMessage("Entre ton ID joueur avant la vérification.");
      return;
    }

    setStatus("loading");
    try {
      const result = await verifyGameUid(product.game, gameUid.trim());
      setNickname(result.nickname);
      setStatus("verified");
      setMessage("Joueur vérifié. Tu peux préparer la commande.");
    } catch {
      setStatus("error");
      setMessage("Vérification impossible pour le moment.");
    }
  }

  async function prepareOrder() {
    if (!nickname.trim() || !gameUid.trim()) {
      setMessage("Vérifie l’ID joueur avant de préparer la commande.");
      return;
    }

    setStatus("loading");
    try {
      if (!email.trim() || !firstName.trim() || !lastName.trim()) {
        setMessage("Renseigne email, prénom et nom pour ouvrir le paiement Moneroo.");
        setStatus("error");
        return;
      }

      const orderPayload = await createGuestOrder({
        product_id: product.id,
        variation_id: product.variation_id,
        game_uid: gameUid.trim(),
        nickname: nickname.trim(),
        quantity
      });
      const payment = await initiateMonerooPayment({
        order_id: orderPayload.order.id,
        customer: {
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || undefined
        }
      });
      setStatus("ordered");
      setMessage("Paiement initialisé. Redirection vers Moneroo...");
      window.location.href = payment.checkout_url;
    } catch {
      setStatus("error");
      setMessage("Impossible de préparer la commande.");
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="mx-auto grid max-w-[1500px] gap-8 px-6 py-10 lg:grid-cols-[390px_minmax(0,1fr)]">
        <div>
          <img src={product.image_url ?? fallbackProduct.image_url ?? ""} alt={product.name} className="aspect-square w-full rounded-lg object-cover shadow-[0_14px_34px_rgba(17,24,39,.08)]" />
          <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs font-bold">
            <span className="rounded-lg bg-[#f5f3ff] p-3 text-[#6d28d9]"><Shield className="mx-auto mb-1 h-5 w-5" />Garantie</span>
            <span className="rounded-lg bg-[#f5f3ff] p-3 text-[#6d28d9]"><Truck className="mx-auto mb-1 h-5 w-5" />Livraison</span>
            <span className="rounded-lg bg-[#f5f3ff] p-3 text-[#6d28d9]"><Star className="mx-auto mb-1 h-5 w-5" />Fiable</span>
          </div>
        </div>

        <div>
          <p className="text-sm text-[#697081]">Accueil / Boutique / {product.game}</p>
          <h1 className="mt-3 text-3xl font-black">{product.name}</h1>
          <p className="mt-2 text-sm text-[#697081]">SKU : {product.sku ?? "NEXY"} • Fournisseur : {product.supplier}</p>

          <section className="mt-7 rounded-lg border border-[#ececf3] p-5">
            <h2 className="text-sm font-black uppercase">Sélection</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {amounts.map((amount, index) => (
                <button key={amount} className={`rounded-lg border px-4 py-2 text-sm font-black ${index === 0 ? "border-[#6d28d9] bg-[#f5f3ff] text-[#6d28d9]" : "border-[#e5e7eb]"}`}>
                  {amount}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase">ID joueur</span>
                <input value={gameUid} onChange={(event) => setGameUid(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-[#e5e7eb] px-4 outline-none focus:border-[#6d28d9]" placeholder="Ex : 123456789" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase">Pseudo vérifié</span>
                <input value={nickname} onChange={(event) => setNickname(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-[#e5e7eb] px-4 outline-none focus:border-[#6d28d9]" placeholder="NEXY_123456789" />
              </label>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase">Email paiement</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-[#e5e7eb] px-4 outline-none focus:border-[#6d28d9]" placeholder="client@example.com" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase">Téléphone</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-[#e5e7eb] px-4 outline-none focus:border-[#6d28d9]" placeholder="+221770000000" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase">Prénom</span>
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-[#e5e7eb] px-4 outline-none focus:border-[#6d28d9]" placeholder="John" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase">Nom</span>
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-[#e5e7eb] px-4 outline-none focus:border-[#6d28d9]" placeholder="Doe" />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button onClick={verifyUid} disabled={status === "loading"} className="h-11 rounded-lg border border-[#6d28d9] px-5 text-sm font-black text-[#6d28d9] disabled:opacity-60">
                Vérifier ID
              </button>
              <div className="flex h-11 items-center rounded-lg bg-[#f4f4f5] px-3">
                <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuer"><Minus className="h-4 w-4" /></button>
                <span className="mx-4 font-black">{quantity}</span>
                <button onClick={() => setQuantity((value) => value + 1)} aria-label="Augmenter"><Plus className="h-4 w-4" /></button>
              </div>
              <b className="text-xl">{new Intl.NumberFormat("fr-FR").format(total)} {product.currency}</b>
            </div>

            {message && <p className={`mt-4 rounded-lg p-3 text-sm font-semibold ${status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</p>}

            <button onClick={prepareOrder} disabled={status === "loading"} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#6d28d9] text-sm font-black text-white disabled:opacity-60">
              {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Payer avec Moneroo
            </button>
          </section>

          <section className="mt-7 rounded-lg bg-[#f8fafc] p-5">
            <h2 className="text-sm font-black uppercase">Description</h2>
            <p className="mt-3 text-sm leading-7 text-[#4b5563]">
              {product.description ?? `Recharge ${product.game} rapide et sécurisée. Le paiement réel sera intégré dans l’étape suivante, après validation du parcours commande.`}
            </p>
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 pb-12">
        <h2 className="mb-4 text-lg font-black">Produits recommandés</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {(recommended.length ? recommended : [fallbackProduct]).map((item) => (
            <a key={item.id} href={`/product/${item.id}`} className="rounded-lg border border-[#ececf3] p-3">
              <img src={item.image_url ?? fallbackProduct.image_url ?? ""} alt="" className="aspect-square rounded object-cover" />
              <b className="mt-3 block text-sm">{item.name}</b>
              <small className="text-[#697081]">{item.price} {item.currency}</small>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
