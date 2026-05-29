"use client";

import { ChevronDown, Eye, EyeOff, Gamepad2, Gift, Globe2, Lock, Mail, ShieldCheck, Trophy, Users } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useSignUp } from "@clerk/nextjs/legacy";
import { getFreeFireProfile, type FreeFireProfile } from "@/lib/api";

const brandLogo = "/ChatGPT_Image_28_mai_2026__20_26_02-removebg-preview.png";
const heroImage = "/ChatGPT Image 28 mai 2026, 15_36_59.png";

const COUNTRY_CODES = [
  "AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", "AU", "AT", "AZ",
  "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", "BO", "BQ", "BA", "BW", "BV", "BR",
  "IO", "BN", "BG", "BF", "BI", "KH", "CM", "CA", "CV", "KY", "CF", "TD", "CL", "CN", "CX", "CC",
  "CO", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CU", "CW", "CY", "CZ", "DK", "DJ", "DM", "DO",
  "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF",
  "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY",
  "HT", "HM", "VA", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT", "JM",
  "JP", "JE", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY",
  "LI", "LT", "LU", "MO", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX",
  "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NC", "NZ", "NI",
  "NE", "NG", "NU", "NF", "MK", "MP", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH",
  "PN", "PL", "PT", "PR", "QA", "RE", "RO", "RU", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC",
  "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS",
  "SS", "ES", "LK", "SD", "SR", "SJ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK",
  "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU",
  "VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW", "XK"
];

const countryNameFormatter = new Intl.DisplayNames(["fr"], { type: "region" });
const countries = COUNTRY_CODES.map((code) => ({
  code,
  flagUrl: getFlagUrl(code),
  name: countryNameFormatter.of(code) ?? code
})).sort((first, second) => first.name.localeCompare(second.name, "fr"));

const favoriteGames = [
  { value: "free_fire", label: "Free Fire" },
  { value: "other", label: "Autre" }
] as const;

const freeFireRegions = [
  ["sg", "Singapour"], ["in", "Inde"], ["br", "Brésil"], ["pk", "Pakistan"], ["bd", "Bangladesh"],
  ["me", "Moyen-Orient"], ["th", "Thaïlande"], ["vn", "Vietnam"], ["tw", "Taïwan"], ["ru", "Russie"],
  ["id", "Indonésie"], ["us", "États-Unis"], ["cis", "CIS"]
] as const;

