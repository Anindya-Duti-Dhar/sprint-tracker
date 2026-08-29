"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  Avatar,
  Divider,
} from "@mui/material";
import {
  profileSchema,
  passwordSchema,
  type ProfileFormValues,
  type PasswordFormValues,
} from "@/lib/schemas";
import { updateProfile, changePassword } from "@/lib/actions/profile";
import type { SessionUser } from "@/lib/auth";

const ROLE_COLOR: Record<string, "error" | "warning" | "info" | "default"> = {
  admin: "error",
  manager: "warning",
  member: "info",
  viewer: "default",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function SettingsClient({ user }: { user: SessionUser }) {
  return (
    <Stack spacing={3} sx={{ maxWidth: 560 }}>
      <Box>
        <Typography variant="h5">Settings</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Manage your profile and password.
        </Typography>
      </Box>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
            <Avatar sx={{ width: 44, height: 44, bgcolor: "primary.light" }}>
              {initials(user.fullName)}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>{user.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={user.globalRole}
              color={ROLE_COLOR[user.globalRole] ?? "default"}
              sx={{ textTransform: "capitalize" }}
            />
          </Stack>
          <Divider sx={{ mb: 2.5 }} />
          <ProfileForm user={user} />
        </Paper>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
      >
        <Paper sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>Change password</Typography>
          <PasswordForm />
        </Paper>
      </motion.div>
    </Stack>
  );
}

function ProfileForm({ user }: { user: SessionUser }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName },
  });

  async function onSubmit(values: ProfileFormValues) {
    setServerError(null);
    setSaved(false);
    const result = await updateProfile(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2}>
        {serverError && <Alert severity="error">{serverError}</Alert>}
        {saved && (
          <Alert severity="success" onClose={() => setSaved(false)}>
            Profile updated.
          </Alert>
        )}
        <TextField
          label="Full name"
          fullWidth
          {...register("fullName")}
          error={!!errors.fullName}
          helperText={errors.fullName?.message}
        />
        <TextField label="Email" fullWidth value={user.email} disabled />
        <Box>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

function PasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: PasswordFormValues) {
    setServerError(null);
    setSaved(false);
    const result = await changePassword(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    setSaved(true);
    reset();
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2}>
        {serverError && <Alert severity="error">{serverError}</Alert>}
        {saved && (
          <Alert severity="success" onClose={() => setSaved(false)}>
            Password changed.
          </Alert>
        )}
        <TextField
          label="Current password"
          type="password"
          fullWidth
          {...register("currentPassword")}
          error={!!errors.currentPassword}
          helperText={errors.currentPassword?.message}
        />
        <TextField
          label="New password"
          type="password"
          fullWidth
          {...register("newPassword")}
          error={!!errors.newPassword}
          helperText={errors.newPassword?.message}
        />
        <TextField
          label="Confirm new password"
          type="password"
          fullWidth
          {...register("confirmPassword")}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
        />
        <Box>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Change password"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
