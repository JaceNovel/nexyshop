"use client";

import { Chrome } from "lucide-react";
import { googleRedirectUrl } from "@/lib/api";

export function GoogleAuthButton({ label = "Continuer avec Google" }: { label?: string }) {
  return (
    <a
      href={googleRedirectUrl()}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#d7dce5] bg-white px-4 text-sm font-black text-[#111827] shadow-[0_8px_24px_rgba(17,24,39,.06)] transition hover:border-[#6d28d9] hover:text-[#6d28d9]"
    >
      <Chrome className="h-4 w-4" />
      {label}
    </a>
  );
}