export default function InscriptionPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [favoriteGame, setFavoriteGame] = useState<"free_fire" | "other">("free_fire");
  const [freeFireUid, setFreeFireUid] = useState("");
  const [freeFireRegion, setFreeFireRegion] = useState("sg");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [submitStage, setSubmitStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signUp) return;

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!acceptedTerms) {
      setError("Tu dois accepter les conditions d'utilisation.");
      return;
    }

    if (!country) {
      setError("Sélectionne ton pays ou ta région.");
      return;
    }

    if (favoriteGame === "free_fire" && !freeFireUid.trim()) {
      setError("Entre ton ID Free Fire.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStage(favoriteGame === "free_fire" ? "Vérification Free Fire..." : "Création du compte...");
    setError(null);

    try {
      let freeFireProfile: FreeFireProfile | null = null;

      if (favoriteGame === "free_fire") {
        try {
          freeFireProfile = await getFreeFireProfile(freeFireUid.trim(), freeFireRegion);
        } catch (freeFireError) {
          const message = freeFireError instanceof Error ? freeFireError.message : "ID incorrect";
          setError(message.toLowerCase().includes("incorrect") ? "ID incorrect" : message);
          return;
        }
      }

      const gameMetadata = {
        favorite_game: favoriteGame,
        country,
        free_fire: freeFireProfile
          ? {
              uid: freeFireProfile.uid,
              region: freeFireProfile.region,
              nickname: freeFireProfile.nickname,
              level: freeFireProfile.level,
              likes: freeFireProfile.likes,
              br_rank_points: freeFireProfile.br_rank_points,
              cs_rank_points: freeFireProfile.cs_rank_points,
              outfit_url: freeFireProfile.outfit_url,
              banner_url: freeFireProfile.banner_url
            }
          : null
      };

      setSubmitStage("Création du compte...");
      localStorage.setItem("astral_favorite_game", favoriteGame);
      if (gameMetadata.free_fire) {
        localStorage.setItem("astral_freefire_profile", JSON.stringify(gameMetadata.free_fire));
      } else {
        localStorage.removeItem("astral_freefire_profile");
      }

      const result = await signUp.create({
        emailAddress: email,
        password,
        unsafeMetadata: gameMetadata
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/profil";
        return;
      }

      if (result.status === "missing_requirements") {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setNeedsEmailVerification(true);
        setSubmitStage(null);
        setError(null);
        return;
      }

      setError("Inscription incomplète. Vérifie tes informations.");
    } catch (requestError) {
      setError(getClerkError(requestError));
    } finally {
      setIsSubmitting(false);
      setSubmitStage(null);
    }
  }

  async function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signUp) return;

    if (!verificationCode.trim()) {
      setError("Entre le code reçu par e-mail.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode.trim() });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/profil";
        return;
      }

      setError("Code accepté mais inscription incomplète. Réessaie.");
    } catch (requestError) {
      setError(getClerkError(requestError));
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleSocialSignUp(strategy: "oauth_google" | "oauth_facebook" | "oauth_discord") {
    if (!isLoaded || !signUp) return;

    setError(null);

    try {
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/profil"
      });
    } catch (requestError) {
      setError(getClerkError(requestError));
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-white text-[#111827]">
      <section className="mx-auto grid h-screen max-w-[1360px] grid-rows-[auto_1fr] px-4 py-4 sm:px-6 lg:px-10">
        <header className="flex items-center justify-between gap-6">
          <a href="/" className="inline-flex items-center gap-3" aria-label="Astral4Gamer">
            <span className="relative h-[64px] w-[64px] shrink-0 overflow-hidden">
              <img src={brandLogo} alt="" className="absolute left-[-48px] top-[-9px] h-auto w-[154px] max-w-none" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[25px] font-black italic text-black">
                ASTRAL<span className="text-[#ff1f2f]">4</span>GAMER
              </span>
              <span className="mt-2 text-center text-[8px] font-black tracking-[.42em] text-black">
                <span className="text-[#ff1f2f]">PLAY</span> • COMPETE • WIN
              </span>
            </span>
          </a>
          <div className="flex items-center gap-3 text-[12px] font-medium text-[#111827]">
            <span className="hidden sm:inline">Déjà un compte ?</span>
            <a href="/connexion" className="inline-flex h-9 items-center justify-center rounded-lg border border-[#ff8a93] px-4 text-[12px] font-black text-[#ff1f2f] transition hover:bg-[#ff1f2f] hover:text-white">
              Se connecter
            </a>
          </div>
        </header>

        <div className="grid min-h-0 items-center gap-6 py-3 lg:grid-cols-[minmax(0,1fr)_600px] lg:py-4">
          <section className="relative hidden min-h-0 lg:block">
            <div className="relative z-10 max-w-[540px]">
              <h1 className="text-[34px] font-black leading-[1.18] tracking-normal text-[#111827] xl:text-[40px]">
                Rejoins l’univers
                <br />
                ASTRAL<span className="text-[#ff1f2f]">4</span>GAMER
              </h1>
              <p className="mt-4 max-w-[460px] text-[13px] font-medium leading-6 text-[#5b6472]">
                Crée ton compte et profite d’une expérience gaming unique : tournois, récompenses, produits exclusifs et bien plus encore !
              </p>
            </div>

            <div className="relative mt-2 h-[400px] max-w-[620px] xl:h-[430px]">
              <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-contain object-bottom" />
              <FeatureCard className="left-0 top-[102px]" icon={<Trophy className="h-4 w-4" />} title="Tournois" text="Participe & Gagne" />
              <FeatureCard className="right-[10px] top-[132px]" icon={<Users className="h-4 w-4" />} title="Communauté" text="Rejoins des gamers" />
              <FeatureCard className="bottom-[72px] left-0" icon={<Lock className="h-4 w-4" />} title="Boutique" text="Produits exclusifs" />
              <FeatureCard className="bottom-[46px] right-[28px]" icon={<Gift className="h-4 w-4" />} title="Récompenses" text="Points et bonus" />
            </div>
          </section>

          <section className="mx-auto w-full max-w-[600px] rounded-xl border border-[#eef0f4] bg-white px-5 py-5 shadow-[0_18px_56px_rgba(17,24,39,.10)] sm:px-8 lg:px-9">
            <div className="text-center">
              <h2 className="text-[26px] font-black tracking-normal text-[#111827]">Créer un compte</h2>
              <p className="mt-2 text-[12px] font-medium text-[#6b7280]">
                Rejoins la communauté <span className="font-black text-[#ff1f2f]">ASTRAL4GAMER</span>
              </p>
            </div>

            {needsEmailVerification ? (
              <form onSubmit={handleVerifyEmail} className="mt-5 space-y-4">
                <div className="rounded-lg border border-[#ffd6db] bg-red-50 px-4 py-3">
                  <p className="text-[13px] font-black text-[#111827]">Vérifie ton e-mail</p>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-[#6b7280]">
                    Clerk a envoyé un code à <span className="font-black text-[#ff1f2f]">{email}</span>.
                  </p>
                </div>

                <Field label="Code de vérification" icon={<ShieldCheck className="h-4 w-4" />}>
                  <input
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    className="h-full flex-1 bg-transparent text-[15px] font-black tracking-[0.2em] text-[#111827] outline-none placeholder:tracking-normal placeholder:text-[#9aa3b2]"
                    placeholder="Entre le code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </Field>

                {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-[#b91c1c]">{error}</p> : null}

                <button disabled={!isLoaded || isVerifying} type="submit" className="h-11 w-full rounded-lg bg-[#ff1f2f] text-[13px] font-black text-white shadow-[0_12px_26px_rgba(255,31,47,.18)] transition hover:bg-[#e51b2a] disabled:cursor-not-allowed disabled:opacity-70">
                  {isVerifying ? "Vérification..." : "Valider le code"}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    await signUp?.prepareEmailAddressVerification({ strategy: "email_code" });
                  }}
                  className="h-10 w-full rounded-lg border border-[#d8dde7] bg-white text-[12px] font-black text-[#111827] transition hover:border-[#ff8a93]"
                >
                  Renvoyer le code
                </button>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <Field label="Sélectionne ton jeu favori" icon={<Gamepad2 className="h-4 w-4" />}>
                <select value={favoriteGame} onChange={(event) => setFavoriteGame(event.target.value as "free_fire" | "other")} className="h-full flex-1 appearance-none bg-transparent text-[13px] font-black text-[#111827] outline-none">
                  {favoriteGames.map((game) => (
                    <option key={game.value} value={game.value}>{game.label}</option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 text-[#475569]" />
              </Field>

              {favoriteGame === "free_fire" ? (
                <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
                  <Field label="ID Free Fire" icon={<Gamepad2 className="h-4 w-4" />}>
                    <input value={freeFireUid} onChange={(event) => setFreeFireUid(event.target.value)} className="h-full flex-1 bg-transparent text-[13px] font-medium text-[#111827] outline-none placeholder:text-[#9aa3b2]" placeholder="Entre ton ID joueur" inputMode="numeric" required />
                  </Field>
                  <Field label="Région" icon={<Globe2 className="h-4 w-4" />}>
                    <select value={freeFireRegion} onChange={(event) => setFreeFireRegion(event.target.value)} className="h-full flex-1 appearance-none bg-transparent text-[13px] font-black text-[#111827] outline-none">
                      {freeFireRegions.map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-[#475569]" />
                  </Field>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="E-mail" icon={<Mail className="h-4 w-4" />}>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="h-full flex-1 bg-transparent text-[13px] font-medium text-[#111827] outline-none placeholder:text-[#9aa3b2]" placeholder="Entrez votre e-mail" autoComplete="email" required />
                </Field>
                <div className="relative">
                  <span className="text-[12px] font-black text-[#111827]">Pays / Région</span>
                  <button
                    type="button"
                    onClick={() => setCountryOpen((current) => !current)}
                    className="mt-2 flex h-11 w-full items-center rounded-lg border border-[#d8dde7] bg-white px-3 text-left text-[#111827] transition hover:border-[#ff8a93] focus:border-[#ff1f2f] focus:outline-none focus:ring-4 focus:ring-red-500/10"
                  >
                    <Globe2 className="mr-2 h-4 w-4" />
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-bold">
                      {country ? (
                        <>
                          <CountryFlag code={country} name={countries.find((item) => item.code === country)?.name ?? country} />
                          <span className="truncate">{countries.find((item) => item.code === country)?.name}</span>
                        </>
                      ) : (
                        <span className="text-[#475569]">Sélectionnez votre pays</span>
                      )}
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-[#475569] transition ${countryOpen ? "rotate-180" : ""}`} />
                  </button>

                  {countryOpen ? (
                    <div className="absolute left-0 right-0 top-[68px] z-50 max-h-[190px] overflow-y-auto rounded-lg border border-[#d8dde7] bg-white py-1 shadow-[0_18px_42px_rgba(17,24,39,.16)]">
                      {countries.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => {
                            setCountry(item.code);
                            setCountryOpen(false);
                          }}
                          className={`flex h-9 w-full items-center gap-3 px-3 text-left text-[13px] font-bold transition hover:bg-red-50 hover:text-[#ff1f2f] ${country === item.code ? "bg-red-50 text-[#ff1f2f]" : "text-[#111827]"}`}
                        >
                          <CountryFlag code={item.code} name={item.name} />
                          <span className="truncate">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <Field label="Mot de passe" icon={<Lock className="h-4 w-4" />}>
                <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} className="h-full flex-1 bg-transparent text-[13px] font-medium text-[#111827] outline-none placeholder:text-[#9aa3b2]" placeholder="Créez un mot de passe" autoComplete="new-password" required />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="grid h-8 w-8 place-items-center text-[#7a8494]" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </Field>

              <Field label="Confirmer le mot de passe" icon={<Lock className="h-4 w-4" />}>
                <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showConfirmPassword ? "text" : "password"} className="h-full flex-1 bg-transparent text-[13px] font-medium text-[#111827] outline-none placeholder:text-[#9aa3b2]" placeholder="Confirmez votre mot de passe" autoComplete="new-password" required />
                <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="grid h-8 w-8 place-items-center text-[#7a8494]" aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </Field>

              <label className="flex items-start gap-2 text-[12px] font-medium leading-5 text-[#111827]">
                <input checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} type="checkbox" className="mt-1 h-3.5 w-3.5 rounded border-[#d8dde7] accent-[#ff1f2f]" />
                <span>
                  J’accepte les <a href="/conditions" className="font-black text-[#ff1f2f]">Conditions d’utilisation</a> et la <a href="/confidentialite" className="font-black text-[#ff1f2f]">Politique de confidentialité</a>
                </span>
              </label>

	              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-[#b91c1c]">{error}</p> : null}
	              {submitStage && !error ? <p className="rounded-lg bg-[#fff4d6] px-3 py-2 text-[12px] font-black text-[#8a5a00]">{submitStage}</p> : null}

	              <div id="clerk-captcha" className="flex justify-center" />

	              <button disabled={!isLoaded || isSubmitting} type="submit" className="h-11 w-full rounded-lg bg-[#ff1f2f] text-[13px] font-black text-white shadow-[0_12px_26px_rgba(255,31,47,.18)] transition hover:bg-[#e51b2a] disabled:cursor-not-allowed disabled:opacity-70">
	                {isSubmitting ? submitStage ?? "Création..." : "Créer un compte"}
	              </button>
            </form>
            )}

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#e5e7eb]" />
              <span className="text-[12px] font-medium text-[#9aa3b2]">ou continuer avec</span>
              <span className="h-px flex-1 bg-[#e5e7eb]" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <SocialButton label="Google" provider="google" onClick={() => handleSocialSignUp("oauth_google")} />
              <SocialButton label="Facebook" provider="facebook" onClick={() => handleSocialSignUp("oauth_facebook")} />
              <SocialButton label="Discord" provider="discord" onClick={() => handleSocialSignUp("oauth_discord")} />
            </div>

            <p className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium text-[#8a93a3]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Connexion sécurisée & données protégées
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-black text-[#111827]">{label}</span>
      <span className="mt-2 flex h-11 items-center rounded-lg border border-[#d8dde7] px-3 text-[#9aa3b2] transition focus-within:border-[#ff1f2f] focus-within:ring-4 focus-within:ring-red-500/10">
        <span className="mr-2">{icon}</span>
        {children}
      </span>
    </label>
  );
}

function FeatureCard({ icon, title, text, className }: { icon: ReactNode; title: string; text: string; className: string }) {
  return (
    <div className={`absolute hidden min-h-[62px] w-[158px] items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-[0_14px_34px_rgba(17,24,39,.12)] lg:flex ${className}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-[#ff1f2f]">{icon}</span>
      <span>
        <b className="block text-[12px] font-black text-[#111827]">{title}</b>
        <small className="mt-0.5 block text-[10px] font-semibold leading-4 text-[#5f6878]">{text}</small>
      </span>
    </div>
  );
}

function SocialButton({ label, provider, onClick }: { label: string; provider: "google" | "facebook" | "discord"; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe4ec] bg-white px-2 text-[12px] font-black text-[#111827] transition hover:border-[#ff1f2f] hover:text-[#ff1f2f]">
      <ProviderIcon provider={provider} />
      {label}
    </button>
  );
}

function ProviderIcon({ provider }: { provider: "google" | "facebook" | "discord" }) {
  if (provider === "google") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z" />
      </svg>
    );
  }

  if (provider === "facebook") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.53-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#5865F2" d="M20.32 4.37A19.79 19.79 0 0 0 15.36 2.8a13.78 13.78 0 0 0-.64 1.32 18.27 18.27 0 0 0-5.44 0 12.64 12.64 0 0 0-.65-1.32 19.74 19.74 0 0 0-4.96 1.57C.54 9.06-.32 13.63.1 18.13a19.93 19.93 0 0 0 6.08 3.07 14.6 14.6 0 0 0 1.3-2.1 12.91 12.91 0 0 1-2.05-.98c.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.14 0c.17.14.33.27.5.4-.65.39-1.33.72-2.06.98.38.74.82 1.45 1.3 2.1a19.86 19.86 0 0 0 6.09-3.07c.5-5.22-.86-9.75-3.58-13.76ZM8.02 15.36c-1.18 0-2.16-1.09-2.16-2.42s.95-2.42 2.16-2.42c1.2 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.96 0c-1.18 0-2.16-1.09-2.16-2.42s.95-2.42 2.16-2.42c1.2 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Z" />
    </svg>
  );
}

function CountryFlag({ code, name }: { code: string; name: string }) {
  const src = getFlagUrl(code);

  return (
    <span className="grid h-5 w-7 shrink-0 place-items-center overflow-hidden rounded-[3px] bg-[#f1f5f9] shadow-[inset_0_0_0_1px_rgba(15,23,42,.10)]">
      {src ? (
        <img src={src} alt={`Drapeau ${name}`} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="text-[10px] font-black text-[#111827]">{code}</span>
      )}
    </span>
  );
}

function getFlagUrl(countryCode: string) {
  if (countryCode === "XK") return "https://flagcdn.com/w40/xk.png";
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
}

function getClerkError(error: unknown) {
  const clerkError = error as { errors?: { longMessage?: string; message?: string }[] };
  return clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? "Inscription impossible pour le moment.";
}
