import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { API_BASE_URL } from "@/lib/api";

export async function GET() {
  try {
    const { userId } = await auth();
    const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
    const response = await fetch(`${API_BASE_URL}/api/freefire/redeem-codes${query}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(payload, { status: response.status });
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
    const response = await fetch(`${API_BASE_URL}/api/freefire/redeem-codes/claim`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ code_id: String(codeId ?? ""), user_id: userId }),
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de copier ce code.";
    const status = message.includes("déjà") ? 409 : 400;

    return NextResponse.json({ message }, { status });
  }
}
