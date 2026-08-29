import { NextResponse } from "next/server";
import { withSessionClaims, getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedProjectId = searchParams.get("projectId");

  const data = await withSessionClaims(async (client) => {
    const projects = await client.query(
      `select id, name, is_active from public.projects order by name desc`,
    );
    const taskTypes = await client.query(
      `select id, label from public.task_types where is_active order by sort_order`,
    );
    const activities = await client.query(
      `select id, label, is_default from public.activities where is_active order by sort_order`,
    );

    const projectId =
      requestedProjectId ??
      projects.rows.find((p) => p.is_active)?.id ??
      projects.rows[0]?.id ??
      null;

    const members = projectId
      ? await client.query(
          `select p.id, p.full_name, pm.project_role
             from public.project_members pm
             join public.profiles p on p.id = pm.user_id
            where pm.project_id = $1
            order by p.full_name`,
          [projectId],
        )
      : { rows: [] };

    return {
      projects: projects.rows,
      taskTypes: taskTypes.rows,
      activities: activities.rows,
      members: members.rows,
      resolvedProjectId: projectId,
    };
  });

  return NextResponse.json(data);
}
