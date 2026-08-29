import { withSessionClaims } from "@/lib/auth";
import TaskListClient from "@/components/TaskListClient";

type SearchParams = {
  sprint?: string;
  taskType?: string;
  assignee?: string;
  poc?: string;
};

export default async function TaskListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const data = await withSessionClaims(async (client) => {
    const projects = await client.query(
      `select id, name, is_active from public.projects order by name desc`,
    );
    const activeProject = projects.rows.find((p) => p.is_active) ?? projects.rows[0];
    const projectId = sp.sprint || activeProject?.id || null;

    const taskTypes = await client.query(
      `select id, label from public.task_types where is_active order by sort_order`,
    );

    const members = projectId
      ? await client.query(
          `select p.id, p.full_name
             from public.project_members pm
             join public.profiles p on p.id = pm.user_id
            where pm.project_id = $1
            order by p.full_name`,
          [projectId],
        )
      : { rows: [] };

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (projectId) {
      params.push(projectId);
      conditions.push(`e.project_id = $${params.length}`);
    }
    if (sp.taskType) {
      params.push(sp.taskType);
      conditions.push(`e.task_type_id = $${params.length}`);
    }
    if (sp.assignee) {
      params.push(sp.assignee);
      conditions.push(`e.assignee_id = $${params.length}`);
    }
    if (sp.poc) {
      params.push(sp.poc);
      conditions.push(`e.android_poc_id = $${params.length}`);
    }
    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

    const entries = await client.query(
      `select
         e.id, e.project_id, e.feature, e.task, e.hours,
         e.test_build_shared_date, e.remark, e.created_by,
         tt.id as task_type_id, tt.label as task_type_label,
         act.id as activity_id, act.label as activity_label,
         assignee.id as assignee_id, assignee.full_name as assignee_name,
         poc.id as android_poc_id, poc.full_name as android_poc_name
       from public.entries e
       join public.task_types tt on tt.id = e.task_type_id
       join public.activities act on act.id = e.activity_id
       join public.profiles assignee on assignee.id = e.assignee_id
       left join public.profiles poc on poc.id = e.android_poc_id
       ${where}
       order by e.created_at desc`,
      params,
    );

    return {
      projects: projects.rows,
      taskTypes: taskTypes.rows,
      members: members.rows,
      entries: entries.rows,
      resolvedProjectId: projectId,
    };
  });

  return (
    <TaskListClient
      projects={data.projects}
      taskTypes={data.taskTypes}
      members={data.members}
      entries={data.entries}
      resolvedProjectId={data.resolvedProjectId}
      filters={sp}
    />
  );
}
