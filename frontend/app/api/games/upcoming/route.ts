import { NextResponse } from "next/server";
import { fetchUpcomingGames } from "@/lib/server/hlgaming-upcoming";

export async function GET() {
  try {
    return NextResponse.json(await fetchUpcomingGames());
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Jeux à venir indisponibles.", result: [] },
      { status: 502 }
    );
  }
}
