import { NextResponse } from "next/server";
import { getLikesQuote } from "@/lib/server/freefire-lookup";

export async function POST(request: Request) {
  const { uid, region, likes = 100 } = await request.json().catch(() => ({}));
  const quote = getLikesQuote(Number(likes) || 100);

  if (quote.likes > quote.max_per_day) {
    return NextResponse.json({ message: "Tu ne peux pas envoyer plus de 100 likes par jour." }, { status: 422 });
  }

  return NextResponse.json({
    status: "payment_required",
    quote,
    uid,
    region,
    message: "Paiement requis avant envoi des likes."
  });
}
