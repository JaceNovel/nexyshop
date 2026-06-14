import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { DuelPageClient } from "./duel-page-client";

export const metadata: Metadata = {
  title: "DUEL 1V1 DIAMANTS | Astral4Gamer",
  description: "Créez ou rejoignez des duels 1v1 Free Fire et remportez jusqu'à 3x votre mise en Diamants."
};

export default function DuelPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#0b1220]">
      <SiteHeader />
      <DuelPageClient />
    </main>
  );
}
