import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { GoogleCallbackClient } from "./google-callback-client";

export default function GoogleCallbackPage() {
  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />
      <section className="mx-auto grid min-h-[calc(100vh-160px)] max-w-[760px] place-items-center px-6 py-12">
        <Suspense fallback={<div className="rounded-lg border border-[#ececf3] bg-[#fbfbff] p-6 text-sm font-bold">Connexion Google en cours...</div>}>
          <GoogleCallbackClient />
        </Suspense>
      </section>
    </main>
  );
}
