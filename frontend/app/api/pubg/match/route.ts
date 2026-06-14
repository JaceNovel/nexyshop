import { NextResponse } from "next/server";
import { getPubgMatch } from "@/lib/server/pubg";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") ?? "";
    const platform = searchParams.get("platform") ?? "steam";
    const payload = await getPubgMatch(id, platform);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Match PUBG indisponible." },
      { status: 422 }
    );
  }
}
