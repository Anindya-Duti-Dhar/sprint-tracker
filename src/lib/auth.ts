import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { withAnon, withClaims } from "./db";

const COOKIE_NAME = "st_session";
const SECRET = process.env.AUTH_JWT_SECRET ?? "insecure-dev-secret";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  globalRole: "admin" | "manager" | "member" | "viewer";
  avatarUrl: string | null;
};

export function signSessionToken(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "7d" });
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function currentUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
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
