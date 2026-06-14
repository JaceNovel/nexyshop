import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { PubgClient } from "../pubg-client";

export const metadata: Metadata = { title: "Classement TOP 500 PUBG" };

export default function PubgLeaderboardPage() {
  return <main className="min-h-screen bg-[#f7f8fb] text-[#111827]"><SiteHeader /><PubgClient view="leaderboard" /></main>;
}
