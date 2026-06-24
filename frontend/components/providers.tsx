"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { DiscordFollowPopup } from "@/components/discord-follow-popup";
import { CartDrawer } from "@/components/cart-drawer";
import { CartProvider } from "@/components/cart-provider";
import { LanguageProvider } from "@/components/language-provider";
import { PreferenceDialog } from "@/components/preference-dialog";
import { GoogleAvatarSync } from "@/components/google-avatar-sync";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => {
        registration.update().catch(() => undefined);
      }).catch(() => undefined);
    }
  }, []);

  return (
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <CartProvider>
          <GoogleAvatarSync />
          {children}
          <PreferenceDialog />
          <CartDrawer />
          <DiscordFollowPopup />
        </CartProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
