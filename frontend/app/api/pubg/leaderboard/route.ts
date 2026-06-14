import { NextResponse } from "next/server";
import { getPubgLeaderboard } from "@/lib/server/pubg";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season") ?? "lifetime";
    const mode = searchParams.get("mode") ?? "squad-fpp";
    const region = searchParams.get("region") ?? "pc-eu";
    const payload = await getPubgLeaderboard(season, mode, region);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Classement PUBG indisponible." },
      { status: 422 }
    );
  }
}
