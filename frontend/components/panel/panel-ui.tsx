"use client";

import { CheckCircle2, Copy, CreditCard, FileCode2, HelpCircle, KeyRound, LayoutDashboard, Wallet, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { API_BASE_URL } from "@/lib/api";
import type { PanelDocumentation, PanelPartner, PanelProduct } from "@/components/panel/panel-types";

export const panelNavItems: Array<{ label: string; href: string; icon: LucideIcon; description: string }> = [
  { label: "Tableau de bord", href: "/panel", icon: LayoutDashboard, description: "Vue générale" },
  { label: "API", href: "/panel/api", icon: KeyRound, description: "Clés et environnements" },
  { label: "Commandes", href: "/panel/commandes", icon: FileCode2, description: "Endpoints et flux" },
  { label: "Transactions", href: "/panel/transactions", icon: CreditCard, description: "Recharges et activité" },
  { label: "Solde", href: "/panel/solde", icon: Wallet, description: "Wallet partenaire" },
  { label: "Support", href: "/panel/support", icon: HelpCircle, description: "Assistance" },
  { label: "Documentation", href: "/panel/documentation", icon: FileCode2, description: "Guide complet" },
  { label: "Paramètres", href: "/panel/parametres", icon: CheckCircle2, description: "Compte partenaire" },
  { label: "Développeurs", href: "/panel/developpeurs", icon: Copy, description: "Catalogue et intégration" }
];

export const quickTabs = ["cURL", "PHP", "Python", "JavaScript"] as const;

export type QuickTab = (typeof quickTabs)[number];

export function panelDisplayName(partner: PanelPartner) {
  return partner.company_name || partner.name;
}

export function panelInitial(partner: PanelPartner) {
  return panelDisplayName(partner).slice(0, 1).toUpperCase() || "P";
}

export function panelBalanceLabel(partner: PanelPartner) {
  return `${partner.wallet.balance.toFixed(2)} ${partner.wallet.currency}`;
}

export function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value).then(() => true).catch(() => fallbackCopyText(value));
  }

  return Promise.resolve(fallbackCopyText(value));
}

