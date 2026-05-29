import { ImageResponse } from "next/og";
import { API_BASE_URL } from "@/lib/api";

export const runtime = "edge";

type PublicProfile = {
  username: string;
  avatar: string | null;
  rank: string | null;
  points: number;
  guild: string | null;
  wins: number;
  tournaments_won: number;
  kd_ratio: number | null;
  badges: unknown[];
  country: string | null;
  created_at: string | null;
};

async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const response = await fetch(`${API_BASE_URL}/api/public/profiles/${encodeURIComponent(username)}`, {
    next: { revalidate: 3600 }
  });
  if (!response.ok) return null;
  return response.json();
}

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  const safe = profile ?? {
    username,
    avatar: null,
    rank: null,
    points: 0,
    guild: null,
    wins: 0,
    tournaments_won: 0,
    kd_ratio: null,
    badges: [],
    country: null,
    created_at: null
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "#05070c",
          color: "white",
          position: "relative",
          fontFamily: "ui-sans-serif, system-ui"
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 18% 30%, rgba(255,31,47,.35), transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 85% 70%, rgba(255,31,47,.22), transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(0,0,0,.92), rgba(0,0,0,.65))" }} />

        <div style={{ position: "absolute", left: 70, top: 48, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: "#ff1f2f", boxShadow: "0 0 30px rgba(255,31,47,.55)" }} />
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 1 }}>ASTRAL4GAMER</div>
        </div>

        <div style={{ flex: 1, display: "flex", padding: "120px 70px 70px 70px", gap: 50 }}>
          <div style={{ width: 220, height: 220, borderRadius: 999, border: "10px solid rgba(255,31,47,.9)", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 30px 80px rgba(255,31,47,.15)" }}>
            {safe.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safe.avatar} alt="" width={220} height={220} style={{ width: "220px", height: "220px", objectFit: "cover" }} />
            ) : (
              <div style={{ fontSize: 96, fontWeight: 900, color: "rgba(255,255,255,.92)" }}>{safe.username.slice(0, 1).toUpperCase()}</div>
            )}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}>{safe.username}</div>
              <div style={{ width: 22, height: 22, borderRadius: 999, background: "#ff1f2f" }} />
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ padding: "10px 16px", borderRadius: 999, background: "rgba(255,31,47,.92)", fontSize: 20, fontWeight: 900 }}>JOUEUR PRO</div>
              <div style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.06)", fontSize: 20, fontWeight: 900 }}>
                Rang : {safe.rank ?? "—"}
              </div>
              <div style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.06)", fontSize: 20, fontWeight: 900 }}>
                Points : {String(safe.points ?? 0)}
              </div>
            </div>

            <div style={{ marginTop: 28, display: "flex", gap: 18 }}>
              <StatBox label="Tournois gagnés" value={String(safe.tournaments_won ?? 0)} />
              <StatBox label="Victoires" value={String(safe.wins ?? 0)} />
              <StatBox label="K/D moyen" value={safe.kd_ratio !== null ? String(safe.kd_ratio) : "—"} />
              <StatBox label="Guilde" value={safe.guild ?? "—"} />
            </div>

            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,.72)" }}>
                Découvre stats, tournois & achievements sur ASTRAL4GAMER.
              </div>
              <div style={{ padding: "18px 22px", borderRadius: 16, background: "#ff1f2f", fontSize: 22, fontWeight: 900, boxShadow: "0 30px 80px rgba(255,31,47,.25)" }}>
                VOIR LE PROFIL COMPLET
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ width: 240, borderRadius: 18, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1, color: "rgba(255,255,255,.62)" }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: "rgba(255,255,255,.95)" }}>{value}</div>
    </div>
  );
}

