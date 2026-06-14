import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { PubgClient } from "../pubg-client";

export const metadata: Metadata = { title: "Comparateur PUBG" };

export default function PubgComparePage() {
  return <main className="min-h-screen bg-[#f7f8fb] text-[#111827]"><SiteHeader /><PubgClient view="compare" /></main>;
}
