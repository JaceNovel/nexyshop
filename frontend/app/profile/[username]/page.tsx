import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CountryFlag } from "@/components/country-flag";
import { ShareProfileButton } from "@/components/share-profile-button";
import { API_BASE_URL } from "@/lib/api";

type PublicProfile = {
  username: string;
  display_name?: string | null;
  avatar: string | null;
  game?: string | null;
  player_uid?: string | null;
  rank: string | null;
  points: number;
  guild: string | null;
  wins: number;
  tournaments_won: number;
  kd_ratio: number | null;
  badges: unknown[];
  country: string | null;
  free_fire?: {
    uid?: string | null;
    region?: string | null;
    nickname?: string | null;
    level?: number | string | null;
    likes?: number | string | null;
    br_rank_points?: number | string | null;
    cs_rank_points?: number | string | null;
    outfit_url?: string | null;
    banner_url?: string | null;
  } | null;
  call_of_duty?: {
    username?: string | null;
    cod_username?: string | null;
    activision_id?: string | null;
    avatar_url?: string | null;
    linked?: boolean | null;
    provider?: string | null;
    verification_status?: string | null;
    account?: {
      created_at?: string | null;
      uno_id?: string | null;
      user_id?: string | null;
    } | null;
  } | null;
  created_at: string | null;
};

