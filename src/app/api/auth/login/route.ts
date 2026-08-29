import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withAnon } from "@/lib/db";
import { setSessionCookie, signSessionToken } from "@/lib/auth";
import { checkRateLimit, recordFailure, clearRateLimit } from "@/lib/rateLimit";

// Brute-force guard: 10 failed attempts per email+IP per 10 minutes. Only
// failures count, so a legitimate user mistyping their password a few times
// is never locked out of their own account.
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitKey = `${ip}:${email}`;

  const rateLimit = checkRateLimit(rateLimitKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const result = await withAnon((client) =>
    client.query(
      `select id, encrypted_password from auth.users where lower(email) = $1`,
      [email],
    ),
  );
  const row = result.rows[0];

  if (!row || !(await bcrypt.compare(password, row.encrypted_password))) {
    recordFailure(rateLimitKey, LOGIN_WINDOW_MS);
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  clearRateLimit(rateLimitKey);

  const token = signSessionToken(row.id);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
