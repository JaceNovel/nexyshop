import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Astral4Gamer - Gaming, Esport & Diamonds",
  description: "Plateforme premium pour boutique gaming, tournois Free Fire, lives, guildes et récompenses.",
  metadataBase: new URL("https://astral4gamer.com"),
  openGraph: {
    title: "Astral4Gamer",
    description: "Gaming, live, tournois et récompenses.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ClerkProvider>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
