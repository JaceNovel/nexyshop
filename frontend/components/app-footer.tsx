"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/site-footer";

const hiddenFooterPrefixes = ["/profil", "/profil-public", "/profile"];

export function AppFooter() {
  const pathname = usePathname();

  if (hiddenFooterPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  return <Footer />;
}
