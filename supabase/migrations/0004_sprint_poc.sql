-- Sprint POC / Assistant POC: who owns a sprint and who backs them up.
-- Shown on the Dashboard's new full-width Sprint Details card and set from
-- Admin -> Sprints. Both are optional and, when set, must be a profile —
-- the admin UI further scopes the dropdown to the sprint's own members.

alter table public.projects
  add column sprint_poc_id uuid references public.profiles(id) on delete set null,
  add column assistant_poc_id uuid references public.profiles(id) on delete set null;

create index projects_sprint_poc_id_idx on public.projects(sprint_poc_id);
create index projects_assistant_poc_id_idx on public.projects(assistant_poc_id);
