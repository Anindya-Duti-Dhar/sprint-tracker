-- LOCAL DEV ONLY. Demo users + sample entries so the app isn't empty on first run.
-- Passwords are hashed with pgcrypto's bcrypt (crypt/gen_salt('bf')), which produces
-- standard $2a$/$2b$ hashes bcryptjs can verify from the Node auth layer.
-- All demo accounts use the password:  Passw0rd!

with new_users as (
  insert into auth.users (email, encrypted_password, raw_user_meta_data) values
    ('anindya@portonics.com',    crypt('Passw0rd!', gen_salt('bf')), '{"full_name":"Anindya Duti Dhar","global_role":"admin"}'),
    ('shubhobrata@portonics.com',crypt('Passw0rd!', gen_salt('bf')), '{"full_name":"Shubhobrata","global_role":"member"}'),
    ('hasib@portonics.com',      crypt('Passw0rd!', gen_salt('bf')), '{"full_name":"Md. Hasibun Nayem","global_role":"manager"}'),
    ('gourango@portonics.com',   crypt('Passw0rd!', gen_salt('bf')), '{"full_name":"Gourango Sutradhar","global_role":"member"}')
  returning id, email
)
select * from new_users;

-- Add everyone as members of the active sprint (26.6.2)
insert into public.project_members (project_id, user_id, project_role)
select p.id, pr.id,
  case pr.global_role when 'admin' then 'manager' when 'manager' then 'manager' else 'member' end
from public.projects p, public.profiles pr
where p.name = '26.6.2';

-- A few sample entries, mirroring the real 26.6.2 sheet
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
