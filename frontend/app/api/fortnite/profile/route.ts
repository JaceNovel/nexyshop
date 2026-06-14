import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const { account_id } = await request.json().catch(() => ({ account_id: "" }));
    const response = await fetch(`${API_BASE_URL}/api/fortnite/profile`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: String(account_id ?? "") }),
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Profil Fortnite indisponible." },
      { status: 502 }
    );
  }
}
