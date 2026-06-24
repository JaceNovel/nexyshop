import { NextResponse } from "next/server";
import { getFreeFirePlayerProfile } from "@/lib/server/freefire-lookup";

export async function POST(request: Request) {
  try {
    const { uid, region } = await request.json();
    const payload = await getFreeFirePlayerProfile(String(uid ?? ""), String(region ?? ""));

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Profil Free Fire indisponible." },
      { status: 422 }
    );
  }
}
