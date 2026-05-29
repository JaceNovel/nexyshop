import { NextResponse } from "next/server";
import { getLikesQuote } from "@/lib/server/hlgaming-freefire";

export async function GET() {
  return NextResponse.json(getLikesQuote());
}
