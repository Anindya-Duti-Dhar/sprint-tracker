import { NextResponse } from "next/server";
import { clearSessionCookie, recordLogout } from "@/lib/auth";

export async function POST() {
  await recordLogout();
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