function fallbackCopyText(value: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function maskApiKey(value: string) {
  return `${value.slice(0, 18)}...${value.slice(-6)}`;
}

export function buildDocumentationText(documentation: PanelDocumentation, sandboxKey?: string, livePrefix?: string | null) {
  const endpointLines = documentation.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path} - ${endpoint.description}`).join("\n");
  const liveLine = livePrefix ? `- Live key active: ${livePrefix}... (la valeur complète n'est plus récupérable)` : "- Live key active: aucune clé live enregistrée";

  return `Astral4Gamer Partner API

Base URL
${documentation.base_url}

Environnements
- Sandbox key: ${sandboxKey ?? "non disponible"}
${liveLine}

Règles de sécurité
- Utilisez la clé sandbox pour les tests et l'intégration initiale.
- La clé live ne doit jamais être exposée dans le frontend, le navigateur ou une app mobile.
- La clé live doit rester uniquement côté serveur en production.
- Si une nouvelle clé live est générée, stockez-la immédiatement: elle n'est affichée qu'une seule fois.

Authentification
Header requis sur chaque appel:
Authorization: Bearer YOUR_API_KEY
Accept: application/json
Content-Type: application/json

Endpoints principaux
${endpointLines}

Payload de commande attendu
{
  "product_id": <PRODUCT_ID>,
  "quantity": 1,
  "partner_reference": "YOUR_REFERENCE",
  "data": {
    "player_id": "PLAYER_ID",
    "region": "REGION"
  }
}

Passage en production
1. Testez d'abord tous les flux en sandbox.
2. Déplacez ensuite l'intégration sur votre backend.
3. Remplacez ensuite la clé sandbox par la clé live côté serveur.
4. Vérifiez le solde, les réponses d'erreur et les références de commande.

Moneroo - authentification et sécurité
- Chaque appel Moneroo doit inclure: Authorization: Bearer YOUR_SECRET_KEY
- Utilisez uniquement la clé secrète côté backend.
- Ne mettez jamais la clé secrète dans Git, le frontend, le navigateur ou une app mobile.
- Conservez la validation SSL active. Ne désactivez jamais VERIFY_PEER.
- Limite Moneroo: 120 requêtes par minute. En cas de 429, attendez 60 secondes avant retry.

Moneroo - format standard des réponses
{
  "message": "Transaction initialized successfully.",
  "data": {},
  "errors": null
}

Moneroo - initialiser un paiement standard
POST https://api.moneroo.io/v1/payments/initialize
Headers:
Authorization: Bearer YOUR_SECRET_KEY
Accept: application/json
Content-Type: application/json

Payload minimal:
{
  "amount": 100,
  "currency": "USD",
  "description": "Payment for order #123",
  "return_url": "https://example.com/payments/thank-you",
  "customer": {
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "metadata": {
    "order_id": "123",
    "customer_id": "123"
  }
}

Notes Moneroo:
- methods est optionnel. Si absent, Moneroo laisse les moyens de paiement disponibles pour la devise.
- Utilisez uniquement des shortcodes réels supportés par la devise, par exemple mtn_bj, moov_bj, card_usd, card_xof.
- restrict_country_code et restricted_phone sont mutuellement exclusifs.

Réponse attendue après initialisation:
{
  "message": "Transaction initialized successfully",
  "data": {
    "id": "PAYMENT_ID",
    "checkout_url": "https://checkout.moneroo.io/PAYMENT_ID"
  }
}

Flux standard Moneroo
1. Votre backend initialise le paiement.
2. Moneroo retourne data.checkout_url.
3. Vous redirigez le client vers cette URL.
4. Moneroo redirige ensuite le client vers return_url avec paymentId et paymentStatus.
5. Votre backend doit toujours re-vérifier le paiement avant de créditer la commande.

Moneroo - vérification de transaction
GET https://api.moneroo.io/v1/payments/{paymentId}/verify
Headers:
Authorization: Bearer YOUR_SECRET_KEY
Accept: application/json

Vérifications minimales côté serveur:
- payment id attendu
- status = success avant livraison
- devise attendue
- montant payé >= montant attendu
- metadata.order_id cohérent avec votre commande

Statuts Moneroo
- initiated: paiement créé, attente du client
- pending: client engagé mais paiement non finalisé
- success: paiement finalisé avec succès
- failed: échec final
- cancelled: annulation finale

Moneroo - webhooks
- Événements principaux: payment.initiated, payment.success, payment.failed, payment.cancelled
- Moneroo envoie un POST JSON à votre webhook.
- Répondez vite avec HTTP 200 en moins de 3 secondes.
- Vérifiez X-Moneroo-Signature avec HMAC-SHA256 sur le payload brut.
- Si la signature est invalide, répondez 403.
- Gérez les doublons et re-query systématiquement le paiement via l'API.

Exemple de vérification webhook PHP:
<?php
$secret = 'your_webhook_signing_secret';
$payload = file_get_contents('php://input');
$signature = hash_hmac('sha256', $payload, $secret);

if (hash_equals($signature, $_SERVER['HTTP_X_MONEROO_SIGNATURE'])) {
    http_response_code(200);
} else {
    http_response_code(403);
}

Moneroo - tests
- Utilisez les sandbox keys pendant l'intégration.
- Les données sandbox sont isolées du live et supprimées après 90 jours.
- En mode sandbox, la page de paiement affiche un badge de test.
- Pour obtenir la liste à jour des méthodes: GET https://api.moneroo.io/v1/utils/payment/methods
- Pour les moyens par devise, utilisez les shortcodes exacts retournés par Moneroo.
`;
}

export function quickCode(
  tab: QuickTab,
  {
    key = "YOUR_API_KEY",
    baseUrl = `${API_BASE_URL.replace(/\/$/, "")}/api/reseller/v1`,
    productId = "<PRODUCT_ID>",
  }: { key?: string; baseUrl?: string; productId?: string } = {}
) {
  const jsPayload = `{
  product_id: ${productId},
  quantity: 1,
  partner_reference: "YOUR_REFERENCE",
  data: {
    player_id: "PLAYER_ID",
    region: "REGION"
  }
}`;
  const jsonPayload = `{
  "product_id": ${productId},
  "quantity": 1,
  "partner_reference": "YOUR_REFERENCE",
  "data": {
    "player_id": "PLAYER_ID",
    "region": "REGION"
  }
}`;
  const pythonPayload = `{
        "product_id": ${productId},
        "quantity": 1,
        "partner_reference": "YOUR_REFERENCE",
        "data": {
            "player_id": "PLAYER_ID",
            "region": "REGION"
        }
    }`;

  if (tab === "PHP") {
    return `<?php
$payload = [
  'product_id' => ${productId},
  'quantity' => 1,
  'partner_reference' => 'YOUR_REFERENCE',
  'data' => [
    'player_id' => 'PLAYER_ID',
    'region' => 'REGION',
  ],
];

$ch = curl_init('${baseUrl}/order/add-order');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ${key}',
    'Content-Type: application/json',
    'Accept: application/json',
  ],
  CURLOPT_POSTFIELDS => json_encode($payload),
]);

$response = curl_exec($ch);
curl_close($ch);`;
  }

  if (tab === "Python") {
    return `import requests

response = requests.post(
    "${baseUrl}/order/add-order",
    headers={
        "Authorization": "Bearer ${key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    },
    json=${pythonPayload},
)

print(response.json())`;
  }

  if (tab === "JavaScript") {
    return `const response = await fetch("${baseUrl}/order/add-order", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${key}",
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  body: JSON.stringify(${jsPayload}),
});

const data = await response.json();`;
  }

  return `curl -X POST ${baseUrl}/order/add-order \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '${jsonPayload}'`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function productSearch(products: PanelProduct[], query: string) {
  const search = query.trim().toLowerCase();
  if (!search) return products;
  return products.filter((product) => product.name.toLowerCase().includes(search));
}

export function PageSection({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[18px] border border-[#1a2231] bg-[#0d131e] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-black tracking-[-0.04em] text-white">{title}</h2>
          {description ? <p className="mt-1 text-[12px] text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function MetricCard({ label, value, accent, children }: { label: string; value: string; accent?: string; children?: ReactNode }) {
  return (
    <article className="rounded-[18px] border border-[#1a2231] bg-[#0d131e] p-3.5">
      <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2.5 text-[21px] font-black tracking-[-0.05em] ${accent ?? "text-white"}`}>{value}</p>
      {children ? <div className="mt-3">{children}</div> : null}
    </article>
  );
}

export function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[#1a2231] bg-[#0f1521] p-3.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-[12px] font-semibold text-white">{value}</p>
    </div>
  );
}

export function MethodBadge({ method }: { method: string }) {
  const isPost = method === "POST";
  return <span className={`inline-flex min-w-[58px] items-center justify-center rounded-md px-2.5 py-1 text-[11px] font-black ${isPost ? "bg-emerald-500/16 text-emerald-300" : "bg-sky-500/14 text-sky-300"}`}>{method}</span>;
}

export function StatusBadge({ status }: { status: number }) {
  const tone = status >= 200 && status < 300 ? "bg-emerald-500/16 text-emerald-300" : status >= 400 && status < 500 ? "bg-red-500/16 text-red-300" : "bg-amber-500/16 text-amber-300";
  return <span className={`inline-flex w-fit rounded-md px-2.5 py-1 text-[11px] font-black ${tone}`}>{status}</span>;
}

export function TinyChart({ values, tone }: { values: number[]; tone: "green" | "violet" }) {
  const line = tone === "green" ? "#3ee58c" : "#8b5cf6";
  const fill = tone === "green" ? "rgba(62,229,140,.16)" : "rgba(139,92,246,.16)";
  const points = values.map((value, index) => `${index * (100 / (values.length - 1))},${28 - ((value - 16) / 12) * 24}`).join(" ");

  return (
    <svg viewBox="0 0 100 28" className="h-10 w-full">
      <polyline fill="none" stroke={line} strokeWidth="1.8" points={points} />
      <polyline fill={fill} stroke="none" points={`0,28 ${points} 100,28`} />
    </svg>
  );
}

export function ProgressBar({ value, tone = "emerald" }: { value: number; tone?: "emerald" | "amber" }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
      <span className={`block h-full rounded-full ${tone === "emerald" ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function CodeTabs({ defaultKey, productId }: { defaultKey?: string; productId?: string }) {
  const [activeTab, setActiveTab] = useState<QuickTab>("cURL");
  const code = useMemo(() => quickCode(activeTab, { key: defaultKey, productId }), [activeTab, defaultKey, productId]);

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#1a2231] bg-[#0c1221]">
      <div className="flex gap-2 border-b border-[#1a2231] px-4 pt-3">
        {quickTabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`border-b-2 px-2 pb-2.5 text-[12px] ${activeTab === tab ? "border-[#7c4dff] text-white" : "border-transparent text-slate-500"}`}>
            {tab}
          </button>
        ))}
      </div>
      <div className="p-3.5">
        <div className="mb-3 flex justify-end">
          <button onClick={() => void copyText(code)} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[linear-gradient(90deg,#5b34f4,#7c4dff)] px-3 text-xs font-semibold text-white">
            <Copy className="h-4 w-4" />
            Copier
          </button>
        </div>
        <pre className="overflow-auto whitespace-pre-wrap rounded-[12px] bg-[#0a0f1b] p-3 text-[11px] leading-5 text-slate-300">{code}</pre>
        <p className="mt-3 text-xs text-slate-500">Base URL: {API_BASE_URL.replace(/\/$/, "")}/api/reseller/v1</p>
      </div>
    </div>
  );
}