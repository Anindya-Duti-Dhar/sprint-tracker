import { Pool, type PoolClient } from "pg";

// Local dev backend: plain Postgres. Every query runs inside a transaction that
// first sets the same request.jwt.claim.* GUCs Supabase's PostgREST sets in
// production, so the RLS policies in supabase/migrations/0001_init.sql behave
// identically here and on Supabase Cloud — see db/local-only/README.md.

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set (see .env.example)");
    }
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export type Claims = { sub: string | null; role: "authenticated" | "anon" };

/**
 * Runs `fn` with a client whose session has the given JWT claims applied,
 * inside a transaction (committed on success, rolled back on throw).
 */
export async function withClaims<T>(
  claims: Claims,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
      claims.sub ?? "",
    ]);
    await client.query("select set_config('request.jwt.claim.role', $1, true)", [
      claims.role,
    ]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

/** Unauthenticated (anon) queries — e.g. looking up a user row to log in. */
export async function withAnon<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return withClaims({ sub: null, role: "anon" }, fn);
}
