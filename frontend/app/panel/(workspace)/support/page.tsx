"use client";

import { LifeBuoy, MessageCircleWarning, ShieldCheck } from "lucide-react";
import { PageSection } from "@/components/panel/panel-ui";

export default function PanelSupportPage() {
  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <SupportCard icon={<LifeBuoy className="h-5 w-5 text-[#a78bfa]" />} title="Support intégration" text="Pour les questions sur les endpoints, les erreurs de payload, la sandbox ou la mise en production." actionLabel="Contacter le support" actionHref="/contact" />
        <SupportCard icon={<MessageCircleWarning className="h-5 w-5 text-[#a78bfa]" />} title="Escalade commande" text="Pour un ordre bloqué, un solde insuffisant ou un besoin de vérification rapide sur une transaction." actionLabel="Ouvrir le contact" actionHref="/contact" />
        <SupportCard icon={<ShieldCheck className="h-5 w-5 text-[#a78bfa]" />} title="Sécurité API" text="Pour les usages sensibles de la clé live, les bonnes pratiques backend et la séparation test / production." actionLabel="Lire la documentation" actionHref="/panel/documentation" />
      </section>

      <PageSection title="Quand contacter le support" description="Les cas à traiter rapidement côté partenaire.">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-4 text-[12px] leading-5 text-slate-300">
            <p className="font-bold text-white">Support immédiat</p>
            <ul className="mt-2 space-y-2 text-slate-500">
              <li>Erreur de paiement ou top-up non confirmé.</li>
              <li>Réponse API inattendue en production.</li>
              <li>Doute sur l'utilisation correcte de la clé live.</li>
            </ul>
          </div>
          <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-4 text-[12px] leading-5 text-slate-300">
            <p className="font-bold text-white">Avant de nous écrire</p>
            <ul className="mt-2 space-y-2 text-slate-500">
              <li>Préparez l'endpoint utilisé et l'heure de l'erreur.</li>
              <li>Ajoutez le payload envoyé sans exposer la clé live.</li>
              <li>Indiquez si le test a été fait en sandbox ou en production.</li>
            </ul>
          </div>
        </div>
      </PageSection>
    </div>
  );
}

function SupportCard({ icon, title, text, actionLabel, actionHref }: { icon: React.ReactNode; title: string; text: string; actionLabel: string; actionHref: string }) {
  return (
    <div className="rounded-[18px] border border-[#1a2231] bg-[#0d131e] p-4">
      <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#141b29]">{icon}</div>
      <p className="mt-4 text-[15px] font-bold text-white">{title}</p>
      <p className="mt-2 text-[12px] leading-5 text-slate-500">{text}</p>
      <a href={actionHref} className="mt-4 inline-flex h-9 items-center rounded-[10px] bg-[#141b29] px-3 text-xs font-semibold text-white">{actionLabel}</a>
    </div>
  );
}