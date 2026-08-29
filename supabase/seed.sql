-- Lookup values + one seeded sprint. Runs automatically after `supabase db reset`.

insert into public.task_types (label, sort_order) values
  ('Revamp', 1),
  ('CR', 2),
  ('New', 3);

insert into public.activities (label, sort_order, is_default) values
  ('Planning', 1, false),
  ('TODO', 2, true),
  ('Dev In-progress', 3, false),
  ('Done', 4, false),
  ('Pause', 5, false),
  ('Stop', 6, false),
  ('Shifted', 7, false),
  ('QA', 8, false),
  ('Released', 9, false),
  ('Live', 10, false);

insert into public.projects (
  name, is_active,
  planning_date, dev_start_date, dev_end_date,
  qa_start_date, qa_end_date,
  uat_staging_start_date, uat_staging_end_date,
  uat_preprod_start_date, uat_preprod_end_date,
  security_scanning_date, production_deployment_date,
  beta_release_date, commercial_release_date
) values (
  '26.6.2', true,
  '2026-08-20', '2026-08-23', '2026-09-02',
  '2026-09-03', '2026-09-07',
  '2026-09-08', '2026-09-09',
  '2026-09-10', '2026-09-13',
  '2026-09-14', '2026-09-15',
  '2026-09-16', '2026-09-17'
);
