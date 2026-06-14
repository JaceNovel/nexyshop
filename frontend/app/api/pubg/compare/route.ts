import { NextResponse } from "next/server";
import { getPubgProfile } from "@/lib/server/pubg";

export async function POST(request: Request) {
  try {
    const { players, platform } = await request.json();
    const names = Array.isArray(players) ? players.map(String).filter(Boolean).slice(0, 4) : [];
    const data = await Promise.all(names.map((name) => getPubgProfile(name, String(platform ?? "steam"))));
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Comparateur PUBG indisponible." },
      { status: 422 }
    );
  }
}
