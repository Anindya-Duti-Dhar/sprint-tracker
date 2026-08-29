import { NextResponse } from "next/server";
import { getSessionUser, withSessionClaims } from "@/lib/auth";
import { buildExportWorkbook, type ExportRow } from "@/lib/excel";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sprint = searchParams.get("sprint");
  const taskType = searchParams.get("taskType");
  const assignee = searchParams.get("assignee");
  const poc = searchParams.get("poc");

  const rows = await withSessionClaims(async (client) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (sprint) {
      params.push(sprint);
      conditions.push(`e.project_id = $${params.length}`);
    }
    if (taskType) {
      params.push(taskType);
      conditions.push(`e.task_type_id = $${params.length}`);
    }
    if (assignee) {
      params.push(assignee);
      conditions.push(`e.assignee_id = $${params.length}`);
    }
    if (poc) {
      params.push(poc);
      conditions.push(`e.android_poc_id = $${params.length}`);
    }
    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

    const result = await client.query(
      `select
         p.name as sprint_name, e.feature, tt.label as task_type, e.task,
         assignee.full_name as assignee, poc.full_name as android_poc,
         e.hours, act.label as activity, e.test_build_shared_date, e.remark
       from public.entries e
       join public.projects p on p.id = e.project_id
       join public.task_types tt on tt.id = e.task_type_id
       join public.activities act on act.id = e.activity_id
       join public.profiles assignee on assignee.id = e.assignee_id
       left join public.profiles poc on poc.id = e.android_poc_id
       ${where}
       order by p.name desc, e.created_at desc`,
      params,
    );
    return result.rows;
  });

  const exportRows: ExportRow[] = rows.map((r) => ({
    sprintName: r.sprint_name,
    feature: r.feature,
    taskType: r.task_type,
    task: r.task,
    assignee: r.assignee,
    androidPoc: r.android_poc,
    hours: Number(r.hours),
    activity: r.activity,
    testBuildSharedDate: r.test_build_shared_date
      ? new Date(r.test_build_shared_date).toISOString().slice(0, 10)
      : null,
    remark: r.remark,
  }));

  const buffer = await buildExportWorkbook(exportRows);
  const filename = `sprint-tracker-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
