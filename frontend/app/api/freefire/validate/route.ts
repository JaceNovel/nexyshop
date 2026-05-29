import { NextResponse } from "next/server";
import { validateFreeFirePlayer } from "@/lib/server/hlgaming-freefire";

export async function POST(request: Request) {
  try {
    const { uid, region } = await request.json();
    const payload = await validateFreeFirePlayer(String(uid ?? ""), String(region ?? ""));

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "ID Free Fire incorrect.", verified: false },
      { status: 422 }
    );
  }
}
