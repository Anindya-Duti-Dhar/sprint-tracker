"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
  Stack,
  Typography,
  Alert,
  Grid,
  Divider,
  Avatar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/EditOutlined";
import {
  createUserSchema,
  projectSchema,
  taskTypeSchema,
  activitySchema,
  GLOBAL_ROLES,
  PROJECT_ROLES,
  DATE_FIELD_KEYS,
  type CreateUserFormValues,
  type ProjectFormValues,
  type TaskTypeFormValues,
  type ActivityFormValues,
} from "@/lib/schemas";
import {
  createUser,
  updateUserRole,
  upsertProject,
  upsertTaskType,
  upsertActivity,
} from "@/lib/actions/admin";

const DATE_FIELDS: { key: (typeof DATE_FIELD_KEYS)[number]; label: string }[] = [
  { key: "planningDate", label: "Planning" },
  { key: "devStartDate", label: "Dev Start" },
  { key: "devEndDate", label: "Dev End" },
  { key: "qaStartDate", label: "QA Start" },
  { key: "qaEndDate", label: "QA End" },
  { key: "uatStagingStartDate", label: "UAT Staging Start" },
  { key: "uatStagingEndDate", label: "UAT Staging End" },
  { key: "uatPreprodStartDate", label: "UAT Preprod Start" },
  { key: "uatPreprodEndDate", label: "UAT Preprod End" },
  { key: "securityScanningDate", label: "Security Scanning & Observation" },
  { key: "productionDeploymentDate", label: "Production Deployment" },
  { key: "betaReleaseDate", label: "Beta Release" },
  { key: "commercialReleaseDate", label: "Commercial Release" },
];

const ROLE_COLOR: Record<string, "error" | "warning" | "info" | "default"> = {
  admin: "error",
  manager: "warning",
  member: "info",
  viewer: "default",
};

type User = {
  id: string;
  email: string;
  full_name: string;
  global_role: string;
  avatar_url: string | null;
  created_at: string;
};

function userInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
type Project = Record<string, unknown> & { id: string; name: string; is_active: boolean };
type TaskType = { id: string; label: string; is_active: boolean; sort_order: number };
type Activity = {
  id: string;
  label: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
};
type Member = { project_id: string; user_id: string; project_role: string };

export default function AdminClient({
  users,
  projects,
  taskTypes,
  activities,
  members,
}: {
  users: User[];
  projects: Project[];
  taskTypes: TaskType[];
  activities: Activity[];
  members: Member[];
}) {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Admin
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2.5 }}>
        Users, sprint details, and the Task Type / Activity dropdown lists.
      </Typography>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2.5, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Users" />
        <Tab label="Sprints" />
        <Tab label="Dropdown lists" />
      </Tabs>
      {tab === 0 && <UsersPanel users={users} />}
      {tab === 1 && <SprintsPanel projects={projects} users={users} members={members} />}
      {tab === 2 && <LookupsPanel taskTypes={taskTypes} activities={activities} />}
    </Box>
  );
}

// ---------------------------------------------------------------- Users ----

