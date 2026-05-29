import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Providers } from "@/components/providers";

const brandLogo = "/ChatGPT_Image_28_mai_2026__20_26_02-removebg-preview.png";
const favicon = "/favicon.svg";

export const metadata: Metadata = {
  title: {
    default: "Astral4Gamer",
    template: "%s | Astral4Gamer"
  },
  description: "Plateforme premium pour boutique gaming, tournois Free Fire, lives, guildes et récompenses.",
  metadataBase: new URL("https://astral4gamer.com"),
  applicationName: "Astral4Gamer",
  icons: {
    icon: [{ url: favicon, type: "image/svg+xml" }],
    shortcut: [{ url: favicon, type: "image/svg+xml" }],
    apple: [{ url: favicon, type: "image/svg+xml" }]
  },
  openGraph: {
    title: "Astral4Gamer",
    description: "Gaming, live, tournois et récompenses.",
    type: "website",
    siteName: "Astral4Gamer",
    images: [
      {
        url: brandLogo,
        width: 611,
        height: 286,
        alt: "Astral4Gamer"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Astral4Gamer",
    description: "Gaming, live, tournois et récompenses.",
    images: [brandLogo]
  }
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Astral4Gamer",
  url: "https://astral4gamer.com",
  logo: `https://astral4gamer.com${brandLogo}`
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <ClerkProvider>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
