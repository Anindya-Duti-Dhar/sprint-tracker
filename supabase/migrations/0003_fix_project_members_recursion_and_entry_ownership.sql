-- Fix 1: infinite RLS recursion.
--
-- project_members_write was declared FOR ALL, which also covers SELECT.
-- Since project_members_select_all is also a SELECT-applicable permissive
-- policy, Postgres must be prepared to evaluate BOTH policies' USING clauses
-- for a plain SELECT on public.project_members. Evaluating project_members_write's
-- clause calls public.my_project_role(), which itself SELECTs from
-- public.project_members — re-entering the exact same RLS check and recursing.
-- Reproduced locally as a guaranteed "stack depth limit exceeded" for any
-- non-admin SELECT against a project with at least one member row. This is
-- exactly the kind of bug that can look fine for a while (planner qual
-- ordering, cached plans, an admin-only smoke test) and then break the first
-- time a real Manager/Member hits it — so it's fixed structurally here rather
-- than left to chance.
--
-- The fix: split project_members_write into INSERT/UPDATE/DELETE-only
-- policies. project_members_select_all already covers every read, so SELECT
-- never touches my_project_role() again — no recursive path remains.
drop policy if exists "project_members_write" on public.project_members;

create policy "project_members_insert" on public.project_members
  for insert with check (
    public.is_admin() or public.my_project_role(project_id) = 'manager'
  );

create policy "project_members_update" on public.project_members
  for update using (
    public.is_admin() or public.my_project_role(project_id) = 'manager'
  ) with check (
    public.is_admin() or public.my_project_role(project_id) = 'manager'
  );

create policy "project_members_delete" on public.project_members
  for delete using (
    public.is_admin() or public.my_project_role(project_id) = 'manager'
  );

-- Fix 2: tighten entry ownership for Members.
--
-- Requirement: only an Admin or Manager may add/edit/delete a task on behalf
-- of someone else. A Member may only add/edit/delete a task that is truly
-- theirs — the one they logged (created_by) or the one they're assigned to
-- (assignee_id) — and can never create or reassign a task to someone else.
drop policy if exists "entries_insert" on public.entries;
create policy "entries_insert" on public.entries
  for insert with check (
    public.is_admin()
    or public.my_project_role(project_id) = 'manager'
    or (public.my_project_role(project_id) = 'member' and assignee_id = auth.uid())
  );

drop policy if exists "entries_update" on public.entries;
create policy "entries_update" on public.entries
  for update using (
    public.is_admin()
    or public.my_project_role(project_id) = 'manager'
    or (
      public.my_project_role(project_id) = 'member'
      and (created_by = auth.uid() or assignee_id = auth.uid())
    )
  ) with check (
    public.is_admin()
    or public.my_project_role(project_id) = 'manager'
    or (
      public.my_project_role(project_id) = 'member'
      and assignee_id = auth.uid()
    )
  );

drop policy if exists "entries_delete" on public.entries;
create policy "entries_delete" on public.entries
  for delete using (
    public.is_admin()
    or public.my_project_role(project_id) = 'manager'
    or (
      public.my_project_role(project_id) = 'member'
      and (created_by = auth.uid() or assignee_id = auth.uid())
    )
  );
