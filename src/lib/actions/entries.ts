"use server";

import { revalidatePath } from "next/cache";
import { withSessionClaims } from "@/lib/auth";
import { entrySchema, type EntryFormValues } from "@/lib/schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

function toNullable(value: string | null | undefined): string | null {
  return value && value.trim() !== "" ? value : null;
}

export async function createEntry(values: EntryFormValues): Promise<ActionResult> {
  const parsed = entrySchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid entry." };
  }
  const v = parsed.data;
  try {
    await withSessionClaims(async (client) => {
      const me = await client.query("select auth.uid() as id");
      const userId = me.rows[0]?.id;
      if (!userId) throw new Error("Not signed in.");
      await client.query(
        `insert into public.entries
           (project_id, feature, task_type_id, task, assignee_id, android_poc_id,
            hours, activity_id, test_build_shared_date, remark, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          v.projectId,
          v.feature,
          v.taskTypeId,
          toNullable(v.task),
          v.assigneeId,
          toNullable(v.androidPocId),
          v.hours,
          v.activityId,
          toNullable(v.testBuildSharedDate),
          toNullable(v.remark),
          userId,
        ],
      );
    });
  } catch (err) {
    return { ok: false, error: friendlyDbError(err) };
  }
  revalidatePath("/task-list");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateEntry(
  id: string,
  values: EntryFormValues,
): Promise<ActionResult> {
  const parsed = entrySchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid entry." };
  }
  const v = parsed.data;
  try {
    const result = await withSessionClaims((client) =>
      client.query(
        `update public.entries set
           project_id = $1, feature = $2, task_type_id = $3, task = $4,
           assignee_id = $5, android_poc_id = $6, hours = $7, activity_id = $8,
           test_build_shared_date = $9, remark = $10
         where id = $11`,
        [
          v.projectId,
          v.feature,
          v.taskTypeId,
          toNullable(v.task),
          v.assigneeId,
          toNullable(v.androidPocId),
          v.hours,
          v.activityId,
          toNullable(v.testBuildSharedDate),
          toNullable(v.remark),
          id,
        ],
      ),
    );
    if (result.rowCount === 0) {
      return { ok: false, error: "You don't have permission to edit this task." };
    }
  } catch (err) {
    return { ok: false, error: friendlyDbError(err) };
  }
  revalidatePath("/task-list");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  try {
    const result = await withSessionClaims((client) =>
      client.query("delete from public.entries where id = $1", [id]),
    );
    if (result.rowCount === 0) {
      return { ok: false, error: "You don't have permission to delete this task." };
    }
  } catch (err) {
    return { ok: false, error: friendlyDbError(err) };
  }
  revalidatePath("/task-list");
  revalidatePath("/dashboard");
  return { ok: true };
}

function friendlyDbError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("entries_hours_check")) {
    return "Hours must be between 0.5 and 13.";
  }
  if (message.includes("entries_feature_check")) {
    return "Feature must be 3–140 characters.";
  }
  return "Couldn't save this task. Please try again.";
}
