"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { withSessionClaims } from "@/lib/auth";
import {
  profileSchema,
  passwordSchema,
  type ProfileFormValues,
  type PasswordFormValues,
} from "@/lib/schemas";
import type { ActionResult } from "@/lib/actions/entries";

/** Every role can edit their own display name (blueprint section 09). */
export async function updateProfile(values: ProfileFormValues): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name." };
  }
  try {
    const result = await withSessionClaims((client) =>
      client.query(
        `update public.profiles set full_name = $1 where id = auth.uid()`,
        [parsed.data.fullName],
      ),
    );
    if (result.rowCount === 0) {
      return { ok: false, error: "You must be signed in to update your profile." };
    }
  } catch {
    return { ok: false, error: "Couldn't save your name. Please try again." };
  }
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Removes the caller's own profile photo (reverts to initials everywhere). */
export async function removeAvatar(): Promise<ActionResult> {
  try {
    const result = await withSessionClaims((client) =>
      client.query(`update public.profiles set avatar_url = null where id = auth.uid()`),
    );
    if (result.rowCount === 0) {
      return { ok: false, error: "You must be signed in to update your photo." };
    }
  } catch {
    return { ok: false, error: "Couldn't remove your photo. Please try again." };
  }
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Self-service password change for every role. Only ever targets the
 * currently-signed-in user's own auth.users row (never accepts a target id
 * from the caller) — this is the one write path that reaches into `auth.*`
 * directly rather than going through an RLS policy, since RLS in this schema
 * only covers `public.*` tables.
 */
export async function changePassword(values: PasswordFormValues): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }
  const { currentPassword, newPassword } = parsed.data;
  try {
    return await withSessionClaims(async (client) => {
      const me = await client.query("select auth.uid() as id");
      const userId = me.rows[0]?.id;
      if (!userId) return { ok: false, error: "You must be signed in to change your password." };

      const row = await client.query(
        "select encrypted_password from auth.users where id = $1",
        [userId],
      );
      const currentHash = row.rows[0]?.encrypted_password;
      if (!currentHash || !(await bcrypt.compare(currentPassword, currentHash))) {
        return { ok: false, error: "Your current password is incorrect." };
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await client.query("update auth.users set encrypted_password = $1 where id = $2", [
        newHash,
        userId,
      ]);
      return { ok: true };
    });
  } catch {
    return { ok: false, error: "Couldn't change your password. Please try again." };
  }
}
