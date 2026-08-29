-- LOCAL DEV ONLY. Real Supabase Cloud already provides the `auth` schema
-- (auth.users, auth.uid(), auth.role()) via GoTrue — do NOT run this file
-- against a Supabase Cloud project. It exists so the exact same
-- supabase/migrations/0001_init.sql (profiles FK, RLS policies, triggers)
-- can run unmodified against plain local Postgres.

create extension if not exists pgcrypto;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  encrypted_password text not null,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Mirrors Supabase's auth.uid(): reads the request's JWT "sub" claim,
-- which our local API layer sets per-request via set_config(...).
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Mirrors Supabase's auth.role(): 'authenticated' once logged in, else 'anon'.
create or replace function auth.role()
returns text
language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;
