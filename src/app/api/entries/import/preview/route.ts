import { NextResponse } from "next/server";
import { getSessionUser, withSessionClaims, isManagerOrAdmin } from "@/lib/auth";
import { parseImportWorkbook } from "@/lib/excel";

export type PreviewRow = {
  rowNumber: number;
  feature: string;
  taskTypeId: string | null;
  taskTypeLabel: string;
  task: string;
  assigneeId: string | null;
  assigneeLabel: string;
  androidPocId: string | null;
  androidPocLabel: string;
  hours: number | null;
  activityId: string | null;
  activityLabel: string;
  testBuildSharedDate: string;
  remark: string;
  errors: string[];
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const form = await request.formData();
  const sprintId = form.get("sprintId");
  const file = form.get("file");
  if (typeof sprintId !== "string" || !sprintId) {
    return NextResponse.json({ error: "Choose a sprint first." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  const allowed = await withSessionClaims((client) => isManagerOrAdmin(client, sprintId));
  if (!allowed) {
    return NextResponse.json(
      { error: "Only an Admin or Manager can import tasks." },
      { status: 403 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = await parseImportWorkbook(buffer);
  } catch {
    return NextResponse.json(
      { error: "Couldn't read that file — is it the .xlsx template?" },
      { status: 400 },
    );
  }
  if (parsed.length === 0) {
    return NextResponse.json({ error: "No rows found in that file." }, { status: 400 });
  }
  if (parsed.length > 500) {
    return NextResponse.json({ error: "Import is capped at 500 rows at a time." }, { status: 400 });
  }

  const lookups = await withSessionClaims(async (client) => {
    const taskTypes = await client.query(
      `select id, label from public.task_types where is_active`,
    );
    const activities = await client.query(
      `select id, label from public.activities where is_active`,
    );
    const members = await client.query(
      `select p.id, p.full_name
         from public.project_members pm
         join public.profiles p on p.id = pm.user_id
        where pm.project_id = $1`,
      [sprintId],
    );
    return { taskTypes: taskTypes.rows, activities: activities.rows, members: members.rows };
  });

  const byLabel = <T extends { label?: string; full_name?: string }>(list: T[], key: "label" | "full_name") => {
    const map = new Map<string, T>();
    for (const item of list) map.set(String(item[key]).trim().toLowerCase(), item);
    return map;
  };
  const taskTypeMap = byLabel(lookups.taskTypes, "label");
  const activityMap = byLabel(lookups.activities, "label");
  const memberMap = byLabel(lookups.members, "full_name");

  const rows: PreviewRow[] = parsed.map((r) => {
    const errors: string[] = [];
    const taskType = taskTypeMap.get(r.taskType.trim().toLowerCase());
    const activity = activityMap.get(r.activity.trim().toLowerCase());
    const assignee = memberMap.get(r.assignee.trim().toLowerCase());
    const poc = r.androidPoc ? memberMap.get(r.androidPoc.trim().toLowerCase()) : undefined;

    if (r.feature.length < 3 || r.feature.length > 140) {
      errors.push("Feature must be 3-140 characters.");
    }
    if (!taskType) errors.push(`Unknown Task Type "${r.taskType}".`);
    if (!assignee) errors.push(`"${r.assignee}" isn't a member of this sprint.`);
    if (r.androidPoc && !poc) errors.push(`Android POC "${r.androidPoc}" isn't a member of this sprint.`);
    if (r.hours == null || r.hours < 0.5 || r.hours > 100) {
      errors.push("Hours must be between 0.5 and 100.");
    }
    if (!activity) errors.push(`Unknown Activity "${r.activity}".`);
    if (r.remark.length > 300) errors.push("Remark must be 300 characters or fewer.");

    return {
      rowNumber: r.rowNumber,
      feature: r.feature,
      taskTypeId: (taskType?.id as string) ?? null,
      taskTypeLabel: r.taskType,
      task: r.task,
      assigneeId: (assignee?.id as string) ?? null,
      assigneeLabel: r.assignee,
      androidPocId: (poc?.id as string) ?? null,
      androidPocLabel: r.androidPoc,
      hours: r.hours,
      activityId: (activity?.id as string) ?? null,
      activityLabel: r.activity,
      testBuildSharedDate: r.testBuildSharedDate,
      remark: r.remark,
      errors,
    };
  });

  return NextResponse.json({
    rows,
    validCount: rows.filter((r) => r.errors.length === 0).length,
    invalidCount: rows.filter((r) => r.errors.length > 0).length,
  });
}
