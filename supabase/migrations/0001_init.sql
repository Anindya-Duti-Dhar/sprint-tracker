-- Sprint Tracker schema: profiles, projects (sprints), project_members,
-- task_types, activities, entries. RLS enforces the roles matrix from the blueprint.

create extension if not exists pgcrypto;

-- =========================================================
-- Tables
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  global_role text not null default 'member' check (global_role in ('admin','manager','member','viewer')),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default false,
  planning_date date,
  dev_start_date date,
  dev_end_date date,
  qa_start_date date,
  qa_end_date date,
  uat_staging_start_date date,
  uat_staging_end_date date,
  uat_preprod_start_date date,
  uat_preprod_end_date date,
  security_scanning_date date,
  production_deployment_date date,
  beta_release_date date,
  commercial_release_date date,
  created_at timestamptz not null default now()
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_role text not null check (project_role in ('manager','member','viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table public.task_types (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  is_active boolean not null default true,
  sort_order int not null default 0,
  is_default boolean not null default false
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  feature text not null check (char_length(feature) between 3 and 140),
  task_type_id uuid not null references public.task_types(id),
  task text,
  assignee_id uuid not null references public.profiles(id),
  android_poc_id uuid references public.profiles(id),
  hours numeric(5,2) not null check (hours >= 0.5 and hours <= 13),
  activity_id uuid not null references public.activities(id),
  test_build_shared_date date,
  remark text,
  import_batch_id uuid,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entries_project_id_idx on public.entries(project_id);
create index entries_assignee_id_idx on public.entries(assignee_id);
create index entries_android_poc_id_idx on public.entries(android_poc_id);
create index project_members_project_id_idx on public.project_members(project_id);
create index project_members_user_id_idx on public.project_members(user_id);

-- =========================================================
-- Triggers
-- =========================================================

-- New auth user -> profile row (defaults to 'member'; Admin promotes via /admin/users)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, global_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'global_role', 'member')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Only one active sprint at a time
create function public.enforce_single_active_project()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_active then
    update public.projects set is_active = false
      where id <> new.id and is_active = true;
  end if;
  return new;
end;
$$;

create trigger trg_single_active_project
  before insert or update of is_active on public.projects
  for each row when (new.is_active = true)
  execute procedure public.enforce_single_active_project();

-- Only one default Activity at a time
create function public.enforce_single_default_activity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_default then
    update public.activities set is_default = false
      where id <> new.id and is_default = true;
  end if;
  return new;
end;
$$;

create trigger trg_single_default_activity
  before insert or update of is_default on public.activities
  for each row when (new.is_default = true)
  execute procedure public.enforce_single_default_activity();

-- updated_at bookkeeping
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_entries_updated_at
  before update on public.entries
  for each row execute procedure public.set_updated_at();

-- =========================================================
-- Helper functions for RLS (security definer avoids recursive-RLS issues)
-- =========================================================

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and global_role = 'admin'
  );
$$;

create function public.my_project_role(p_project_id uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select project_role from public.project_members
    where project_id = p_project_id and user_id = auth.uid();
$$;

-- =========================================================
-- Row-Level Security
-- =========================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.task_types enable row level security;
alter table public.activities enable row level security;
alter table public.entries enable row level security;

-- profiles: everyone signed in can see the directory (needed for Assignee/POC dropdowns);
-- users update their own row; global_role changes happen via a server action using the
-- service role key, not through this policy.
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- projects (sprints): everyone signed in can see them; only Admin manages them.
create policy "projects_select_all" on public.projects
  for select using (auth.role() = 'authenticated');

create policy "projects_write_admin" on public.projects
  for all using (public.is_admin()) with check (public.is_admin());

-- project_members: everyone signed in can see membership; Admin manages any project,
-- a Manager can manage membership of a project they already manage.
create policy "project_members_select_all" on public.project_members
  for select using (auth.role() = 'authenticated');

create policy "project_members_write" on public.project_members
  for all using (
    public.is_admin() or public.my_project_role(project_id) = 'manager'
  ) with check (
    public.is_admin() or public.my_project_role(project_id) = 'manager'
  );

-- task_types / activities: everyone signed in reads them; only Admin edits.
create policy "task_types_select_all" on public.task_types
  for select using (auth.role() = 'authenticated');
create policy "task_types_write_admin" on public.task_types
  for all using (public.is_admin()) with check (public.is_admin());

create policy "activities_select_all" on public.activities
  for select using (auth.role() = 'authenticated');
create policy "activities_write_admin" on public.activities
  for all using (public.is_admin()) with check (public.is_admin());

-- entries: visible to admin (any) or to members of that project (any project role).
create policy "entries_select" on public.entries
  for select using (
    public.is_admin() or public.my_project_role(project_id) is not null
  );

-- insert: admin any project; manager/member on a project they belong to (viewers cannot add)
create policy "entries_insert" on public.entries
  for insert with check (
    public.is_admin() or public.my_project_role(project_id) in ('manager','member')
  );

-- update/delete: admin any; manager any entry in their project; member only their own rows
create policy "entries_update" on public.entries
  for update using (
    public.is_admin()
    or public.my_project_role(project_id) = 'manager'
    or (public.my_project_role(project_id) = 'member' and created_by = auth.uid())
  );

create policy "entries_delete" on public.entries
  for delete using (
    public.is_admin()
    or public.my_project_role(project_id) = 'manager'
    or (public.my_project_role(project_id) = 'member' and created_by = auth.uid())
  );
