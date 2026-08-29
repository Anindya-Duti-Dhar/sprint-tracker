"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { withSessionClaims } from "@/lib/auth";
import type { PreviewRow } from "@/app/api/entries/import/preview/route";
import type { ActionResult } from "@/lib/actions/entries";

type ConfirmResult = ActionResult & { imported?: number };

/**
 * Inserts only the rows the preview step resolved cleanly (a task type,
 * activity and assignee id, valid hours, valid feature length). The client
 * sends back the same rows the preview endpoint produced — this re-checks
 * the essentials itself rather than trusting the client's `errors` array,
 * since that's just UI state.
 */
export async function confirmImport(
  sprintId: string,
  rows: PreviewRow[],
): Promise<ConfirmResult> {
  const clean = rows.filter(
    (r) =>
      r.taskTypeId &&
      r.assigneeId &&
      r.activityId &&
      r.hours != null &&
      r.hours >= 0.5 &&
      r.hours <= 100 &&
      r.feature.length >= 3 &&
      r.feature.length <= 140 &&
      r.remark.length <= 300,
  );
  if (clean.length === 0) {
    return { ok: false, error: "No valid rows to import." };
  }

  const batchId = randomUUID();
  try {
    await withSessionClaims(async (client) => {
      const me = await client.query("select auth.uid() as id");
      const userId = me.rows[0]?.id;
      if (!userId) throw new Error("not_signed_in");
      for (const r of clean) {
        await client.query(
          `insert into public.entries
             (project_id, feature, task_type_id, task, assignee_id, android_poc_id,
              hours, activity_id, test_build_shared_date, remark, created_by, import_batch_id)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            sprintId,
            r.feature,
            r.taskTypeId,
            r.task || null,
            r.assigneeId,
            r.androidPocId || null,
            r.hours,
            r.activityId,
            r.testBuildSharedDate || null,
            r.remark || null,
            userId,
            batchId,
          ],
        );
      }
    });
  } catch {
    return { ok: false, error: "Import failed — you may not have permission to add tasks to this sprint." };
  }

  revalidatePath("/task-list");
  revalidatePath("/dashboard");
  revalidatePath("/report");
  return { ok: true, imported: clean.length };
}
