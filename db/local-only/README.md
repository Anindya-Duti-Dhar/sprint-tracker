# Local development database

Production runs on Supabase Cloud (Postgres + Auth + RLS, hosted). This folder
exists only because the sandbox this was first built in couldn't reach
Supabase's Docker registry (`ghcr.io`) to run `supabase start` locally.

Instead, local dev runs on plain Postgres with a thin shim that reproduces
Supabase's `auth.uid()` / `auth.role()` functions, so the **exact same**
`supabase/migrations/0001_init.sql` (tables, triggers, RLS policies) runs
unmodified on both. The app talks to Postgres directly (see `src/lib/db.ts`)
instead of through `@supabase/supabase-js` — that's the one thing that
changes when this moves to real Supabase Cloud (see the blueprint's
Portability section for why the service layer was kept thin on purpose).

## One-time setup

```bash
sudo -u postgres psql -c "create role sprinttracker with login password 'localdevpassword' createdb;"
sudo -u postgres psql -c "create database sprinttracker owner sprinttracker;"

PGPASSWORD=localdevpassword psql -h localhost -U sprinttracker -d sprinttracker -f db/local-only/0000_auth_shim.sql
PGPASSWORD=localdevpassword psql -h localhost -U sprinttracker -d sprinttracker -f ../supabase/migrations/0001_init.sql
PGPASSWORD=localdevpassword psql -h localhost -U sprinttracker -d sprinttracker -f ../supabase/seed.sql
PGPASSWORD=localdevpassword psql -h localhost -U sprinttracker -d sprinttracker -f db/local-only/0001_demo_seed.sql
```

Then `cp .env.example .env.local` and `npm run dev`.

Demo logins (password for all: `Passw0rd!`):

| Email | Role |
|---|---|
| anindya@portonics.com | admin |
| hasib@portonics.com | manager |
| shubhobrata@portonics.com | member |
| gourango@portonics.com | member |

## Moving to Supabase Cloud

Do **not** run this folder's SQL against a Supabase Cloud project — it
already has a real `auth` schema. Only `supabase/migrations/0001_init.sql`
and `supabase/seed.sql` are meant to travel to Supabase (`supabase db push`).
