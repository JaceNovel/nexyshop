import { NextResponse } from "next/server";
import { getPubgProfile } from "@/lib/server/pubg";

export async function POST(request: Request) {
  try {
    const { gameId, platform } = await request.json();
    const payload = await getPubgProfile(String(gameId ?? ""), String(platform ?? "steam"));
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Profil PUBG indisponible." },
      { status: 422 }
    );
  }
}
