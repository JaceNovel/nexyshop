"use client";

import { useState, type FormEvent } from "react";
import { usePanelData } from "@/components/panel/panel-data";
import { formatDateTime, PageSection } from "@/components/panel/panel-ui";

export default function PanelTransactionsPage() {
  const { partner, recentTransactions, initiateTopup } = usePanelData();
  const [amount, setAmount] = useState("10");
  const [customer, setCustomer] = useState({ email: "", first_name: "", last_name: "", phone: "" });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!partner) return null;

  const topupCurrency = partner.wallet.currency;
  const monerooMinimum = Math.max(partner.minimum_topup, minimumMonerooTopup(topupCurrency));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const result = await initiateTopup(Number(amount), customer);

    if (!result.ok) {
      setMessage(result.message ?? "Recharge impossible.");
    }

    setIsSubmitting(false);
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <PageSection title="Recharge de wallet" description={`Minimum ${monerooMinimum} ${topupCurrency} via Moneroo.`}>
          <form onSubmit={onSubmit} className="grid gap-3">
            <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={monerooMinimum} step="0.01" className="h-10 rounded-[12px] border border-[#1a2231] bg-[#0c1221] px-3 text-[12px] text-white outline-none placeholder:text-slate-600 focus:border-[#7c4dff]" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Email paiement" value={customer.email} onChange={(value) => setCustomer({ ...customer, email: value })} />
              <Input placeholder="Téléphone" value={customer.phone} onChange={(value) => setCustomer({ ...customer, phone: value })} />
              <Input placeholder="Prénom" value={customer.first_name} onChange={(value) => setCustomer({ ...customer, first_name: value })} />
              <Input placeholder="Nom" value={customer.last_name} onChange={(value) => setCustomer({ ...customer, last_name: value })} />
            </div>
            {message ? <p className="rounded-[12px] border border-red-900 bg-red-950/40 px-3 py-2.5 text-[12px] text-red-200">{message}</p> : null}
            <p className="text-[12px] leading-5 text-slate-500">Le paiement Moneroo utilisera la devise du wallet partenaire. Si Moneroo refuse encore le paiement, il faut verifier que cette application Moneroo a bien des moyens actifs dans son dashboard.</p>
            <button disabled={isSubmitting} className="h-10 rounded-[12px] bg-[linear-gradient(90deg,#5b34f4,#7c4dff)] text-xs font-bold text-white disabled:opacity-60">
              {isSubmitting ? "Initialisation..." : "Recharger avec Moneroo"}
            </button>
          </form>
        </PageSection>

        <PageSection title="Notes transactionnelles" description="Bonnes pratiques avant et après paiement.">
          <ul className="space-y-2 text-[12px] leading-5 text-slate-300">
            <li>Minimum de recharge Moneroo actuel: {monerooMinimum} {partner.wallet.currency}.</li>
            <li>Seuil d'alerte configuré: {partner.low_balance_threshold} {partner.wallet.currency}.</li>
            <li>Conservez la référence Moneroo et l'email de paiement pour le support.</li>
            <li>Les mouvements ci-dessous proviennent du wallet reseller réellement enregistré.</li>
          </ul>
        </PageSection>
      </section>

      <PageSection title="Historique du wallet" description="Derniers crédits et débits réellement enregistrés.">
        <div className="overflow-x-auto">
          <div className="min-w-[640px] space-y-2">
            <div className="grid grid-cols-[110px_1.4fr_120px_120px_150px] gap-3 px-2 pb-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">
              <span>Type</span>
              <span>Référence</span>
              <span>Montant</span>
              <span>Solde</span>
              <span>Date</span>
            </div>
            {recentTransactions.length ? recentTransactions.map((item) => (
              <div key={item.id} className="grid grid-cols-[110px_1.4fr_120px_120px_150px] items-center gap-3 rounded-[12px] border border-[#1a2231] bg-[#0f1521] px-3 py-2.5 text-[12px]">
                <span className={`inline-flex w-fit rounded-md px-2.5 py-1 text-[11px] font-black ${item.type === "credit" ? "bg-emerald-500/16 text-emerald-300" : "bg-amber-500/16 text-amber-300"}`}>{item.type}</span>
                <span className="truncate text-slate-200">{item.reference ?? "-"}</span>
                <span className="text-slate-300">{item.amount.toFixed(2)} {item.currency}</span>
                <span className="text-slate-400">{item.balance_after.toFixed(2)} {item.currency}</span>
                <span className="text-slate-500">{formatDateTime(item.created_at)}</span>
              </div>
            )) : (
              <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] px-3 py-6 text-center text-[12px] text-slate-500">
                Aucun mouvement wallet enregistré pour le moment.
              </div>
            )}
          </div>
        </div>
      </PageSection>
    </div>
  );
}

function Input({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (value: string) => void }) {
  return <input placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-[12px] border border-[#1a2231] bg-[#0c1221] px-3 text-[12px] text-white outline-none placeholder:text-slate-600 focus:border-[#7c4dff]" />;
}

function minimumMonerooTopup(currency: string) {
  switch (currency.toUpperCase()) {
    case "USD":
    case "XOF":
    case "XAF":
      return 100;
    default:
      return 10;
  }
}