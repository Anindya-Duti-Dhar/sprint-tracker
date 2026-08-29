"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grow,
  Stack,
  TextField,
  MenuItem,
  Button,
  Alert,
  Box,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { entrySchema, type EntryFormValues } from "@/lib/schemas";
import { createEntry, updateEntry } from "@/lib/actions/entries";
import { ACTIVITY_COLORS } from "@/lib/activityColors";

type Lookups = {
  projects: { id: string; name: string; is_active: boolean }[];
  taskTypes: { id: string; label: string }[];
  activities: { id: string; label: string; is_default: boolean }[];
  members: { id: string; full_name: string; project_role: string }[];
  resolvedProjectId: string | null;
  currentUserId: string;
  canAssignOthers: boolean;
};

export type EntryRecord = {
  id: string;
  projectId: string;
  feature: string;
  taskTypeId: string;
  task: string | null;
  assigneeId: string;
  androidPocId: string | null;
  hours: number;
  activityId: string;
  testBuildSharedDate: string | null;
  remark: string | null;
};

export default function EntryFormDialog({
  open,
  onClose,
  mode,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  entry?: EntryRecord;
}) {
  const router = useRouter();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down("sm"));
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      projectId: "",
      feature: "",
      taskTypeId: "",
      task: "",
      assigneeId: "",
      androidPocId: "",
      hours: 1,
      activityId: "",
      testBuildSharedDate: "",
      remark: "",
    },
  });

  const projectId = watch("projectId");

  async function fetchLookups(forProjectId?: string) {
    setLoadingLookups(true);
    try {
      const url = forProjectId
        ? `/api/form-data?projectId=${forProjectId}`
        : "/api/form-data";
      const res = await fetch(url);
      const data: Lookups = await res.json();
      setLookups(data);
      return data;
    } finally {
      setLoadingLookups(false);
    }
  }

  // Load lookups + defaults whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setServerError(null);
    (async () => {
      if (mode === "edit" && entry) {
        const data = await fetchLookups(entry.projectId);
        reset({
          projectId: entry.projectId,
          feature: entry.feature,
          taskTypeId: entry.taskTypeId,
          task: entry.task ?? "",
          assigneeId: entry.assigneeId,
          androidPocId: entry.androidPocId ?? "",
          hours: entry.hours,
          activityId: entry.activityId,
          testBuildSharedDate: entry.testBuildSharedDate ?? "",
          remark: entry.remark ?? "",
        });
        void data;
      } else {
        const data = await fetchLookups();
        const defaultActivity = data.activities.find((a) => a.is_default);
        reset({
          projectId: data.resolvedProjectId ?? "",
          feature: "",
          taskTypeId: "",
          task: "",
          // A member can only ever log tasks for themselves — lock the
          // Assignee field to their own id rather than let them pick.
          assigneeId: data.canAssignOthers ? "" : data.currentUserId,
          androidPocId: "",
          hours: 1,
          activityId: defaultActivity?.id ?? "",
          testBuildSharedDate: "",
          remark: "",
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, entry?.id]);

  // Re-scope Assignee/Android POC when the user changes the Sprint dropdown.
  const lastFetchedProjectRef = useMemoRef(projectId);
  useEffect(() => {
    if (!open || !projectId) return;
    if (lastFetchedProjectRef.current === projectId) return;
    lastFetchedProjectRef.current = projectId;
    fetchLookups(projectId).then((data) => {
      const stillValidAssignee = data.members.some((m) => m.id === watch("assigneeId"));
      const stillValidPoc = data.members.some((m) => m.id === watch("androidPocId"));
      if (!stillValidAssignee) {
        setValue("assigneeId", data.canAssignOthers ? "" : data.currentUserId);
      }
      if (!stillValidPoc) setValue("androidPocId", "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, open]);

  async function onSubmit(values: EntryFormValues) {
    setServerError(null);
    const result =
      mode === "edit" && entry
        ? await updateEntry(entry.id, values)
        : await createEntry(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  const members = lookups?.members ?? [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreenDialog}
      slots={{ transition: Grow }}
    >
      <DialogTitle>{mode === "edit" ? "Edit task" : "Add task"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          {!lookups || loadingLookups ? (
            <Stack sx={{ alignItems: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : (
            <Stack spacing={2.25}>
              {serverError && <Alert severity="error">{serverError}</Alert>}

              <TextField
                select
                label="Sprint"
                fullWidth
                {...register("projectId")}
                value={watch("projectId") ?? ""}
                error={!!errors.projectId}
                helperText={errors.projectId?.message}
              >
                {lookups.projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} {p.is_active ? "· active" : ""}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Feature"
                fullWidth
                {...register("feature")}
                error={!!errors.feature}
                helperText={errors.feature?.message}
              />

              <TextField
                select
                label="Task Type"
                fullWidth
                {...register("taskTypeId")}
                value={watch("taskTypeId") ?? ""}
                error={!!errors.taskTypeId}
                helperText={errors.taskTypeId?.message}
              >
                {lookups.taskTypes.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Task"
                fullWidth
                multiline
                minRows={2}
                {...register("task")}
                error={!!errors.task}
                helperText={errors.task?.message}
              />

              <TextField
                select
                label="Assignee"
                fullWidth
                disabled={!lookups?.canAssignOthers}
                {...register("assigneeId")}
                value={watch("assigneeId") ?? ""}
                error={!!errors.assigneeId}
                helperText={
                  errors.assigneeId?.message ??
                  (lookups?.canAssignOthers
                    ? "Scoped to this sprint's members"
                    : "Members can only log tasks for themselves")
                }
              >
                {members.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.full_name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Android POC"
                fullWidth
                {...register("androidPocId")}
                value={watch("androidPocId") ?? ""}
                error={!!errors.androidPocId}
                helperText={errors.androidPocId?.message}
              >
                <MenuItem value="">—</MenuItem>
                {members.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.full_name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Android (Hrs)"
                type="number"
                fullWidth
                {...register("hours", { valueAsNumber: true })}
                error={!!errors.hours}
                helperText={errors.hours?.message ?? "0.5 to 100 hours."}
                slotProps={{ htmlInput: { min: 0.5, max: 100, step: 0.5 } }}
              />

              <TextField
                select
                label="Activity"
                fullWidth
                {...register("activityId")}
                value={watch("activityId") ?? ""}
                error={!!errors.activityId}
                helperText={errors.activityId?.message}
              >
                {lookups.activities.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: ACTIVITY_COLORS[a.label] ?? "grey.400",
                        mr: 1.25,
                      }}
                    />
                    {a.label}
                  </MenuItem>
                ))}
              </TextField>

              <Controller
                name="testBuildSharedDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Test Build Shared Date (Android)"
                    value={field.value ? parseISO(field.value) : null}
                    onChange={(date) =>
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                )}
              />

              <TextField
                label="Remark"
                fullWidth
                multiline
                minRows={2}
                {...register("remark")}
                error={!!errors.remark}
                helperText={errors.remark?.message}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || !lookups}>
            {isSubmitting ? "Saving…" : mode === "edit" ? "Save changes" : "Add task"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// Small helper: a ref that survives re-renders without triggering them,
// used to avoid re-fetching members for a project we already fetched.
function useMemoRef(initial: string) {
  const ref = useMemo(() => ({ current: initial }), []); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}
