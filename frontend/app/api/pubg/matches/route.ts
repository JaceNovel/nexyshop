import { NextResponse } from "next/server";
import { getPubgRecentMatches } from "@/lib/server/pubg";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const player = searchParams.get("player") ?? "";
    const platform = searchParams.get("platform") ?? "steam";
    const payload = await getPubgRecentMatches(player, platform);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Historique PUBG indisponible." },
      { status: 422 }
    );
  }
}