function UsersPanel({ users }: { users: User[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  async function handleRoleChange(userId: string, role: string) {
    setSavingRole(userId);
    await updateUserRole(userId, role);
    setSavingRole(null);
    router.refresh();
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add user
        </Button>
      </Box>
      <Paper sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Joined</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Avatar src={u.avatar_url ?? undefined} sx={{ width: 26, height: 26, fontSize: 11 }}>
                      {userInitials(u.full_name)}
                    </Avatar>
                    <Typography variant="body2">{u.full_name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ color: "text.secondary" }}>{u.email}</TableCell>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    value={u.global_role}
                    disabled={savingRole === u.id}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    sx={{ minWidth: 130 }}
                    slotProps={{
                      input: {
                        sx: { fontSize: 13 },
                      },
                    }}
                  >
                    {GLOBAL_ROLES.map((r) => (
                      <MenuItem key={r} value={r}>
                        <Chip
                          size="small"
                          label={r}
                          color={ROLE_COLOR[r]}
                          sx={{ textTransform: "capitalize" }}
                        />
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell sx={{ color: "text.secondary" }}>
                  {new Date(u.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <CreateUserDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Stack>
  );
}

function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", fullName: "", password: "", globalRole: "member" },
  });

  async function onSubmit(values: CreateUserFormValues) {
    setServerError(null);
    const result = await createUser(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    reset();
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add user</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          <Stack spacing={2.25}>
            {serverError && <Alert severity="error">{serverError}</Alert>}
            <TextField
              label="Full name"
              fullWidth
              {...register("fullName")}
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
            />
            <TextField
              label="Email"
              fullWidth
              {...register("email")}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              label="Temporary password"
              type="text"
              fullWidth
              {...register("password")}
              error={!!errors.password}
              helperText={errors.password?.message ?? "They can change this later in Settings."}
            />
            <TextField
              select
              label="Role"
              fullWidth
              defaultValue="member"
              {...register("globalRole")}
              value={watch("globalRole")}
            >
              {GLOBAL_ROLES.map((r) => (
                <MenuItem key={r} value={r} sx={{ textTransform: "capitalize" }}>
                  {r}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create user"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// -------------------------------------------------------------- Sprints ----

function toProjectFormValues(p: Project | null, members: Member[]): ProjectFormValues {
  const memberIds: string[] = [];
  const memberRoles: Record<string, (typeof PROJECT_ROLES)[number]> = {};
  if (p) {
    for (const m of members) {
      if (m.project_id === p.id) {
        memberIds.push(m.user_id);
        memberRoles[m.user_id] = m.project_role as (typeof PROJECT_ROLES)[number];
      }
    }
  }
  const dateVals: Record<string, string> = Object.fromEntries(
    DATE_FIELD_KEYS.map((key) => {
      const col = key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
      const raw = p?.[col] as string | Date | null | undefined;
      return [key, raw ? new Date(raw).toISOString().slice(0, 10) : ""];
    }),
  );
  return {
    ...dateVals,
    id: p?.id,
    name: p?.name ?? "",
    isActive: p?.is_active ?? false,
    memberIds,
    memberRoles,
    sprintPocId: (p?.sprint_poc_id as string | null) ?? "",
    assistantPocId: (p?.assistant_poc_id as string | null) ?? "",
  } as ProjectFormValues;
}

function SprintsPanel({
  projects,
  users,
  members,
}: {
  projects: Project[];
  users: User[];
  members: Member[];
}) {
  const [dialogProject, setDialogProject] = useState<Project | null | undefined>(undefined);

  const fmt = (v: unknown) => (v ? new Date(v as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—");
  const userName = (id: unknown) => users.find((u) => u.id === id)?.full_name ?? "—";

  return (
    <Stack spacing={2.5}>
      <Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogProject(null)}>
          Add sprint
        </Button>
      </Box>
      <Paper sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Dev Start</TableCell>
              <TableCell>Dev End</TableCell>
              <TableCell>Sprint POC</TableCell>
              <TableCell>Assistant POC</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projects.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  {p.is_active ? (
                    <Chip size="small" label="Active" color="success" />
                  ) : (
                    <Chip size="small" label="Inactive" />
                  )}
                </TableCell>
                <TableCell>{fmt(p.dev_start_date)}</TableCell>
                <TableCell>{fmt(p.dev_end_date)}</TableCell>
                <TableCell>{userName(p.sprint_poc_id)}</TableCell>
                <TableCell>{userName(p.assistant_poc_id)}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => setDialogProject(p)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      {dialogProject !== undefined && (
        <SprintDialog
          project={dialogProject}
          users={users}
          members={members}
          onClose={() => setDialogProject(undefined)}
        />
      )}
    </Stack>
  );
}

function SprintDialog({
  project,
  users,
  members,
  onClose,
}: {
  project: Project | null;
  users: User[];
  members: Member[];
  onClose: () => void;
}) {
  const router = useRouter();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down("sm"));
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: toProjectFormValues(project, members),
  });

  const memberIds = watch("memberIds") ?? [];
  const memberRoles = watch("memberRoles") ?? {};
  const sprintPocId = watch("sprintPocId") ?? "";
  const assistantPocId = watch("assistantPocId") ?? "";
  const pocOptions = users.filter((u) => memberIds.includes(u.id));

  function toggleMember(userId: string) {
    if (memberIds.includes(userId)) {
      setValue(
        "memberIds",
        memberIds.filter((id) => id !== userId),
      );
      // A POC must be a current member — drop the selection along with them.
      if (sprintPocId === userId) setValue("sprintPocId", "");
      if (assistantPocId === userId) setValue("assistantPocId", "");
    } else {
      setValue("memberIds", [...memberIds, userId]);
      if (!memberRoles[userId]) {
        setValue("memberRoles", { ...memberRoles, [userId]: "member" });
      }
    }
  }

  async function onSubmit(values: ProjectFormValues) {
    setServerError(null);
    const result = await upsertProject(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreenDialog}>
      <DialogTitle>{project ? "Edit sprint" : "Add sprint"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers sx={{ maxHeight: fullScreenDialog ? "none" : "70vh" }}>
          <Stack spacing={2.5}>
            {serverError && <Alert severity="error">{serverError}</Alert>}
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <TextField
                label="Sprint name"
                fullWidth
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
              <FormControlLabel
                control={
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                    )}
                  />
                }
                label="Active"
                sx={{ whiteSpace: "nowrap" }}
              />
            </Stack>

            <Divider>Milestone dates</Divider>
            <Grid container spacing={2}>
              {DATE_FIELDS.map(({ key, label }) => (
                <Grid size={{ xs: 12, sm: 6 }} key={key}>
                  <Controller
                    name={key}
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label={label}
                        value={field.value ? parseISO(field.value) : null}
                        onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        slotProps={{ textField: { fullWidth: true, size: "small" } }}
                      />
                    )}
                  />
                </Grid>
              ))}
            </Grid>

            <Divider>Members</Divider>
            <Stack spacing={1}>
              {users.map((u) => {
                const checked = memberIds.includes(u.id);
                return (
                  <Stack
                    key={u.id}
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: "center" }}
                  >
                    <FormControlLabel
                      sx={{ flexGrow: 1, m: 0 }}
                      control={<Switch size="small" checked={checked} onChange={() => toggleMember(u.id)} />}
                      label={u.full_name}
                    />
                    {checked && (
                      <TextField
                        select
                        size="small"
                        value={memberRoles[u.id] ?? "member"}
                        onChange={(e) =>
                          setValue("memberRoles", {
                            ...memberRoles,
                            [u.id]: e.target.value as (typeof PROJECT_ROLES)[number],
                          })
                        }
                        sx={{ minWidth: 120 }}
                      >
                        {PROJECT_ROLES.map((r) => (
                          <MenuItem key={r} value={r} sx={{ textTransform: "capitalize" }}>
                            {r}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </Stack>
                );
              })}
            </Stack>

            <Divider>Points of contact</Divider>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Sprint POC"
                  fullWidth
                  size="small"
                  disabled={pocOptions.length === 0}
                  value={sprintPocId}
                  onChange={(e) => setValue("sprintPocId", e.target.value)}
                  helperText={
                    pocOptions.length === 0
                      ? "Add members above first"
                      : "Shown on the Dashboard's Sprint Details card"
                  }
                >
                  <MenuItem value="">—</MenuItem>
                  {pocOptions.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.full_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Assistant POC"
                  fullWidth
                  size="small"
                  disabled={pocOptions.length === 0}
                  value={assistantPocId}
                  onChange={(e) => setValue("assistantPocId", e.target.value)}
                  helperText={pocOptions.length === 0 ? "Add members above first" : undefined}
                >
                  <MenuItem value="">—</MenuItem>
                  {pocOptions.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.full_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save sprint"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// --------------------------------------------------------------- Lookups ---

function LookupsPanel({
  taskTypes,
  activities,
}: {
  taskTypes: TaskType[];
  activities: Activity[];
}) {
  const [taskTypeDialog, setTaskTypeDialog] = useState<TaskType | null | undefined>(undefined);
  const [activityDialog, setActivityDialog] = useState<Activity | null | undefined>(undefined);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ fontWeight: 700 }}>Task Types</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setTaskTypeDialog(null)}>
              Add
            </Button>
          </Stack>
          <Paper>
            <Table size="small">
              <TableBody>
                {taskTypes.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>{t.label}</TableCell>
                    <TableCell>
                      {t.is_active ? (
                        <Chip size="small" label="Active" color="success" />
                      ) : (
                        <Chip size="small" label="Hidden" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setTaskTypeDialog(t)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ fontWeight: 700 }}>Activities</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setActivityDialog(null)}>
              Add
            </Button>
          </Stack>
          <Paper>
            <Table size="small">
              <TableBody>
                {activities.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell>
                      {a.label} {a.is_default && <Chip size="small" label="default" sx={{ ml: 0.5 }} />}
                    </TableCell>
                    <TableCell>
                      {a.is_active ? (
                        <Chip size="small" label="Active" color="success" />
                      ) : (
                        <Chip size="small" label="Hidden" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setActivityDialog(a)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Stack>
      </Grid>
      {taskTypeDialog !== undefined && (
        <TaskTypeDialog taskType={taskTypeDialog} onClose={() => setTaskTypeDialog(undefined)} />
      )}
      {activityDialog !== undefined && (
        <ActivityDialog activity={activityDialog} onClose={() => setActivityDialog(undefined)} />
      )}
    </Grid>
  );
}

function TaskTypeDialog({
  taskType,
  onClose,
}: {
  taskType: TaskType | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TaskTypeFormValues>({
    resolver: zodResolver(taskTypeSchema),
    defaultValues: {
      id: taskType?.id,
      label: taskType?.label ?? "",
      isActive: taskType?.is_active ?? true,
      sortOrder: taskType?.sort_order ?? 0,
    },
  });

  async function onSubmit(values: TaskTypeFormValues) {
    setServerError(null);
    const result = await upsertTaskType(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{taskType ? "Edit task type" : "Add task type"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          <Stack spacing={2.25}>
            {serverError && <Alert severity="error">{serverError}</Alert>}
            <TextField
              label="Label"
              fullWidth
              {...register("label")}
              error={!!errors.label}
              helperText={errors.label?.message}
            />
            <TextField
              label="Sort order"
              type="number"
              fullWidth
              {...register("sortOrder", { valueAsNumber: true })}
            />
            <FormControlLabel
              control={
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                  )}
                />
              }
              label="Active (shown in the entry form)"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function ActivityDialog({
  activity,
  onClose,
}: {
  activity: Activity | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      id: activity?.id,
      label: activity?.label ?? "",
      isActive: activity?.is_active ?? true,
      isDefault: activity?.is_default ?? false,
      sortOrder: activity?.sort_order ?? 0,
    },
  });

  async function onSubmit(values: ActivityFormValues) {
    setServerError(null);
    const result = await upsertActivity(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{activity ? "Edit activity" : "Add activity"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          <Stack spacing={2.25}>
            {serverError && <Alert severity="error">{serverError}</Alert>}
            <TextField
              label="Label"
              fullWidth
              {...register("label")}
              error={!!errors.label}
              helperText={errors.label?.message}
            />
            <TextField
              label="Sort order"
              type="number"
              fullWidth
              {...register("sortOrder", { valueAsNumber: true })}
            />
            <FormControlLabel
              control={
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                  )}
                />
              }
              label="Active (shown in the entry form)"
            />
            <FormControlLabel
              control={
                <Controller
                  name="isDefault"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                  )}
                />
              }
              label="Default on new tasks"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
