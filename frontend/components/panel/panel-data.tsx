"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_BASE_URL } from "@/lib/api";
import type {
  PanelApiKey,
  PanelDocumentation,
  PanelOrder,
  PanelOverview,
  PanelPartner,
  PanelProduct,
  PanelStats,
  PanelTopupCustomer,
  PanelTransaction
} from "@/components/panel/panel-types";

type PanelDataContextValue = {
  token: string | null;
  partner: PanelPartner | null;
  products: PanelProduct[];
  apiKeys: { sandbox: PanelApiKey | null; live: PanelApiKey | null };
  stats: PanelStats | null;
  recentOrders: PanelOrder[];
  recentTransactions: PanelTransaction[];
  documentation: PanelDocumentation | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
  initiateTopup: (amount: number, customer: PanelTopupCustomer) => Promise<{ ok: boolean; message?: string }>;
  regenerateLiveKey: () => Promise<{ ok: boolean; key?: string; message?: string }>;
};

const PanelDataContext = createContext<PanelDataContextValue | null>(null);

export function PanelDataProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [partner, setPartner] = useState<PanelPartner | null>(null);
  const [products, setProducts] = useState<PanelProduct[]>([]);
  const [apiKeys, setApiKeys] = useState<{ sandbox: PanelApiKey | null; live: PanelApiKey | null }>({ sandbox: null, live: null });
  const [stats, setStats] = useState<PanelStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<PanelOrder[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<PanelTransaction[]>([]);
  const [documentation, setDocumentation] = useState<PanelDocumentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useMemo(
    () => ({
      Accept: "application/json",
      Authorization: `Bearer ${token ?? ""}`
    }),
    [token]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem("astral_reseller_token");
    if (!storedToken) {
      window.location.href = "/panel/login";
      return;
    }
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token) return;
    void refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function refresh() {
    if (!token) return;

    setIsLoading(true);

    try {
      const [overviewResponse, productResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/reseller/panel/overview`, { headers: authHeaders, cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/reseller/v1/products?per_page=120`, { headers: authHeaders, cache: "no-store" })
      ]);

      if (!overviewResponse.ok || !productResponse.ok) {
        throw new Error("Session reseller expirée.");
      }

      const overview: PanelOverview = await overviewResponse.json();
      const catalog = await productResponse.json();
      setPartner(overview.partner);
      setProducts(catalog.data ?? []);
      setApiKeys({
        sandbox: overview.api_keys?.sandbox ?? null,
        live: overview.api_keys?.live ?? null
      });
      setStats(overview.stats ?? null);
      setRecentOrders(overview.recent_orders ?? []);
      setRecentTransactions(overview.recent_transactions ?? []);
      setDocumentation(overview.documentation ?? null);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("astral_reseller_token");
    localStorage.removeItem("astral_reseller_partner");
    window.location.href = "/panel/login";
  }

  async function initiateTopup(amount: number, customer: PanelTopupCustomer) {
    const response = await fetch(`${API_BASE_URL}/api/reseller/panel/topup`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, customer })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, message: payload.message ?? "Recharge impossible." };
    }

    if (payload.checkout_url) {
      window.location.href = payload.checkout_url;
    }

    return { ok: true };
  }

  async function regenerateLiveKey() {
    const response = await fetch(`${API_BASE_URL}/api/reseller/panel/api-keys/live`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" }
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, message: payload.message ?? "Impossible de regénérer la clé live." };
    }

    await refresh();

    return {
      ok: true,
      key: payload.live_key?.key
    };
  }

  return (
    <PanelDataContext.Provider
      value={{
        token,
        partner,
        products,
        apiKeys,
        stats,
        recentOrders,
        recentTransactions,
        documentation,
        isLoading,
        refresh,
        logout,
        initiateTopup,
        regenerateLiveKey
      }}
    >
      {children}
    </PanelDataContext.Provider>
  );
}

export function usePanelData() {
  const context = useContext(PanelDataContext);

  if (!context) {
    throw new Error("usePanelData must be used inside PanelDataProvider.");
  }

  return context;
}