"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import { withSessionClaims } from "@/lib/auth";
import {
  createUserSchema,
  projectSchema,
  taskTypeSchema,
  activitySchema,
  type CreateUserFormValues,
  type ProjectFormValues,
  type TaskTypeFormValues,
  type ActivityFormValues,
} from "@/lib/schemas";
import type { ActionResult } from "@/lib/actions/entries";

const DATE_COLUMNS = [
  ["planningDate", "planning_date"],
  ["devStartDate", "dev_start_date"],
  ["devEndDate", "dev_end_date"],
  ["qaStartDate", "qa_start_date"],
  ["qaEndDate", "qa_end_date"],
  ["uatStagingStartDate", "uat_staging_start_date"],
  ["uatStagingEndDate", "uat_staging_end_date"],
  ["uatPreprodStartDate", "uat_preprod_start_date"],
  ["uatPreprodEndDate", "uat_preprod_end_date"],
  ["securityScanningDate", "security_scanning_date"],
  ["productionDeploymentDate", "production_deployment_date"],
  ["betaReleaseDate", "beta_release_date"],
  ["commercialReleaseDate", "commercial_release_date"],
] as const;

function nullable(v: string | null | undefined) {
  return v && v.trim() !== "" ? v : null;
}

/**
 * auth.users has no RLS (it's not one of our public.* tables), so user
 * creation is the one write path that needs an explicit admin check in code
 * rather than relying on a policy to block it.
 */
async function requireAdmin(client: PoolClient): Promise<boolean> {
  const result = await client.query("select public.is_admin() as is_admin");
  return result.rows[0]?.is_admin === true;
}

export async function createUser(values: CreateUserFormValues): Promise<ActionResult> {
  const parsed = createUserSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid user." };
  }
  const { email, fullName, password, globalRole } = parsed.data;
  try {
    const result = await withSessionClaims(async (client) => {
      if (!(await requireAdmin(client))) {
        return { ok: false as const, error: "Only an Admin can create users." };
      }
      const existing = await client.query(
        "select 1 from auth.users where lower(email) = $1",
        [email],
      );
      if (existing.rowCount) {
        return { ok: false as const, error: "A user with that email already exists." };
      }
      const hash = await bcrypt.hash(password, 10);
      await client.query(
        `insert into auth.users (email, encrypted_password, raw_user_meta_data)
         values ($1, $2, $3::jsonb)`,
        [email, hash, JSON.stringify({ full_name: fullName, global_role: globalRole })],
      );
      return { ok: true as const };
    });
    if (!result.ok) return result;
  } catch (err) {
    return { ok: false, error: friendlyError(err, "Couldn't create the user.") };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateUserRole(
  userId: string,
  globalRole: string,
): Promise<ActionResult> {
  if (!["admin", "manager", "member", "viewer"].includes(globalRole)) {
    return { ok: false, error: "Invalid role." };
  }
  try {
    // Guarded by the profiles_update_admin RLS policy — a non-admin's update
    // silently affects 0 rows rather than needing a code-level check here.
    const result = await withSessionClaims((client) =>
      client.query("update public.profiles set global_role = $1 where id = $2", [
        globalRole,
        userId,
      ]),
    );
    if (result.rowCount === 0) {
      return { ok: false, error: "Only an Admin can change roles." };
    }
  } catch (err) {
    return { ok: false, error: friendlyError(err, "Couldn't update the role.") };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function upsertProject(values: ProjectFormValues): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid sprint." };
  }
  const v = parsed.data;
  try {
    await withSessionClaims(async (client) => {
      const cols = ["name", "is_active", ...DATE_COLUMNS.map(([, col]) => col)];
      const vals: unknown[] = [
        v.name,
        v.isActive,
        ...DATE_COLUMNS.map(([key]) => nullable(v[key as keyof ProjectFormValues] as string | null)),
      ];

      let projectId = v.id;
      if (projectId) {
        const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
        const result = await client.query(
          `update public.projects set ${setClause} where id = $${cols.length + 1}`,
          [...vals, projectId],
        );
        if (result.rowCount === 0) throw new Error("not_found_or_forbidden");
      } else {
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        const inserted = await client.query(
          `insert into public.projects (${cols.join(", ")}) values (${placeholders}) returning id`,
          vals,
        );
        projectId = inserted.rows[0].id;
      }

      // Replace membership wholesale — simplest correct model for a small admin form.
      await client.query("delete from public.project_members where project_id = $1", [
        projectId,
      ]);
      for (const userId of v.memberIds) {
        const role = v.memberRoles[userId] ?? "member";
        await client.query(
          `insert into public.project_members (project_id, user_id, project_role)
           values ($1, $2, $3)
           on conflict (project_id, user_id) do update set project_role = excluded.project_role`,
          [projectId, userId, role],
        );
      }
    });
  } catch (err) {
    return { ok: false, error: friendlyError(err, "Couldn't save the sprint.") };
  }
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/task-list");
  return { ok: true };
}

export async function upsertTaskType(values: TaskTypeFormValues): Promise<ActionResult> {
  const parsed = taskTypeSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid task type." };
  }
  const v = parsed.data;
  try {
    await withSessionClaims(async (client) => {
      if (v.id) {
        const result = await client.query(
          `update public.task_types set label = $1, is_active = $2, sort_order = $3 where id = $4`,
          [v.label, v.isActive, v.sortOrder, v.id],
        );
        if (result.rowCount === 0) throw new Error("not_found_or_forbidden");
      } else {
        await client.query(
          `insert into public.task_types (label, is_active, sort_order) values ($1, $2, $3)`,
          [v.label, v.isActive, v.sortOrder],
        );
      }
    });
  } catch (err) {
    return { ok: false, error: friendlyError(err, "Couldn't save the task type.") };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function upsertActivity(values: ActivityFormValues): Promise<ActionResult> {
  const parsed = activitySchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid activity." };
  }
  const v = parsed.data;
  try {
    await withSessionClaims(async (client) => {
      if (v.id) {
        const result = await client.query(
          `update public.activities set label = $1, is_active = $2, is_default = $3, sort_order = $4 where id = $5`,
          [v.label, v.isActive, v.isDefault, v.sortOrder, v.id],
        );
        if (result.rowCount === 0) throw new Error("not_found_or_forbidden");
      } else {
        await client.query(
          `insert into public.activities (label, is_active, is_default, sort_order) values ($1, $2, $3, $4)`,
          [v.label, v.isActive, v.isDefault, v.sortOrder],
        );
      }
    });
  } catch (err) {
    return { ok: false, error: friendlyError(err, "Couldn't save the activity.") };
  }
  revalidatePath("/admin");
  return { ok: true };
}

function friendlyError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message === "not_found_or_forbidden") {
    return "Only an Admin can make this change.";
  }
  if (message.includes("duplicate key")) {
    return "That name is already in use.";
  }
  return fallback;
}
