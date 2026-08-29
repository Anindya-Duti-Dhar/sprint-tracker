import { z } from "zod";

// Shared client + server validation for the entry form (blueprint section 08).
export const entrySchema = z.object({
  projectId: z.string().uuid("Choose a sprint."),
  feature: z
    .string()
    .trim()
    .min(3, "Feature must be at least 3 characters.")
    .max(140, "Feature must be 140 characters or fewer."),
  taskTypeId: z.string().uuid("Choose a task type."),
  task: z
    .string()
    .trim()
    .max(500, "Task must be 500 characters or fewer.")
    .optional()
    .or(z.literal("")),
  assigneeId: z.string().uuid("Choose an assignee."),
  androidPocId: z.string().uuid().optional().or(z.literal("")).nullable(),
  hours: z
    .number({ error: "Enter hours." })
    .min(0.5, "Hours must be at least 0.5.")
    .max(13, "Hours must be 13 or fewer.")
    .refine((v) => Math.round(v * 2) === v * 2, "Hours must be in 0.5 steps."),
  activityId: z.string().uuid("Choose an activity."),
  testBuildSharedDate: z.string().optional().or(z.literal("")).nullable(),
  remark: z
    .string()
    .trim()
    .max(300, "Remark must be 300 characters or fewer.")
    .optional()
    .or(z.literal("")),
});

export type EntryFormValues = z.infer<typeof entrySchema>;

export const HOURS_OPTIONS = Array.from({ length: 26 }, (_, i) => (i + 1) * 0.5); // 0.5..13

// Settings page: profile + password (blueprint section 09 — self-service for every role).
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
export type PasswordFormValues = z.infer<typeof passwordSchema>;