async function getPublicProfile(username: string): Promise<PublicProfile> {
  const response = await fetch(`${API_BASE_URL}/api/public/profiles/${encodeURIComponent(username)}`, {
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    notFound();
  }

  return response.json();
}

function formatMemberSince(createdAt?: string | null) {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const canonical = `https://astral4gamer.com/profile/${encodeURIComponent(username)}`;

  return {
    title: `Profil ASTRAL4GAMER — ${username}`,
    description: `Découvre le profil, les stats, les tournois et les achievements de ${username} sur ASTRAL4GAMER.`,
    alternates: { canonical },
    openGraph: {
      title: `Profil ASTRAL4GAMER — ${username}`,
      description: `Découvre le profil, les stats, les tournois et les achievements de ${username} sur ASTRAL4GAMER.`,
      url: canonical,
      images: [{ url: `/api/og/profile/${encodeURIComponent(username)}`, width: 1200, height: 630 }]
    },
    twitter: {
      card: "summary_large_image",
      title: `Profil ASTRAL4GAMER — ${username}`,
      description: `Découvre le profil, les stats, les tournois et les achievements de ${username} sur ASTRAL4GAMER.`,
      images: [`/api/og/profile/${encodeURIComponent(username)}`]
    }
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  const memberSince = formatMemberSince(profile.created_at);
  const displayName = profile.display_name || profile.free_fire?.nickname || profile.call_of_duty?.cod_username || profile.call_of_duty?.username || profile.username;

  return (
    <main className="min-h-screen bg-[#05070c] text-white">
      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-8 shadow-[0_26px_80px_rgba(0,0,0,.55)]">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#ff1f2f]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#ff1f2f]/15 blur-3xl" />

          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-6">
              <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-[5px] border-[#ff1f2f]/90 bg-white/5">
                {profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-[#0b1220] text-3xl font-black">{profile.username.slice(0, 1).toUpperCase()}</div>
                )}
              </div>
              <div>
                <p className="text-xs font-black tracking-widest text-white/60">ASTRAL4GAMER</p>
                <h1 className="mt-2 text-3xl font-black">{displayName}</h1>
                {displayName !== profile.username ? <p className="mt-1 text-sm font-bold text-white/55">@{profile.username}</p> : null}
                <p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-white/70">
                  {profile.country ? (
                    <span className="inline-flex items-center gap-2">
                      <CountryFlag code={profile.country} label={profile.country} />
                      <span className="uppercase">{profile.country}</span>
                    </span>
                  ) : null}
                  {memberSince ? <span>📅 Membre depuis {memberSince}</span> : null}
                </p>
              </div>
            </div>

            <ShareProfileButton
              username={profile.username}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/10"
            />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Rang actuel" value={profile.rank ?? "—"} />
            <Stat label="Points" value={String(profile.points ?? 0)} />
            <Stat label="Tournois gagnés" value={String(profile.tournaments_won ?? 0)} />
            <Stat label="K/D moyen" value={profile.kd_ratio !== null ? String(profile.kd_ratio) : "—"} />
            <Stat label="Victoires" value={String(profile.wins ?? 0)} />
            <Stat label="Guilde" value={profile.guild ?? "—"} />
          </div>

          {profile.free_fire ? (
            <div className="mt-8 overflow-hidden rounded-xl border border-[#ff1f2f]/25 bg-[#12070a]">
              <div className="grid gap-0 md:grid-cols-[1.2fr_.8fr]">
                <div className="p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#ff6b75]">Profil Free Fire</p>
                  <h2 className="mt-2 text-2xl font-black">{profile.free_fire.nickname || displayName}</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Stat label="UID" value={profile.free_fire.uid || profile.player_uid || "—"} />
                    <Stat label="Région" value={(profile.free_fire.region || "—").toUpperCase()} />
                    <Stat label="Niveau" value={profile.free_fire.level !== null && profile.free_fire.level !== undefined ? String(profile.free_fire.level) : "—"} />
                    <Stat label="Likes" value={profile.free_fire.likes !== null && profile.free_fire.likes !== undefined ? String(profile.free_fire.likes) : "—"} />
                    <Stat label="BR points" value={profile.free_fire.br_rank_points !== null && profile.free_fire.br_rank_points !== undefined ? String(profile.free_fire.br_rank_points) : "—"} />
                    <Stat label="CS points" value={profile.free_fire.cs_rank_points !== null && profile.free_fire.cs_rank_points !== undefined ? String(profile.free_fire.cs_rank_points) : "—"} />
                  </div>
                </div>
                <div className="relative min-h-64 bg-black/35">
                  {profile.free_fire.banner_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.free_fire.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
                  ) : null}
                  {profile.free_fire.outfit_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.free_fire.outfit_url} alt="" className="relative z-10 mx-auto h-64 w-full object-contain p-4" />
                  ) : (
                    <div className="relative z-10 grid h-full min-h-64 place-items-center text-sm font-black text-white/45">VISUEL</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {profile.call_of_duty ? (
            <div className="mt-8 overflow-hidden rounded-xl border border-[#60a5fa]/25 bg-[#07111f]">
              <div className="grid gap-0 md:grid-cols-[1.1fr_.9fr]">
                <div className="p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#93c5fd]">Profil Call of Duty Mobile</p>
                  <h2 className="mt-2 text-2xl font-black">{profile.call_of_duty.cod_username || profile.call_of_duty.username || displayName}</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Stat label="ID Activision" value={profile.call_of_duty.activision_id || profile.player_uid || "—"} />
                    <Stat label="Fournisseur" value={profile.call_of_duty.provider || "Activision"} />
                    <Stat label="Statut" value={profile.call_of_duty.verification_status || (profile.call_of_duty.linked ? "Compte lié" : "Profil créé")} />
                    <Stat label="Création" value={profile.call_of_duty.account?.created_at || profile.created_at || "—"} />
                    <Stat label="UNO ID" value={profile.call_of_duty.account?.uno_id || "—"} />
                    <Stat label="User ID" value={profile.call_of_duty.account?.user_id || "—"} />
                  </div>
                </div>
                <div className="relative grid min-h-64 place-items-center bg-black/35 p-6">
                  {profile.call_of_duty.avatar_url || profile.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.call_of_duty.avatar_url || profile.avatar || ""} alt="" className="h-44 w-44 rounded-2xl object-cover shadow-[0_20px_50px_rgba(0,0,0,.35)]" />
                  ) : (
                    <div className="grid h-44 w-44 place-items-center rounded-2xl bg-[#111827] text-5xl font-black">{displayName.slice(0, 1).toUpperCase()}</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-black text-white">VOIR LE PROFIL COMPLET</p>
              <p className="mt-1 text-xs font-semibold text-white/65">Stats, tournois, achievements, classements…</p>
            </div>
            <a
              href={`/profil`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#ff1f2f] px-4 text-xs font-black text-white shadow-[0_18px_45px_rgba(255,31,47,.25)]"
            >
              OUVRIR L’APP
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] font-black uppercase tracking-widest text-white/55">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}
