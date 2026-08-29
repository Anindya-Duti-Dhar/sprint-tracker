import { Paper, Typography } from "@mui/material";
import { withSessionClaims } from "@/lib/auth";
import {
  sprintStatus,
  daysRemaining,
  countWorkdays,
  HOURS_PER_DAY,
} from "@/lib/sprint";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const data = await withSessionClaims(async (client) => {
    const project = await client.query(
      `select * from public.projects where is_active limit 1`,
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
          Ask an Admin to mark a sprint active in Settings → Sprint Details.
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

  const fmt = (d: Date | null) =>
    d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—";

  return (
    <DashboardClient
      data={{
        projectName: project.name,
        status,
        devStartLabel: fmt(devStart),
        devEndLabel: fmt(devEnd),
        remaining,
        totalHours,
        capacity,
        remainingCapacity,
        memberCount,
        workdays,
        byMember,
      }}
    />
  );
}
