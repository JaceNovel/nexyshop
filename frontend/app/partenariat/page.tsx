import type { Metadata } from "next";
import { PartenariatClient } from "./partenariat-client";

export const metadata: Metadata = {
  title: "Partenariat",
  description: "Devenez partenaire Astral4Gamer: créateurs de contenu, revendeurs, sponsors et organisateurs."
};

export default function PartenariatPage() {
  return <PartenariatClient />;
}
