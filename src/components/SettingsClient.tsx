"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  IconButton,
  CircularProgress,
} from "@mui/material";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import CloseIcon from "@mui/icons-material/Close";
import {
  profileSchema,
  passwordSchema,
  type ProfileFormValues,
  type PasswordFormValues,
} from "@/lib/schemas";
import { updateProfile, changePassword, removeAvatar } from "@/lib/actions/profile";
import { resizeImageToJpegBlob } from "@/lib/imageResize";
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
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ alignItems: { xs: "flex-start", sm: "center" }, mb: 2 }}
          >
            <AvatarUploader user={user} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
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

function AvatarUploader({ user }: { user: SessionUser }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const resized = await resizeImageToJpegBlob(file);
      const form = new FormData();
      form.append("file", resized, "avatar.jpg");
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Couldn't upload your photo.");
        return;
      }
      setAvatarUrl(body.avatarUrl);
      router.refresh();
    } catch {
      setError("Couldn't process that image. Try a different file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    try {
      const result = await removeAvatar();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAvatarUrl(null);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <Stack spacing={0.75} sx={{ alignItems: "center" }}>
      <Box sx={{ position: "relative", width: 64, height: 64 }}>
        <Avatar
          src={avatarUrl ?? undefined}
          sx={{ width: 64, height: 64, bgcolor: "primary.light", fontSize: 22 }}
        >
          {initials(user.fullName)}
        </Avatar>
        {uploading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0,0,0,0.35)",
            }}
          >
            <CircularProgress size={22} sx={{ color: "#fff" }} />
          </Box>
        )}
        <IconButton
          size="small"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          sx={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 26,
            height: 26,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 2px 6px -1px rgba(20,30,28,0.25)",
            "&:hover": { bgcolor: "background.paper" },
          }}
        >
          <PhotoCameraOutlinedIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFileChange}
        />
      </Box>
      {avatarUrl && (
        <Button
          size="small"
          color="inherit"
          startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
          onClick={handleRemove}
          disabled={uploading}
          sx={{ fontSize: 11, minWidth: 0, color: "text.secondary" }}
        >
          Remove
        </Button>
      )}
      {error && (
        <Typography variant="caption" color="error" sx={{ maxWidth: 120, textAlign: "center" }}>
          {error}
        </Typography>
      )}
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
