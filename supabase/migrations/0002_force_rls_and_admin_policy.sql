-- Critical fix: the app connects as the `postgres` role (table owner), and
-- Postgres exempts table owners/superusers from row-level security by
-- default UNLESS the table is explicitly told to force it. Without this,
-- every RLS policy in 0001_init.sql has been silently doing nothing — any
-- signed-in session could read/write any row regardless of role or project
-- membership. This makes the existing policies actually apply to every role.
alter table public.profiles         force row level security;
alter table public.projects         force row level security;
alter table public.project_members  force row level security;
alter table public.task_types       force row level security;
alter table public.activities       force row level security;
alter table public.entries          force row level security;

-- Admin needs to change OTHER people's global_role (e.g. from the new
-- /admin/users screen). The only existing update policy on profiles is
-- "update your own row" — add a second, permissive policy for admins to
-- update any profile. (Permissive policies are OR'd together, so this is
-- additive and doesn't loosen the self-update policy.)
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- 0001_init.sql never had an INSERT policy on profiles — harmless before
-- this fix, since the table owner bypassed RLS entirely and the
-- handle_new_user() trigger's insert always just worked. With RLS actually
-- forced, that insert (fired by the trigger whenever a row lands in
-- auth.users) has no policy to allow it and fails outright, breaking user
-- creation in /admin/users. Allow it for: an admin creating a new user
-- (the trigger runs under the admin's session claims), or a user inserting
-- their own row (the normal Supabase self-signup shape, unused here but
-- harmless to allow).
create policy "profiles_insert" on public.profiles
  for insert with check (public.is_admin() or id = auth.uid());

-- Hours: was a 0.5-13 dropdown, now a free numeric input capped 0.5-100.
alter table public.entries drop constraint entries_hours_check;
alter table public.entries add constraint entries_hours_check
  check (hours >= 0.5 and hours <= 100);
