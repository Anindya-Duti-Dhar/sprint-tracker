-- Login session log: one row per login, closed out on explicit logout.
-- The "Login activity" admin screen is Admin-only in the UI, and the SELECT
-- policy below reflects that for other users' rows. A user can additionally
-- see (but never list in any UI) their own rows — this isn't a relaxation
-- for its own sake: under `FORCE ROW LEVEL SECURITY` (see below), Postgres
-- checks the applicable SELECT policy to locate a row for UPDATE, even when
-- no RETURNING is used — so without a self-select clause here, a non-admin
-- user's own recordLogout() UPDATE would silently match zero rows and their
-- session would never show as closed out. A user can still only insert or
-- update their own row (the login/logout API routes act as that user when
-- writing it), never anyone else's.

create table public.login_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_in_at timestamptz not null default now(),
  logged_out_at timestamptz,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index login_sessions_user_id_idx on public.login_sessions(user_id);
create index login_sessions_logged_in_at_idx on public.login_sessions(logged_in_at desc);

alter table public.login_sessions enable row level security;
-- Without FORCE, RLS is bypassed for the table owner — harmless on Supabase
-- Cloud (the app connects as authenticated/anon, never the owner) but this
-- repo's local dev Postgres uses one shared owner role for everything, so
-- FORCE is what makes RLS here actually mirror production. See 0002_force_rls_and_admin_policy.sql.
alter table public.login_sessions force row level security;

create policy "login_sessions_select_admin_or_self" on public.login_sessions
  for select using (public.is_admin() or user_id = auth.uid());

create policy "login_sessions_insert_self" on public.login_sessions
  for insert with check (user_id = auth.uid());

create policy "login_sessions_update_self" on public.login_sessions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
