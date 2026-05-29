import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { claimRedeemCode, getPublicRedeemCodes } from "@/lib/server/hlgaming-redeem";

export async function GET() {
  try {
    const { userId } = await auth();

    return NextResponse.json(await getPublicRedeemCodes(userId));
  } catch (error) {
    return NextResponse.json(
      { enabled: false, message: error instanceof Error ? error.message : "Redeem codes indisponibles.", codes: [] },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "Connecte-toi pour copier un code gratuit." }, { status: 401 });
    }

    const { codeId } = await request.json().catch(() => ({ codeId: "" }));

    return NextResponse.json(await claimRedeemCode(String(codeId ?? ""), userId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de copier ce code.";
    const status = message.includes("déjà") ? 409 : 400;

    return NextResponse.json({ message }, { status });
  }
}
