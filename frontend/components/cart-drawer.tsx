"use client";

import { useUser } from "@clerk/nextjs";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/components/language-provider";

export function CartDrawer() {
  const { isLoaded, user } = useUser();
  const { items, isOpen, closeCart, removeItem, updateQuantity, clearCart } = useCart();
  const { language, currency, formatMoney, convertMoney } = useLanguage();
  const labels = language === "fr" ? {
    title: "Mon panier",
    empty: "Ton panier est vide",
    emptyHint: "Ajoute une recharge ou une carte cadeau pour la retrouver ici.",
    continue: "Continuer mes achats",
    total: "Total estimé",
    clear: "Vider",
    checkout: "Finaliser cet article",
    checkoutHint: "Chaque article est validé séparément afin de vérifier le bon compte joueur et garantir la livraison.",
    close: "Fermer le panier",
    remove: "Supprimer"
  } : {
    title: "My cart",
    empty: "Your cart is empty",
    emptyHint: "Add a top-up or gift card to find it here.",
    continue: "Continue shopping",
    total: "Estimated total",
    clear: "Clear",
    checkout: "Checkout this item",
    checkoutHint: "Each item is validated separately to verify the correct player account and guarantee delivery.",
    close: "Close cart",
    remove: "Remove"
  };

  if (!isOpen) return null;

  const total = items.reduce((result, item) => result + convertMoney(item.unitPrice * item.quantity, item.currency), 0);

  function requireCustomerSession(target: string) {
    if (!isLoaded) return false;

    if (!user?.id) {
      closeCart();
      window.location.href = `/connexion?redirect=${encodeURIComponent(target)}`;
      return false;
    }

    return true;
  }

  return (
    <div className="fixed inset-0 z-[150] bg-black/45 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={labels.title} onClick={closeCart}>
      <aside className="ml-auto flex h-[100dvh] w-full max-w-[430px] flex-col bg-white shadow-[-24px_0_70px_rgba(15,23,42,.22)]" onClick={(event) => event.stopPropagation()}>
        <header className="flex min-h-16 items-center justify-between border-b border-[#edf0f4] px-4 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#eff6ff] text-[#0b55d9]"><ShoppingBag className="h-5 w-5" /></span>
            <div>
              <h2 className="text-lg font-black text-[#111827]">{labels.title}</h2>
              <p className="text-xs text-[#667085]">{items.length} article{items.length > 1 ? "s" : ""}</p>
            </div>
          </div>
          <button type="button" onClick={closeCart} className="interactive-icon grid h-10 w-10 place-items-center rounded-full hover:bg-[#f4f4f5]" aria-label={labels.close}><X className="h-5 w-5" /></button>
        </header>

        {items.length ? (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4">
              {items.map((item) => {
                const params = new URLSearchParams({
                  cart: item.key,
                  variation: item.variationKey || item.variationId || "",
                  quantity: String(item.quantity),
                  checkout: "1"
                });
                const checkoutHref = `/product/${item.productId}?${params}`;

                return (
                  <article key={item.key} className="rounded-lg border border-[#e7eaf0] bg-white p-3 shadow-[0_8px_22px_rgba(16,24,40,.05)]">
                    <div className="flex gap-3">
                      <a href={`/product/${item.productId}`} onClick={closeCart} className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f8fafc] p-1.5">
                        <img src={item.imageUrl} alt="" className="h-full w-full object-contain" />
                      </a>
                      <div className="min-w-0 flex-1">
                        <a href={`/product/${item.productId}`} onClick={closeCart} className="line-clamp-2 text-sm font-bold leading-5 text-[#111827] hover:text-[#0b55d9]">{item.productName}</a>
                        <p className="mt-1 line-clamp-1 text-xs text-[#667085]">{item.variationName}{item.region ? ` · ${item.region}` : ""}</p>
                        <p className="mt-2 text-sm font-semibold text-[#e52b2f]">{formatMoney(item.unitPrice, item.currency)}</p>
                      </div>
                      <button type="button" onClick={() => removeItem(item.key)} className="interactive-icon grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#98a2b3] hover:bg-red-50 hover:text-[#e52b2f]" aria-label={labels.remove}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#edf0f4] pt-3">
                      <div className="flex h-10 items-center rounded-lg bg-[#f4f4f5]">
                        <button type="button" onClick={() => updateQuantity(item.key, item.quantity - 1)} className="interactive-icon grid h-10 w-10 place-items-center" aria-label="-"><Minus className="h-4 w-4" /></button>
                        <span className="min-w-7 text-center text-sm font-bold">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.key, item.quantity + 1)} className="interactive-icon grid h-10 w-10 place-items-center" aria-label="+"><Plus className="h-4 w-4" /></button>
                      </div>
                      <a
                        href={checkoutHref}
                        onClick={(event) => {
                          if (!requireCustomerSession(checkoutHref)) {
                            event.preventDefault();
                            return;
                          }

                          closeCart();
                        }}
                        className="interactive-button inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-[#0b55d9] px-3 text-center text-xs font-bold text-white"
                      >
                        {labels.checkout}
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
            <footer className="border-t border-[#e7eaf0] bg-white p-4 shadow-[0_-12px_32px_rgba(16,24,40,.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-[#667085]">{labels.total}</p>
                  <p className="text-lg font-black text-[#111827]">{formatMoney(total, currency)}</p>
                </div>
                <button type="button" onClick={clearCart} className="text-xs font-semibold text-[#e52b2f] hover:underline">{labels.clear}</button>
              </div>
              <p className="mt-3 rounded-lg bg-[#f8fafc] px-3 py-2 text-[11px] leading-5 text-[#667085]">{labels.checkoutHint}</p>
            </footer>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div>
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#f4f4f5] text-[#98a2b3]"><ShoppingBag className="h-9 w-9" /></span>
              <h3 className="mt-5 text-lg font-black text-[#111827]">{labels.empty}</h3>
              <p className="mx-auto mt-2 max-w-[280px] text-sm leading-6 text-[#667085]">{labels.emptyHint}</p>
              <button type="button" onClick={closeCart} className="interactive-button mt-5 h-11 rounded-lg bg-[#0b55d9] px-5 text-sm font-bold text-white">{labels.continue}</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
