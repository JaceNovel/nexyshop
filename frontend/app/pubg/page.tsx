import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { PubgClient } from "./pubg-client";

export const metadata: Metadata = {
  title: "PUBG Hub",
  description: "Dashboard PUBG Astral4Gamer: profil, stats, matchs et outils compétitifs."
};

export default function PubgPage() {
  return <main className="min-h-screen bg-[#f7f8fb] text-[#111827]"><SiteHeader /><PubgClient view="dashboard" /></main>;
}
