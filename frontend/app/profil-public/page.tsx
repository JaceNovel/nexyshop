import type { Metadata } from "next";
import { ProfilPublicClient } from "./profil-public-client";

export const metadata: Metadata = {
  title: "Profil public | Astral4Gamer",
  description: "Recherchez un joueur par son ID Astral4Gamer pour consulter ses statistiques et ses réalisations publiques."
};

export default function ProfilPublicPage() {
  return <ProfilPublicClient />;
}

