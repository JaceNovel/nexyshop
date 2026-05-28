import { SignUp } from "@clerk/nextjs";
import { SiteHeader } from "@/components/site-header";
import { GoogleAuthButton } from "@/components/google-auth-button";

export default function InscriptionPage() {
  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <SiteHeader />
      <section className="mx-auto grid min-h-[calc(100vh-140px)] max-w-[1180px] items-center gap-10 px-6 py-14 lg:grid-cols-[1fr_480px]">
        <div className="max-w-xl">
          <p className="text-sm font-black uppercase tracking-[.18em] text-[#6d28d9]">Nouveau compte</p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-.02em] text-[#07111f] md:text-5xl">Crée ton espace gaming en quelques secondes.</h1>
          <p className="mt-5 text-lg leading-8 text-[#4b5563]">
            Achète plus vite, suis tes commandes et rejoins les prochains tournois Astral4Gamer.
          </p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-[480px] space-y-3">
            <GoogleAuthButton label="S'inscrire avec Google" />
            <SignUp
              routing="path"
              path="/inscription"
              signInUrl="/connexion"
              fallbackRedirectUrl="/"
              appearance={{
                elements: {
                  cardBox: "shadow-[0_18px_60px_rgba(17,24,39,.12)]",
                  card: "rounded-lg border border-[#edf0f4]",
                  formButtonPrimary: "bg-[#6d28d9] hover:bg-[#5b21b6]",
                  footerActionLink: "text-[#6d28d9]"
                }
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
