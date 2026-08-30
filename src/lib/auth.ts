import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { withAnon, withClaims } from "./db";

const COOKIE_NAME = "st_session";
// Fail loudly rather than silently signing session tokens with a known,
// public fallback secret if this ever ships to production without
// AUTH_JWT_SECRET configured (Phase 10 hardening) — local dev keeps working
// without setting it.
if (process.env.NODE_ENV === "production" && !process.env.AUTH_JWT_SECRET) {
  throw new Error("AUTH_JWT_SECRET must be set in production.");
}
const SECRET = process.env.AUTH_JWT_SECRET ?? "insecure-dev-secret";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days — one shared source of truth

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  globalRole: "admin" | "manager" | "member" | "viewer";
  avatarUrl: string | null;
};

/** sessionId identifies one row in public.login_sessions (see recordLogin). */
export function signSessionToken(userId: string, sessionId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId }, SECRET, {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function currentUserId(): Promise<string | null> {
  const session = await currentSession();
  return session?.userId ?? null;
}

/** The signed-in user's id and login_sessions row id, or null if not authenticated. */
async function currentSession(): Promise<{ userId: string; sessionId: string | null } | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string; sid?: string };
    return { userId: payload.sub, sessionId: payload.sid ?? null };
  } catch {
    return null;
  }
}

/**
 * Opens a login_sessions row for this user and returns its id, to embed in
 * the JWT so logout (recordLogout) can close the exact same row — a user
 * can be logged in from more than one device/browser at once, each with its
 * own session row. Never throws: a logging-in user must not be blocked from
 * reaching the app just because the session log insert failed.
 */
export async function recordLogin(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<string> {
  const sessionId = randomUUID();
  try {
    await withClaims({ sub: userId, role: "authenticated" }, (client) =>
      client.query(
        `insert into public.login_sessions (id, user_id, expires_at, ip_address, user_agent)
         values ($1, $2, now() + make_interval(secs => $3), $4, $5)`,
        [sessionId, userId, SESSION_MAX_AGE_SECONDS, ipAddress, userAgent],
      ),
    );
  } catch {
    // Session tracking is a nice-to-have for Admin visibility, not a gate on
    // login — swallow so a DB hiccup here never locks a legitimate user out.
  }
  return sessionId;
}

/** Closes out the login_sessions row for the session cookie about to be cleared. */
export async function recordLogout(): Promise<void> {
  const session = await currentSession();
  if (!session?.sessionId) return;
  try {
    await withClaims({ sub: session.userId, role: "authenticated" }, (client) =>
      client.query(
        `update public.login_sessions set logged_out_at = now()
          where id = $1 and user_id = $2 and logged_out_at is null`,
        [session.sessionId, session.userId],
      ),
    );
  } catch {
    // Same reasoning as recordLogin: never block logout on this.
  }
}

/** Full profile row for the logged-in user, or null if not authenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const result = await withClaims({ sub: userId, role: "authenticated" }, (client) =>
    client.query(
      `select id, email, full_name, global_role, avatar_url
         from public.profiles where id = $1`,
      [userId],
    ),
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    globalRole: row.global_role,
    avatarUrl: row.avatar_url,
  };
}

/** Runs `fn` against the DB with the current session's claims (or anon if none). */
export async function withSessionClaims<T>(
  fn: (client: Parameters<Parameters<typeof withClaims>[1]>[0]) => Promise<T>,
): Promise<T> {
  const userId = await currentUserId();
  if (!userId) return withAnon(fn);
  return withClaims({ sub: userId, role: "authenticated" }, fn);
}

/**
 * Excel import/export is restricted to Admin, or a Manager of the sprint in
 * question (or, when no specific sprint is given — an all-sprints export —
 * a Manager of at least one sprint). Mirrors the entries RLS ownership rules
 * but is checked in code because these are file-download routes, not row
 * reads/writes that RLS alone can gate.
 */
export async function isManagerOrAdmin(
  client: Parameters<Parameters<typeof withClaims>[1]>[0],
  projectId?: string | null,
): Promise<boolean> {
  if (projectId) {
    const result = await client.query(
      `select (public.is_admin() or public.my_project_role($1) = 'manager') as ok`,
      [projectId],
    );
    return result.rows[0]?.ok === true;
  }
  const result = await client.query(
    `select (
       public.is_admin()
       or exists (
         select 1 from public.project_members
          where user_id = auth.uid() and project_role = 'manager'
       )
     ) as ok`,
  );
  return result.rows[0]?.ok === true;
}

export { withAnon };
