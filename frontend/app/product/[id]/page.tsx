"use client";

import { useUser } from "@clerk/nextjs";
import { CheckCircle2, Clock3, CreditCard, Loader2, Minus, Plus, ShieldCheck, ShoppingCart, Truck, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/components/language-provider";
import { catalogFallbackImage, resolveCatalogImage } from "@/lib/catalog-images";
import { createGuestOrder, getCatalogProduct, getFreeFireProfile, initiateMonerooPayment, type CatalogProduct, type CatalogRequiredField, type CatalogVariation, verifyGameUid } from "@/lib/api";

const garenaAvatar = "https://cdn.simpleicons.org/garena/E4002B";

function productText(product: Pick<CatalogProduct, "name" | "game" | "category">) {
  return `${product.name} ${product.game} ${product.category ?? ""}`.toLowerCase();
}

function productImage(product: Pick<CatalogProduct, "name" | "game" | "category" | "image_url">) {
  return resolveCatalogImage(product);
}

function productBasePrice(product: CatalogProduct) {
  const variationPrices = (product.variations ?? [])
    .map((variation) => Number(variation.price))
    .filter((price) => price > 0);

  if (Number(product.price) > 0) return Number(product.price);
  if (variationPrices.length) return Math.min(...variationPrices);

  return 0;
}

function variationDisplayPrice(variation: CatalogVariation, product: CatalogProduct) {
  const variationPrice = Number(variation.price);

  return variationPrice > 0 ? variationPrice : productBasePrice(product);
}

function variationKey(variation: CatalogVariation, index: number) {
  return String(variation.variation_id ?? variation.id ?? `${variation.name}-${index}`);
}

const regionMap = [
  ["Global", ["global", "worldwide", "international"]],
  ["Europe", ["europe", "eu "]],
  ["MENA", ["mena", "middle east", "africa"]],
  ["Brazil", ["brazil", "brasil"]],
  ["Bangladesh", ["bangladesh"]],
  ["Indonesia", ["indonesia"]],
  ["LATAM", ["latam", "latin"]],
  ["Malaysia", ["malaysia"]],
  ["Singapore", ["singapore"]],
  ["Thailand", ["thailand"]],
  ["Vietnam", ["vietnam"]],
  ["India", ["india"]],
  ["USA", ["usa", "united states", "us "]]
] as const;

type PlayerProfile = {
  uid: string;
  nickname: string;
  avatar?: string | null;
  region?: string | null;
  source: string;
};

function checkoutRegionCode(region: string) {
  const normalized = region.toLowerCase();

  if (normalized.includes("brazil")) return "br";
  if (normalized.includes("bangladesh")) return "bd";
  if (normalized.includes("indonesia")) return "id";
  if (normalized.includes("malaysia")) return "sg";
  if (normalized.includes("singapore")) return "sg";
  if (normalized.includes("thailand")) return "th";
  if (normalized.includes("vietnam")) return "vn";
  if (normalized.includes("india")) return "in";
  if (normalized.includes("usa") || normalized.includes("united states")) return "us";
  if (normalized.includes("cis") || normalized.includes("russia")) return "cis";

  return "me";
}

function variationRegion(variation: CatalogVariation) {
  const text = variation.name.toLowerCase();
  const region = regionMap.find(([, aliases]) => aliases.some((alias) => text.includes(alias)));

  return region?.[0] ?? "Global";
}

function variationAmountLabel(variation: CatalogVariation) {
  let label = variation.name;

  regionMap.forEach(([region, aliases]) => {
    label = label.replace(new RegExp(`\\b${region}\\b`, "ig"), "");
    aliases.forEach((alias) => {
      label = label.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "");
    });
  });

  return label.replace(/\s*[-–—|,/]\s*/g, " ").replace(/\s+/g, " ").trim() || variation.name;
}

function gameKind(product: CatalogProduct) {
  const text = productText(product);

  if (text.includes("free fire") || text.includes("garena")) return "freefire";
  if (text.includes("pubg")) return "pubg";
  if (text.includes("call of duty") || text.includes("cod")) return "cod";
  if (text.includes("fortnite")) return "fortnite";

  return "generic";
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" && value !== "undefined" && value !== "null" ? value : "";
}

function fieldKey(field: CatalogRequiredField, index: number) {
  return field.key || `field_${index + 1}`;
}

function fieldLabel(field: CatalogRequiredField, index: number) {
  return field.label || field.key || `Champ ${index + 1}`;
}

