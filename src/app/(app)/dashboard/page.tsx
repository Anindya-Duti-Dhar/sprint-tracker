import { redirect } from "next/navigation";
import { Paper, Typography } from "@mui/material";
import { getSessionUser, withSessionClaims } from "@/lib/auth";
import {
  sprintStatus,
  daysRemaining,
  countWorkdays,
  HOURS_PER_DAY,
} from "@/lib/sprint";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const data = await withSessionClaims(async (client) => {
    const project = await client.query(
      `select pr.*, poc.full_name as sprint_poc_name, asst.full_name as assistant_poc_name
         from public.projects pr
         left join public.profiles poc on poc.id = pr.sprint_poc_id
         left join public.profiles asst on asst.id = pr.assistant_poc_id
        where pr.is_active
        limit 1`,
    );
    const p = project.rows[0];
    if (!p) return null;

    const totalHours = await client.query(
      `select coalesce(sum(hours),0) as total from public.entries where project_id = $1`,
      [p.id],
    );
    const byMember = await client.query(
      `select pr.full_name, coalesce(sum(e.hours),0) as total
         from public.project_members pm
         join public.profiles pr on pr.id = pm.user_id
         left join public.entries e on e.assignee_id = pr.id and e.project_id = $1
        where pm.project_id = $1
        group by pr.full_name
        order by total desc`,
      [p.id],
    );
    const memberCount = await client.query(
      `select count(*) as n from public.project_members where project_id = $1`,
      [p.id],
    );

    return {
      project: p,
      totalHours: Number(totalHours.rows[0].total),
      byMember: byMember.rows.map((r) => ({
        name: r.full_name as string,
        hours: Number(r.total),
      })),
      memberCount: Number(memberCount.rows[0].n),
    };
  });

  if (!data) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6">No active sprint yet</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Ask an Admin to mark a sprint active in Admin → Sprints.
        </Typography>
      </Paper>
    );
  }

  const { project, totalHours, byMember, memberCount } = data;
  const devStart = project.dev_start_date ? new Date(project.dev_start_date) : null;
  const devEnd = project.dev_end_date ? new Date(project.dev_end_date) : null;
  const status = sprintStatus(devStart, devEnd);
  const remaining = daysRemaining(devEnd);
  const workdays = countWorkdays(devStart, devEnd);
  const capacity = memberCount * workdays * HOURS_PER_DAY;
  const remainingCapacity = capacity - totalHours;

  const fmt = (d: unknown) =>
    d ? new Date(d as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : null;

  const milestones = [
    { label: "Planning", date: fmt(project.planning_date) },
    { label: "Dev Start", date: fmt(project.dev_start_date) },
    { label: "Dev End", date: fmt(project.dev_end_date) },
    { label: "QA Start", date: fmt(project.qa_start_date) },
    { label: "QA End", date: fmt(project.qa_end_date) },
    { label: "UAT Staging", date: fmt(project.uat_staging_end_date ?? project.uat_staging_start_date) },
    { label: "UAT Preprod", date: fmt(project.uat_preprod_end_date ?? project.uat_preprod_start_date) },
    { label: "Security Scan", date: fmt(project.security_scanning_date) },
    { label: "Production", date: fmt(project.production_deployment_date) },
    { label: "Beta Release", date: fmt(project.beta_release_date) },
    { label: "Commercial", date: fmt(project.commercial_release_date) },
  ].filter((m) => m.date);

  return (
    <DashboardClient
      data={{
        projectName: project.name,
        status,
        devStartLabel: fmt(project.dev_start_date) ?? "—",
        devEndLabel: fmt(project.dev_end_date) ?? "—",
        remaining,
        totalHours,
        capacity,
        remainingCapacity,
        memberCount,
        workdays,
        byMember,
        deadlineLabel: fmt(project.dev_end_date),
        milestones,
        sprintPocName: (project.sprint_poc_name as string | null) ?? null,
        assistantPocName: (project.assistant_poc_name as string | null) ?? null,
      }}
    />
  );
}
