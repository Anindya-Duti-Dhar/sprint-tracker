-- Run this LAST, after:
--   1. supabase/migrations/0001_init.sql has been run (creates the trigger that
--      auto-adds a public.profiles row whenever a user is added to auth.users)
--   2. supabase/seed.sql has been run (creates task_types, activities, the '26.6.2' project)
--   3. The 4 demo users below have been created via
--      Supabase Dashboard -> Authentication -> Users -> Add user
--      (any password is fine, e.g. Passw0rd! for all four)
--
-- This script only touches public.* tables (never auth.users), so it's safe to
-- run as-is on Supabase Cloud through the SQL Editor.

-- Promote the right people (everyone else stays the default 'member').
update public.profiles set global_role = 'admin'   where email = 'anindya@portonics.com';
update public.profiles set global_role = 'manager'  where email = 'hasib@portonics.com';
update public.profiles set global_role = 'member'   where email = 'shubhobrata@portonics.com';
update public.profiles set global_role = 'member'   where email = 'gourango@portonics.com';

-- Add everyone as members of the active sprint (26.6.2).
insert into public.project_members (project_id, user_id, project_role)
select p.id, pr.id,
  case pr.global_role when 'admin' then 'manager' when 'manager' then 'manager' else 'member' end
from public.projects p, public.profiles pr
where p.name = '26.6.2'
  and pr.email in (
    'anindya@portonics.com','hasib@portonics.com',
    'shubhobrata@portonics.com','gourango@portonics.com'
  )
on conflict (project_id, user_id) do nothing;

-- A few sample entries, mirroring the real 26.6.2 sheet.
insert into public.entries (project_id, feature, task_type_id, task, assignee_id, android_poc_id, hours, activity_id, test_build_shared_date, remark, created_by)
select
  p.id,
  v.feature, tt.id, v.task,
  a.id, poc.id,
  v.hours::numeric, act.id, v.test_date::date, v.remark,
  a.id
from (values
    ('Revamp - Login with OTP', 'Revamp', 'Complete OTP verification screen', 'shubhobrata@portonics.com', 'shubhobrata@portonics.com', 8.0, 'Dev In-progress', '2026-08-31', null),
    ('Revamp - Social Login', 'Revamp', 'Google + Facebook sign-in buttons', 'gourango@portonics.com', 'gourango@portonics.com', 6.5, 'QA', '2026-08-27', null),
    ('Super QR additional requirements', 'CR', 'Partial share 23rd', 'hasib@portonics.com', 'hasib@portonics.com', 4.5, 'Done', '2026-08-27', 'Partial share 23rd'),
    ('Chatbot Message notification to customer', 'CR', null, 'hasib@portonics.com', 'hasib@portonics.com', 12.0, 'TODO', '2026-09-02', null)
  ) as v(feature, task_type, task, assignee_email, poc_email, hours, activity, test_date, remark)
join public.projects p on p.name = '26.6.2'
join public.task_types tt on tt.label = v.task_type
join public.activities act on act.label = v.activity
join public.profiles a on a.email = v.assignee_email
join public.profiles poc on poc.email = v.poc_email;
