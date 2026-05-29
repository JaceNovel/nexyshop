import { NextResponse } from "next/server";
import { getRedeemSettings, publishRedeemCodesForToday, setRedeemSettings } from "@/lib/server/hlgaming-redeem";

export async function GET() {
  return NextResponse.json(getRedeemSettings());
}

export async function POST(request: Request) {
  try {
    const { action, enabled } = await request.json().catch(() => ({ enabled: false }));

    if (action === "publish") {
      return NextResponse.json(await publishRedeemCodesForToday());
    }

    return NextResponse.json(setRedeemSettings(Boolean(enabled)));
  } catch (error) {
    return NextResponse.json(
      { ...getRedeemSettings(), message: error instanceof Error ? error.message : "Impossible de publier les redeem codes." },
      { status: 502 }
    );
  }
}
