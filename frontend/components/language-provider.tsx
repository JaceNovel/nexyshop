"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type SiteLanguage = "fr" | "en";
export type DisplayCurrency = "USD" | "EUR" | "XOF";

const currencyStorageKey = "astral4gamer_currency";
const preferenceStorageKey = "astral4gamer_preferences_done";
const usdRates: Record<DisplayCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  XOF: 610
};

const translations = {
  fr: {
    search: "Rechercher...",
    quickResults: "Résultats rapides",
    seeAll: "Voir tout",
    noProduct: "Aucun produit trouvé",
    tryAnother: "Essaie un autre mot-clé.",
    searching: "Recherche...",
    home: "Accueil",
    gameCredits: "Crédits de jeu",
    giftCards: "Cartes cadeaux",
    live: "Live Direct",
    tournaments: "Tournois",
    duel: "Duel 1V1",
    community: "Communauté",
    publicProfile: "Profil public",
    partnership: "Partenariat",
    upcoming: "Jeux à venir",
    blog: "Blog",
    language: "Langue",
    cart: "Panier",
    notifications: "Notifications",
    messages: "Messages Astral4Gamer",
    offers: "Offres Astral4Gamer : recharges, cartes cadeaux et tournois.",
    addToCart: "Ajouter au panier",
    addedToCart: "Ajouté au panier",
    payNow: "Acheter maintenant"
  },
  en: {
    search: "Search...",
    quickResults: "Quick results",
    seeAll: "See all",
    noProduct: "No product found",
    tryAnother: "Try another keyword.",
    searching: "Searching...",
    home: "Home",
    gameCredits: "Game Credits",
    giftCards: "Gift Cards",
    live: "Live",
    tournaments: "Tournaments",
    duel: "1V1 Duel",
    community: "Community",
    publicProfile: "Public profile",
    partnership: "Partnership",
    upcoming: "Upcoming games",
    blog: "Blog",
    language: "Language",
    cart: "Cart",
    notifications: "Notifications",
    messages: "Astral4Gamer messages",
    offers: "Astral4Gamer offers: top-ups, gift cards and tournaments.",
    addToCart: "Add to cart",
    addedToCart: "Added to cart",
    payNow: "Buy now"
  }
} as const;

type TranslationKey = keyof typeof translations.fr;
type LanguageContextValue = {
  language: SiteLanguage;
  locale: string;
  currency: DisplayCurrency;
  currencyLabel: string;
  hasCompletedPreferences: boolean;
  setLanguage: (language: SiteLanguage) => void;
  setCurrency: (currency: DisplayCurrency) => void;
  completePreferences: (language: SiteLanguage, currency: DisplayCurrency) => void;
  formatMoney: (value: number, sourceCurrency?: string, options?: { unavailableLabel?: string; prefix?: string }) => string;
  convertMoney: (value: number, sourceCurrency?: string) => number;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const languageStorageKey = "astral4gamer_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SiteLanguage>("fr");
  const [currency, setCurrencyState] = useState<DisplayCurrency>("USD");
  const [hasCompletedPreferences, setHasCompletedPreferences] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(languageStorageKey);
    const storedCurrency = localStorage.getItem(currencyStorageKey);
    const preferred = stored === "en" || stored === "fr"
      ? stored
      : navigator.language.toLowerCase().startsWith("en") ? "en" : "fr";

    setLanguageState(preferred);
    setCurrencyState(storedCurrency === "EUR" || storedCurrency === "XOF" || storedCurrency === "USD" ? storedCurrency : "USD");
    setHasCompletedPreferences(localStorage.getItem(preferenceStorageKey) === "1");
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: language === "fr" ? "fr-FR" : "en-US",
    currency,
    currencyLabel: currency === "XOF" ? "FCFA" : currency,
    hasCompletedPreferences,
    setLanguage(nextLanguage) {
      setLanguageState(nextLanguage);
      localStorage.setItem(languageStorageKey, nextLanguage);
    },
    setCurrency(nextCurrency) {
      setCurrencyState(nextCurrency);
      localStorage.setItem(currencyStorageKey, nextCurrency);
    },
    completePreferences(nextLanguage, nextCurrency) {
      setLanguageState(nextLanguage);
      setCurrencyState(nextCurrency);
      setHasCompletedPreferences(true);
      localStorage.setItem(languageStorageKey, nextLanguage);
      localStorage.setItem(currencyStorageKey, nextCurrency);
      localStorage.setItem(preferenceStorageKey, "1");
    },
    convertMoney(value, sourceCurrency = "USD") {
      return convertMoney(value, sourceCurrency, currency);
    },
    formatMoney(value, sourceCurrency = "USD", options = {}) {
      const converted = convertMoney(value, sourceCurrency, currency);
      const unavailableLabel = options.unavailableLabel ?? (language === "fr" ? "Prix indisponible" : "Price unavailable");

      if (!Number.isFinite(converted) || converted <= 0) return unavailableLabel;

      const maximumFractionDigits = currency === "XOF" ? 0 : 2;
      const formatted = new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US", {
        minimumFractionDigits: currency === "XOF" ? 0 : 0,
        maximumFractionDigits
      }).format(converted);

      return `${options.prefix ?? ""}${formatted} ${currency === "XOF" ? "FCFA" : currency}`;
    },
    t(key) {
      return translations[language][key];
    }
  }), [currency, hasCompletedPreferences, language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}

function convertMoney(value: number, sourceCurrency: string, targetCurrency: DisplayCurrency) {
  const normalizedSource = normalizeCurrency(sourceCurrency);
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const sourceUsdRate = usdRates[normalizedSource] ?? usdRates.USD;
  const targetUsdRate = usdRates[targetCurrency] ?? usdRates.USD;

  return (amount / sourceUsdRate) * targetUsdRate;
}

function normalizeCurrency(currency: string): DisplayCurrency {
  const upper = currency.toUpperCase();

  if (upper === "EUR") return "EUR";
  if (upper === "XOF" || upper === "FCFA" || upper === "XAF") return "XOF";

  return "USD";
}
