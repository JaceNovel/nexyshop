import { NextResponse } from "next/server";
import { getLikesQuote } from "@/lib/server/freefire-lookup";

export async function GET() {
  return NextResponse.json(getLikesQuote());
}
