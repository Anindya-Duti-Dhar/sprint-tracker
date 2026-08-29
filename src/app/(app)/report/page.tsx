import { withSessionClaims, isManagerOrAdmin } from "@/lib/auth";
import ReportClient from "@/components/ReportClient";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ sprint?: string }>;
}) {
  const sp = await searchParams;

  const data = await withSessionClaims(async (client) => {
    const projects = await client.query(
      `select id, name, is_active from public.projects order by name desc`,
    );
    const activeProject = projects.rows.find((p) => p.is_active) ?? projects.rows[0];
    const projectId = sp.sprint || activeProject?.id || null;

    const byActivity = projectId
      ? await client.query(
          `select act.label, coalesce(sum(e.hours),0) as hours
             from public.activities act
             left join public.entries e on e.activity_id = act.id and e.project_id = $1
            where act.is_active
            group by act.label, act.sort_order
            having coalesce(sum(e.hours),0) > 0
            order by act.sort_order`,
          [projectId],
        )
      : { rows: [] };

    const byTaskType = projectId
      ? await client.query(
          `select tt.label, coalesce(sum(e.hours),0) as hours
             from public.task_types tt
             left join public.entries e on e.task_type_id = tt.id and e.project_id = $1
            where tt.is_active
            group by tt.label, tt.sort_order
            having coalesce(sum(e.hours),0) > 0
            order by tt.sort_order`,
          [projectId],
        )
      : { rows: [] };

    const byMember = projectId
      ? await client.query(
          `select pr.full_name, coalesce(sum(e.hours),0) as hours
             from public.project_members pm
             join public.profiles pr on pr.id = pm.user_id
             left join public.entries e on e.assignee_id = pr.id and e.project_id = $1
            where pm.project_id = $1
            group by pr.full_name
            having coalesce(sum(e.hours),0) > 0
            order by hours desc`,
          [projectId],
        )
      : { rows: [] };

    const crossSprint = await client.query(
      `select p.name, coalesce(sum(e.hours),0) as hours
         from public.projects p
         left join public.entries e on e.project_id = p.id
        group by p.name
        order by p.name`,
    );

    const canExport = await isManagerOrAdmin(client, projectId);

    return {
      projects: projects.rows,
      resolvedProjectId: projectId,
      byActivity: byActivity.rows.map((r) => ({ label: r.label, hours: Number(r.hours) })),
      byTaskType: byTaskType.rows.map((r) => ({ label: r.label, hours: Number(r.hours) })),
      byMember: byMember.rows.map((r) => ({ label: r.full_name, hours: Number(r.hours) })),
      crossSprint: crossSprint.rows.map((r) => ({ label: r.name, hours: Number(r.hours) })),
      canExport,
    };
  });

  return <ReportClient {...data} />;
}
