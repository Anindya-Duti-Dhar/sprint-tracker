import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withAnon } from "@/lib/db";
import { setSessionCookie, signSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const result = await withAnon((client) =>
    client.query(
      `select id, encrypted_password from auth.users where lower(email) = $1`,
      [email],
    ),
  );
  const row = result.rows[0];

  if (!row || !(await bcrypt.compare(password, row.encrypted_password))) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const token = signSessionToken(row.id);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
