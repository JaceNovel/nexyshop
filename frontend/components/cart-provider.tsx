"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  key: string;
  productId: number;
  productName: string;
  imageUrl: string;
  variationId?: string | null;
  variationKey?: string;
  variationName: string;
  region?: string;
  unitPrice: number;
  currency: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "key">) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const cartStorageKey = "astral4gamer_cart";

function cartItemKey(item: Pick<CartItem, "productId" | "variationId" | "variationKey" | "region">) {
  return [item.productId, item.variationId || item.variationKey || "default", item.region || "global"].join(":");
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(cartStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(cartStorageKey, JSON.stringify(items));
  }, [hydrated, items]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const addItem = useCallback((item: Omit<CartItem, "key">) => {
    const key = cartItemKey(item);
    setItems((current) => {
      const existing = current.find((entry) => entry.key === key);
      if (!existing) return [...current, { ...item, key, quantity: Math.max(1, item.quantity) }];
      return current.map((entry) => entry.key === key
        ? { ...entry, quantity: entry.quantity + Math.max(1, item.quantity) }
        : entry);
    });
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem,
    removeItem: (key) => setItems((current) => current.filter((item) => item.key !== key)),
    updateQuantity: (key, quantity) => setItems((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, quantity) } : item)),
    clearCart: () => setItems([])
  }), [addItem, isOpen, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