function optionLabel(option: Record<string, unknown>) {
  return String(option.label ?? option.name ?? option.value ?? option.id ?? "");
}

function optionValue(option: Record<string, unknown>) {
  return String(option.value ?? option.id ?? option.key ?? option.label ?? option.name ?? "");
}

function AccountSummary({ profile, compact = false }: { profile: PlayerProfile; compact?: boolean }) {
  const avatar = profile.avatar || garenaAvatar;

  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg ${compact ? "" : "border border-emerald-200 bg-emerald-50 p-3"}`}>
      <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
        <img src={avatar} alt="" className="h-full w-full object-cover" />
        <span className="absolute bottom-0 right-0 grid h-4 w-4 place-items-center rounded-full bg-white ring-1 ring-black/10">
          <img src={garenaAvatar} alt="" className="h-3 w-3 object-contain" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-black uppercase text-[#ef2b2d]">Account</span>
        <span className="mt-0.5 block truncate text-sm font-black text-[#111827]">Username: {profile.nickname}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[#667085]">Player ID: {profile.uid}</span>
        {profile.region ? <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#667085]">Region: {profile.region.toUpperCase()}</span> : null}
      </span>
    </div>
  );
}

function publicProductReference(product: CatalogProduct) {
  const type = product.type === "gift-card" || product.type === "gift-cards" ? "giftcard" : product.type === "game-key" || product.type === "game-keys" ? "gamekey" : "topup";
  const rawReference = product.public_reference?.trim() ?? "";
  const shouldUseApiReference = rawReference && !/^(fazercards|item4gamer)[-_]/i.test(rawReference);

  if (shouldUseApiReference) {
    return rawReference.replace(/^Astral4Gamer-/i, "Astral4gamer-");
  }

  const base = (product.name || product.game || `product-${product.id}`)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    || `product_${product.id}`;

  return `Astral4gamer-${type}-${base}`;
}

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const { user } = useUser();
  const { addItem, openCart, removeItem } = useCart();
  const { language, t, formatMoney } = useLanguage();
  const isFrench = language === "fr";
  const labels = {
    unavailablePrice: isFrench ? "Prix indisponible" : "Price unavailable",
    manualDelivery: isFrench ? "Traitement manuel" : "Manual processing",
    fastDelivery: isFrench ? "Livraison rapide" : "Fast delivery",
    shop: isFrench ? "Boutique" : "Shop",
    loadingProduct: isFrench ? "Chargement du produit..." : "Loading product...",
    unavailableProduct: isFrench ? "Produit indisponible" : "Product unavailable",
    unavailableProductHint: isFrench ? "Ce produit n’est pas disponible pour le moment." : "This product is not available right now.",
    promo: isFrench ? "Promo" : "Promo",
    secure: isFrench ? "Sécurisé" : "Secure",
    bestPrice: isFrench ? "Garantie meilleur prix" : "Best price guarantee",
    securePayment: isFrench ? "Paiement sécurisé" : "Secure payment",
    region: isFrench ? "Région" : "Region",
    selectAmount: isFrench ? "Choisir le montant" : "Select amount",
    productRef: isFrench ? "Référence produit" : "Product reference",
    checkoutTitle: isFrench ? "Finaliser tes informations" : "Complete your details",
    checkoutHintUid: isFrench ? "Vérifie le compte à recharger avant de continuer." : "Verify the account to top up before continuing.",
    checkoutHintPayment: isFrench ? "Confirme tes informations de paiement." : "Confirm your payment details.",
    close: isFrench ? "Fermer" : "Close",
    select: isFrench ? "Sélectionner" : "Select",
    changeId: isFrench ? "Mettre un autre ID" : "Use another ID",
    userId: isFrench ? "ID joueur" : "User ID",
    fetchAccount: isFrench ? "Vérifier le compte" : "Fetch account info",
    paymentEmail: isFrench ? "Email paiement" : "Payment email",
    phone: isFrench ? "Téléphone" : "Phone",
    firstName: isFrench ? "Prénom" : "First name",
    lastName: isFrench ? "Nom" : "Last name",
    total: isFrench ? "Total" : "Total",
    confirmPay: isFrench ? "Confirmer et payer" : "Confirm and pay",
    recommended: isFrench ? "Produits recommandés" : "Recommended products",
  };
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [recommended, setRecommended] = useState<CatalogProduct[]>([]);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [selectedVariationKey, setSelectedVariationKey] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("Global");
  const [quantity, setQuantity] = useState(1);
  const [gameUid, setGameUid] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "verified" | "ordered" | "error">("idle");
  const [message, setMessage] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [suggestedProfile, setSuggestedProfile] = useState<PlayerProfile | null>(null);
  const [useSuggestedProfile, setUseSuggestedProfile] = useState(true);
  const [verifiedProfile, setVerifiedProfile] = useState<PlayerProfile | null>(null);
  const [supplierFields, setSupplierFields] = useState<Record<string, string>>({});
  const [cartFeedback, setCartFeedback] = useState(false);

  useEffect(() => {
    if (!params.id) return;

    setLoadingProduct(true);
    setProduct(null);
    setRecommended([]);
    setMessage("");
    setStatus("idle");
    setCheckoutOpen(false);
    setVerifiedProfile(null);
    getCatalogProduct(params.id)
      .then((payload) => {
        setProduct(payload.data);
        setRecommended(payload.recommended);
        const urlParams = new URLSearchParams(window.location.search);
        const requestedVariation = urlParams.get("variation");
        const productVariations = payload.data.variations ?? [];
        const requestedIndex = productVariations.findIndex((variation, index) => variationKey(variation, index) === requestedVariation || String(variation.variation_id ?? "") === requestedVariation);
        const initialVariation = requestedIndex >= 0 ? productVariations[requestedIndex] : productVariations[0];
        setSelectedVariationKey(initialVariation ? variationKey(initialVariation, Math.max(0, requestedIndex)) : "");
        setSelectedRegion(initialVariation ? variationRegion(initialVariation) : "Global");
        setQuantity(Math.max(1, Number(urlParams.get("quantity")) || 1));
        setSupplierFields(Object.fromEntries((payload.data.required_fields ?? []).map((field, index) => [fieldKey(field, index), ""])));
        if (urlParams.get("checkout") === "1") setCheckoutOpen(true);
      })
      .catch(() => {
        setProduct(null);
          setMessage(isFrench ? "Produit indisponible pour le moment." : "Product unavailable right now.");
      })
      .finally(() => setLoadingProduct(false));
        }, [isFrench, params.id]);

  useEffect(() => {
    if (!product) return;

    const kind = gameKind(product);
    let profile: PlayerProfile | null = null;

    if (kind === "freefire") {
      const stored = readJson<Record<string, unknown>>("astral_freefire_profile");
      const uid = stringValue(stored?.uid) || stringValue(stored?.player_uid);
      const nickname = stringValue(stored?.nickname) || stringValue(stored?.account_name) || stringValue(stored?.display_name);
      if (uid) profile = { uid, nickname: nickname || uid, avatar: stringValue(stored?.outfit_url) || stringValue(stored?.avatar_url), region: stringValue(stored?.region), source: "Compte Free Fire lié" };
    } else if (kind === "pubg") {
      const stored = readJson<Record<string, unknown>>("astral_pubg_profile");
      const uid = stringValue(stored?.account_id) || stringValue(stored?.game_id);
      const nickname = stringValue(stored?.name);
      if (uid) profile = { uid, nickname: nickname || uid, avatar: stringValue(stored?.avatar_url), region: stringValue(stored?.platform) || stringValue(stored?.shard_id), source: "Compte PUBG lié" };
    } else if (kind === "cod") {
      const stored = readJson<Record<string, unknown>>("astral_cod_profile");
      const uid = stringValue(stored?.activision_id) || stringValue(stored?.cod_username) || stringValue(stored?.username);
      const nickname = stringValue(stored?.cod_username) || stringValue(stored?.username);
      if (uid) profile = { uid, nickname: nickname || uid, avatar: stringValue(stored?.avatar_url), source: "Compte Call of Duty lié" };
    } else if (kind === "fortnite") {
      const stored = readJson<Record<string, unknown>>("astral_fortnite_profile");
      const uid = stringValue(stored?.account_id) || stringValue(stored?.name);
      const nickname = stringValue(stored?.name);
      if (uid) profile = { uid, nickname: nickname || uid, avatar: stringValue(stored?.avatar_url), source: "Compte Fortnite lié" };
    }

    setSuggestedProfile(profile);
    setUseSuggestedProfile(Boolean(profile));

    if (profile) {
      setGameUid(profile.uid);
      setNickname(profile.nickname);
      setVerifiedProfile(profile);
      setStatus("verified");
    } else {
      setVerifiedProfile(null);
      setStatus("idle");
    }
  }, [product]);

  useEffect(() => {
    if (!checkoutOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [checkoutOpen]);

  useEffect(() => {
    if (!user) return;

    const fullName = user.fullName?.trim().split(/\s+/) ?? [];
    setEmail((current) => current || user.primaryEmailAddress?.emailAddress || "");
    setFirstName((current) => current || user.firstName || fullName[0] || "");
    setLastName((current) => current || user.lastName || fullName.slice(1).join(" ") || "");
  }, [user]);

  useEffect(() => {
    const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? "";
    const first = user?.firstName ?? "";
    const last = user?.lastName ?? "";

    if (primaryEmail && !email) setEmail(primaryEmail);
    if (first && !firstName) setFirstName(first);
    if (last && !lastName) setLastName(last);
  }, [user, email, firstName, lastName]);

  const variations = useMemo(() => {
    if (!product) return [];
    if (product.variations?.length) return product.variations;

    return (product.amounts?.length ? product.amounts : [product.name]).map((name, index) => ({
      id: index,
      variation_id: product.variation_id,
      name,
      price: productBasePrice(product),
      currency: product.currency
    }));
  }, [product]);
  const regions = useMemo(() => Array.from(new Set(variations.map(variationRegion))), [variations]);
  const visibleVariations = useMemo(() => {
    if (regions.length <= 1) return variations;

    return variations.filter((variation) => variationRegion(variation) === selectedRegion);
  }, [regions.length, selectedRegion, variations]);

  const selectedVariation = useMemo(() => {
    return visibleVariations.find((variation, index) => variationKey(variation, index) === selectedVariationKey) ?? visibleVariations[0] ?? variations[0];
  }, [selectedVariationKey, variations, visibleVariations]);

  const unitPrice = Number(selectedVariation?.price) > 0 ? Number(selectedVariation?.price) : product ? productBasePrice(product) : 0;
  const unitPriceCurrency = Number(selectedVariation?.price) > 0 ? (selectedVariation?.currency || product?.currency || "USD") : product?.currency || "USD";
  const total = unitPrice * quantity;
  const canPay = total > 0;
  const displayImage = product ? productImage(product) : "/unnamed.png";
  const deliveryMode = product?.delivery === "manual" ? labels.manualDelivery : labels.fastDelivery;
  const productCategory = product?.category ?? product?.game ?? labels.shop;
  const requiredFields = product?.required_fields ?? [];
  const hasDynamicFields = requiredFields.length > 0;
  const requiresUid = hasDynamicFields || product?.requires_uid !== false;

  function openCheckout() {
    if (!canPay) {
      setStatus("error");
      setMessage(isFrench ? "Ce produit n’a pas encore de prix exploitable." : "This product does not have a usable price yet.");
      return;
    }

    setMessage("");
    setCheckoutOpen(true);
  }

  function addSelectedItemToCart() {
    if (!product || !selectedVariation || !canPay) {
      setStatus("error");
      setMessage(language === "fr" ? "Ce produit ne peut pas encore être ajouté au panier." : "This product cannot be added to the cart yet.");
      return;
    }

    addItem({
      productId: product.id,
      productName: product.name,
      imageUrl: displayImage,
      variationId: selectedVariation.variation_id,
      variationKey: selectedVariationKey || variationKey(selectedVariation, variations.indexOf(selectedVariation)),
      variationName: variationAmountLabel(selectedVariation),
      region: selectedRegion,
      unitPrice,
      currency: unitPriceCurrency,
      quantity
    });
    setCartFeedback(true);
    window.setTimeout(() => setCartFeedback(false), 1800);
    openCart();
  }

  async function verifyUid() {
    if (!gameUid.trim()) {
      setMessage(isFrench ? "Entre l’ID du compte à vérifier." : "Enter the account ID to verify.");
      return;
    }

    setStatus("loading");
    try {
      if (!product) return;
      const kind = gameKind(product);

      if (kind === "freefire") {
        const profile = await getFreeFireProfile(gameUid.trim(), checkoutRegionCode(selectedRegion));
        const detectedProfile = {
          uid: profile.uid || gameUid.trim(),
          nickname: profile.nickname || profile.uid || gameUid.trim(),
          avatar: profile.outfit_url || profile.avatar_url || garenaAvatar,
          region: profile.region,
          source: isFrench ? "Compte Garena détecté" : "Garena account detected"
        };

        setNickname(detectedProfile.nickname);
        setGameUid(detectedProfile.uid);
        setVerifiedProfile(detectedProfile);
        setStatus("verified");
        setMessage(isFrench ? `Compte vérifié: ${detectedProfile.nickname}. Confirme si c’est bien ce compte à recharger.` : `Account verified: ${detectedProfile.nickname}. Confirm this is the account to top up.`);
        return;
      }

      const result = await verifyGameUid(product.game, gameUid.trim());
      const detectedProfile = {
        uid: result.uid ?? gameUid.trim(),
        nickname: result.nickname,
        avatar: result.avatar,
        source: isFrench ? "Compte détecté" : "Account detected"
      };

      setNickname(detectedProfile.nickname);
      setVerifiedProfile(detectedProfile);
      setStatus("verified");
      setMessage(isFrench ? `Compte vérifié: ${detectedProfile.nickname}. Confirme si c’est bien ce compte à recharger.` : `Account verified: ${detectedProfile.nickname}. Confirm this is the account to top up.`);
    } catch {
      setStatus("error");
      setMessage(isFrench ? "Compte introuvable ou vérification impossible pour le moment. Vérifie l’ID puis réessaie." : "Account not found or verification is unavailable right now. Check the ID and try again.");
    }
  }

  async function prepareOrder() {
    const missingField = requiredFields.find((field, index) => !supplierFields[fieldKey(field, index)]?.trim());
    const firstSupplierValue = Object.values(supplierFields).find((value) => value.trim()) ?? "";
    const effectiveGameUid = gameUid.trim() || firstSupplierValue.trim() || "not-required";
    const effectiveNickname = nickname.trim() || effectiveGameUid || "Client Astral4Gamer";

    if (missingField) {
      setMessage(isFrench ? `Renseigne le champ ${fieldLabel(missingField, requiredFields.indexOf(missingField))}.` : `Fill in the ${fieldLabel(missingField, requiredFields.indexOf(missingField))} field.`);
      setStatus("error");
      return;
    }

    if (!hasDynamicFields && requiresUid && (!nickname.trim() || !gameUid.trim())) {
      setMessage(isFrench ? "Vérifie ou renseigne le compte à recharger." : "Verify or enter the account to top up.");
      return;
    }

    setStatus("loading");
    try {
      if (!product) return;

      if (!email.trim() || !firstName.trim() || !lastName.trim()) {
        setMessage(isFrench ? "Renseigne email, prénom et nom pour ouvrir le paiement Moneroo." : "Enter email, first name, and last name to open Moneroo payment.");
        setStatus("error");
        return;
      }

      const orderPayload = await createGuestOrder({
        product_id: product.id,
        variation_id: selectedVariation?.variation_id ?? product.variation_id,
        game_uid: requiresUid ? effectiveGameUid : "not-required",
        nickname: requiresUid ? effectiveNickname : "Client Astral4Gamer",
        quantity,
        supplier_fields: supplierFields
      });
      const payment = await initiateMonerooPayment({
        order_id: orderPayload.order.id,
        customer: {
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || undefined
        }
      });
      setStatus("ordered");
      setMessage(isFrench ? "Paiement initialisé. Redirection vers Moneroo..." : "Payment initialized. Redirecting to Moneroo...");
      const cartKey = new URLSearchParams(window.location.search).get("cart");
      if (cartKey) removeItem(cartKey);
      window.location.href = payment.checkout_url;
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : (isFrench ? "Impossible de préparer la commande." : "Unable to prepare the order."));
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#06101f]">
      <SiteHeader />

      {loadingProduct ? (
        <section className="mx-auto grid min-h-[520px] max-w-[1586px] place-items-center px-3 py-10 sm:px-6">
          <div className="flex items-center gap-3 rounded-lg border border-[#edf0f4] bg-white px-5 py-4 text-sm font-black text-[#667085] shadow-[0_10px_30px_rgba(16,24,40,.06)]">
            <Loader2 className="h-5 w-5 animate-spin text-[#0b55d9]" />
            {labels.loadingProduct}
          </div>
        </section>
      ) : !product ? (
        <section className="mx-auto grid min-h-[520px] max-w-[900px] place-items-center px-3 py-10 sm:px-6">
          <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-center">
            <h1 className="text-xl font-black text-red-700">{labels.unavailableProduct}</h1>
            <p className="mt-2 text-sm font-semibold text-red-600">{message || labels.unavailableProductHint}</p>
          </div>
        </section>
      ) : (
        <>

      <section className="mx-auto max-w-[1586px] px-3 py-5 sm:px-6 md:py-10">
        <div className="grid gap-7 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[430px_minmax(0,1fr)]">
          <aside>
            <div className="relative overflow-hidden rounded-lg bg-[#101416] shadow-[0_18px_45px_rgba(15,23,42,.10)]">
              {unitPrice > 0 && product.price_range?.max && product.price_range.max > unitPrice && (
                <span className="absolute left-3 top-3 z-10 rounded bg-[#ef2b2d] px-3 py-1 text-xs font-black text-white">
                  {labels.promo}
                </span>
              )}
              <img src={displayImage} alt={product.name} onError={(event) => {
                event.currentTarget.src = catalogFallbackImage(product);
              }} className="aspect-square w-full object-cover" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold md:text-xs">
              <span className="rounded-lg border border-[#f1d5d6] bg-[#fff6f6] p-3 text-[#ef2b2d]"><ShieldCheck className="mx-auto mb-1 h-5 w-5" />{labels.secure}</span>
              <span className="rounded-lg border border-[#e7e9ee] bg-[#f8fafc] p-3 text-[#111827]"><Truck className="mx-auto mb-1 h-5 w-5" />{deliveryMode}</span>
              <span className="rounded-lg border border-[#e7e9ee] bg-[#f8fafc] p-3 text-[#111827]"><Clock3 className="mx-auto mb-1 h-5 w-5" />1-15 min</span>
            </div>
          </aside>

          <section>
            <p className="text-sm text-[#697081]">{t("home")} \ {labels.shop} \ {productCategory}</p>
            <h1 className="mt-3 text-3xl font-black leading-tight md:text-4xl">{product.name}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-4 border-b border-[#e6e8ef] pb-6 text-sm">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#0b55d9]" />{labels.bestPrice}</span>
              <span className="hidden h-7 w-px bg-[#e6e8ef] sm:block" />
              <span className="inline-flex items-center gap-2"><CreditCard className="h-5 w-5 text-[#0b55d9]" />{labels.securePayment}</span>
              <span className="hidden h-7 w-px bg-[#e6e8ef] sm:block" />
              <span className="inline-flex items-center gap-2"><Truck className="h-5 w-5 text-[#0b55d9]" />{deliveryMode}</span>
            </div>

            {regions.length > 1 ? (
              <section className="mt-7">
                <h2 className="text-base font-black">{labels.region}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {regions.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => {
                        setSelectedRegion(region);
                        const nextVariation = variations.find((variation) => variationRegion(variation) === region);
                        setSelectedVariationKey(nextVariation ? variationKey(nextVariation, variations.indexOf(nextVariation)) : "");
                      }}
                      className={`h-10 rounded border px-3 text-sm font-bold transition ${region === selectedRegion ? "border-[#0b55d9] bg-[#eff6ff] text-[#0b55d9]" : "border-[#cfd4df] bg-white hover:border-[#0b55d9]"}`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-7">
              <h2 className="text-base font-black">{labels.selectAmount}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {visibleVariations.map((variation, index) => {
                  const key = variationKey(variation, index);
                  const active = key === (selectedVariationKey || variationKey(visibleVariations[0], 0));

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedVariationKey(key)}
                      className={`min-h-[44px] rounded border px-3 py-2 text-left text-sm transition ${active ? "border-[#0b55d9] bg-[#eff6ff] text-[#0b55d9]" : "border-[#cfd4df] bg-white hover:border-[#ef2b2d]"}`}
                    >
                      <span className="block font-bold">{variationAmountLabel(variation)}</span>
                      <span className="block text-xs text-[#697081]">{formatMoney(variationDisplayPrice(variation, product), variation.currency ?? product.currency, { unavailableLabel: labels.unavailablePrice })}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-6 max-w-[920px]">
              <p className="text-sm leading-7 text-[#374151]">
                {product.description?.replace(/<[^>]*>/g, "") || (isFrench ? `Recharge ${product.game} via Astral4Gamer. Sélectionne le montant, renseigne ton identifiant joueur puis finalise le paiement.` : `${product.game} top-up via Astral4Gamer. Select the amount, enter your player ID, then complete payment.`)}
              </p>
              <p className="mt-3 text-xs font-semibold text-[#697081]">{labels.productRef}: {publicProductReference(product)}</p>
            </section>

            <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-[#e6e8ef] pt-6">
              <div className="flex h-12 items-center rounded bg-[#f4f4f5] px-3">
                <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuer"><Minus className="h-4 w-4" /></button>
                <span className="mx-4 font-black">{quantity}</span>
                <button onClick={() => setQuantity((value) => value + 1)} aria-label="Augmenter"><Plus className="h-4 w-4" /></button>
              </div>
              <strong className="text-2xl font-black text-[#ef2b2d]">{formatMoney(total, unitPriceCurrency, { unavailableLabel: labels.unavailablePrice })}</strong>
              <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
                <button type="button" onClick={addSelectedItemToCart} disabled={!canPay} className="interactive-button flex h-12 w-full items-center justify-center gap-2 rounded border border-[#0b55d9] bg-white px-5 text-sm font-bold text-[#0b55d9] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                  <ShoppingCart className="h-4 w-4" />
                  {cartFeedback ? t("addedToCart") : t("addToCart")}
                </button>
                <button type="button" onClick={openCheckout} disabled={status === "loading" || !canPay} className="interactive-button flex h-12 w-full items-center justify-center gap-2 rounded bg-[#0b55d9] px-6 text-sm font-black text-white shadow-[0_12px_30px_rgba(11,85,217,.18)] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[190px]">
                <CreditCard className="h-4 w-4" />
                  {t("payNow")}
                </button>
              </div>
            </div>

            {message && (
              <p className={`mt-5 rounded-lg p-4 text-sm font-semibold ${status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                {message}
              </p>
            )}
          </section>
        </div>
      </section>

      {checkoutOpen ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 pt-10 backdrop-blur-sm sm:grid sm:place-items-center sm:px-3 sm:py-6" role="dialog" aria-modal="true" aria-label={labels.confirmPay}>
          <section className="flex max-h-[calc(100dvh-2.5rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_28px_80px_rgba(0,0,0,.28)] sm:max-h-[92vh] sm:rounded-lg">
            <div className="overflow-y-auto overscroll-contain p-4 pb-2 sm:p-7 sm:pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">{labels.checkoutTitle}</h2>
                <p className="mt-1 text-sm leading-6 text-[#4b5563]">
                  {requiresUid ? labels.checkoutHintUid : labels.checkoutHintPayment}
                </p>
              </div>
              <button type="button" onClick={() => setCheckoutOpen(false)} className="interactive-icon grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-[#f4f4f5] active:scale-95" aria-label={labels.close}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {requiresUid && !hasDynamicFields && suggestedProfile ? (
              <div className={`mt-5 rounded-lg border p-3 ${useSuggestedProfile ? "border-[#0b55d9] bg-[#eff6ff]" : "border-[#e5e7eb] bg-white"}`}>
                <button
                  type="button"
                  onClick={() => {
                    setUseSuggestedProfile(true);
                    setGameUid(suggestedProfile.uid);
                    setNickname(suggestedProfile.nickname);
                    setVerifiedProfile(suggestedProfile);
                    setStatus("verified");
                  }}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <AccountSummary profile={suggestedProfile} compact />
                  <CheckCircle2 className={`h-5 w-5 ${useSuggestedProfile ? "text-[#0b55d9]" : "text-[#d0d5dd]"}`} />
                </button>
              </div>
            ) : null}

            {requiresUid && hasDynamicFields ? (
              <div className="mt-5 grid gap-3">
                {requiredFields.map((field, index) => {
                  const key = fieldKey(field, index);
                  const options = field.options ?? [];

                  return (
                    <label key={key} className="block">
                      <span className="text-sm font-bold">{fieldLabel(field, index)} <span className="text-[#ef2b2d]">*</span></span>
                      {options.length ? (
                        <select
                          value={supplierFields[key] ?? ""}
                          onChange={(event) => setSupplierFields((current) => ({ ...current, [key]: event.target.value }))}
                          className="mt-2 h-12 w-full rounded border border-[#d8dde8] px-3 text-sm outline-none focus:border-[#0b55d9]"
                        >
                          <option value="">{labels.select}</option>
                          {options.map((option, optionIndex) => (
                            <option key={`${key}-${optionIndex}`} value={optionValue(option)}>{optionLabel(option)}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === "password" ? "password" : field.type === "email" ? "email" : "text"}
                          value={supplierFields[key] ?? ""}
                          onChange={(event) => setSupplierFields((current) => ({ ...current, [key]: event.target.value }))}
                          className="mt-2 h-12 w-full rounded border border-[#0b55d9] px-4 outline-none"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            ) : requiresUid ? (
              <div className="mt-5">
                {suggestedProfile ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUseSuggestedProfile(false);
                      setVerifiedProfile(null);
                      setGameUid("");
                      setNickname("");
                      setStatus("idle");
                    }}
                    className="text-sm font-black text-[#0b55d9]"
                  >
                    {labels.changeId}
                  </button>
                ) : null}
                {(!suggestedProfile || !useSuggestedProfile) ? (
                  <div className="mt-3 grid gap-3">
                    <label>
                      <span className="text-sm font-bold">{labels.userId} <span className="text-[#ef2b2d]">*</span></span>
                      <input value={gameUid} onChange={(event) => setGameUid(event.target.value)} className="mt-2 h-12 w-full rounded border border-[#0b55d9] px-4 outline-none" />
                    </label>
                    <button type="button" onClick={verifyUid} disabled={status === "loading"} className="interactive-button flex h-12 items-center justify-center rounded bg-[#0b55d9] text-sm font-black text-white active:scale-[.98] disabled:opacity-60">
                      {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {labels.fetchAccount}
                    </button>
                  </div>
                ) : null}

                {verifiedProfile ? (
                  <div className="mt-4">
                    <AccountSummary profile={verifiedProfile} />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase">{labels.paymentEmail}</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full rounded border border-[#d8dde8] px-3 text-sm outline-none focus:border-[#0b55d9]" placeholder="client@example.com" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase">{labels.phone}</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 h-11 w-full rounded border border-[#d8dde8] px-3 text-sm outline-none focus:border-[#0b55d9]" placeholder="+228..." />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase">{labels.firstName}</span>
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-2 h-11 w-full rounded border border-[#d8dde8] px-3 text-sm outline-none focus:border-[#0b55d9]" placeholder="Prénom" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase">{labels.lastName}</span>
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-2 h-11 w-full rounded border border-[#d8dde8] px-3 text-sm outline-none focus:border-[#0b55d9]" placeholder="Nom" />
              </label>
            </div>

            {message ? <p className={`mt-4 rounded-lg p-3 text-sm font-semibold ${status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</p> : null}

            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e6e8ef] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(15,23,42,.06)] sm:px-7 sm:pb-5">
              <div>
                <p className="text-xs font-bold text-[#667085]">{labels.total}</p>
                <b className="text-xl text-[#ef2b2d]">{formatMoney(total, unitPriceCurrency, { unavailableLabel: labels.unavailablePrice })}</b>
              </div>
              <button type="button" onClick={prepareOrder} disabled={status === "loading" || (!hasDynamicFields && requiresUid && !verifiedProfile)} className="interactive-button flex h-12 min-w-0 flex-1 items-center justify-center rounded bg-[#0b55d9] px-4 text-sm font-black text-white active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[180px] sm:flex-none sm:px-5">
                {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {labels.confirmPay}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {recommended.length ? (
        <section className="mx-auto max-w-[1586px] px-3 pb-10 sm:px-6 md:pb-14">
          <h2 className="mb-5 text-xl font-black">{labels.recommended}</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4 xl:grid-cols-6">
            {recommended.map((item) => (
              <a key={item.id} href={`/product/${item.id}`} className="min-w-0 rounded-lg border border-[#ececf3] p-1.5 transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(17,24,39,.08)] md:p-3">
                <img src={productImage(item)} alt={item.name} onError={(event) => {
                  event.currentTarget.src = catalogFallbackImage(item);
                }} className="aspect-square rounded object-cover" />
                <b className="mt-2 line-clamp-2 block min-h-[30px] text-[10.5px] leading-[15px] md:mt-3 md:min-h-0 md:text-sm md:leading-5">{item.name}</b>
                <small className="mt-1 block truncate text-[10px] font-bold text-[#697081] md:mt-2 md:text-xs">{formatMoney(productBasePrice(item), item.currency, { unavailableLabel: labels.unavailablePrice })}</small>
              </a>
            ))}
          </div>
        </section>
      ) : null}
        </>
      )}
    </main>
  );
}
