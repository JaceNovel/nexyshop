"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function GoogleCallbackClient() {
  const params = useSearchParams();
  const router = useRouter();
  const error = params.get("error");
  const token = params.get("token");
  const name = params.get("name");
  const avatar = params.get("avatar");
  const connected = useMemo(() => Boolean(token && !error), [token, error]);

  useEffect(() => {
    if (!token || error) return;
    localStorage.setItem("nexy_sanctum_token", token);
    if (name) localStorage.setItem("nexy_google_name", name);
    if (avatar) localStorage.setItem("nexy_google_avatar", avatar);
    const timer = window.setTimeout(() => router.replace("/profil"), 900);
    return () => window.clearTimeout(timer);
  }, [avatar, error, name, router, token]);

  return (
    <div className="w-full rounded-lg border border-[#ececf3] bg-[#fbfbff] p-6 text-center">
      {connected ? (
        <>
          <CheckCircle2 className="mx-auto h-10 w-10 text-[#6d28d9]" />
          <h1 className="mt-4 text-2xl font-black">Compte Google connecte</h1>
          <p className="mt-2 text-sm leading-6 text-[#5b6170]">Connexion securisee terminee. Redirection vers ton profil.</p>
        </>
      ) : (
        <>
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-2xl font-black">Connexion Google impossible</h1>
          <p className="mt-2 text-sm leading-6 text-[#5b6170]">{error ?? "Aucun token recu depuis Laravel."}</p>
          <a href="/connexion" className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#111827] px-4 text-sm font-black text-white">Revenir</a>
        </>
      )}
    </div>
  );
}
