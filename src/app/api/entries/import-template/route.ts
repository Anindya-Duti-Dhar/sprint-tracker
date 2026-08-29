import { NextResponse } from "next/server";
import { getSessionUser, withSessionClaims, isManagerOrAdmin } from "@/lib/auth";
import { buildImportTemplateWorkbook } from "@/lib/excel";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sprintId = searchParams.get("sprint");
  if (!sprintId) {
    return NextResponse.json({ error: "sprint is required." }, { status: 400 });
  }

  const lookups = await withSessionClaims(async (client) => {
    if (!(await isManagerOrAdmin(client, sprintId))) {
      return { forbidden: true as const };
    }
    const taskTypes = await client.query(
      `select label from public.task_types where is_active order by sort_order`,
    );
    const activities = await client.query(
      `select label from public.activities where is_active order by sort_order`,
    );
    const members = await client.query(
      `select p.full_name
         from public.project_members pm
         join public.profiles p on p.id = pm.user_id
        where pm.project_id = $1
        order by p.full_name`,
      [sprintId],
    );
    return {
      taskTypes: taskTypes.rows.map((r) => r.label as string),
      activities: activities.rows.map((r) => r.label as string),
      members: members.rows.map((r) => r.full_name as string),
    };
  });

  if ("forbidden" in lookups) {
    return NextResponse.json(
      { error: "Only an Admin or Manager can download the import template." },
      { status: 403 },
    );
  }

  const buffer = await buildImportTemplateWorkbook(lookups);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sprint-tracker-import-template.xlsx"`,
    },
  });
}
