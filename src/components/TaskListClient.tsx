"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import EntryFormDialog, { type EntryRecord } from "@/components/EntryFormDialog";
import ImportDialog from "@/components/ImportDialog";
import { deleteEntry } from "@/lib/actions/entries";
import { ACTIVITY_CHIP_STYLE } from "@/lib/activityColors";

type Project = { id: string; name: string; is_active: boolean };
type TaskType = { id: string; label: string };
type Member = { id: string; full_name: string };
type EntryRow = {
  id: string;
  project_id: string;
  feature: string;
  task: string | null;
  hours: string;
  test_build_shared_date: string | null;
  remark: string | null;
  created_by: string;
  task_type_id: string;
  task_type_label: string;
  activity_id: string;
  activity_label: string;
  assignee_id: string;
  assignee_name: string;
  android_poc_id: string | null;
  android_poc_name: string | null;
};

export default function TaskListClient({
  projects,
  taskTypes,
  members,
  entries,
  resolvedProjectId,
  filters,
}: {
  projects: Project[];
  taskTypes: TaskType[];
  members: Member[];
  entries: EntryRow[];
  resolvedProjectId: string | null;
  filters: { sprint?: string; taskType?: string; assignee?: string; poc?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; entry: EntryRecord } | null
  >(null);
  const [confirmDelete, setConfirmDelete] = useState<EntryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function toEntryRecord(row: EntryRow): EntryRecord {
    return {
      id: row.id,
      projectId: row.project_id,
      feature: row.feature,
      taskTypeId: row.task_type_id,
      task: row.task,
      assigneeId: row.assignee_id,
      androidPocId: row.android_poc_id,
      hours: Number(row.hours),
      activityId: row.activity_id,
      // RSC can hand this prop over as a real Date instance rather than the
      // string it was in Postgres/JSON — normalize to "yyyy-MM-dd" either way.
      testBuildSharedDate: row.test_build_shared_date
        ? new Date(row.test_build_shared_date).toISOString().slice(0, 10)
        : null,
      remark: row.remark,
    };
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    await deleteEntry(confirmDelete.id);
    setDeleting(false);
    setConfirmDelete(null);
    router.refresh();
  }

  const activeProjectName = projects.find((p) => p.id === resolvedProjectId)?.name;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="h5">Task List</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {filters.sprint
              ? `Showing sprint ${activeProjectName ?? ""}`
              : `Showing the active sprint (${activeProjectName ?? "none"})`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<DownloadOutlinedIcon />}
            component="a"
            href={`/api/entries/export${resolvedProjectId ? `?sprint=${resolvedProjectId}` : ""}`}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={() => setImportOpen(true)}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialog({ mode: "create" })}
          >
            Add
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
          <TextField
            select
            size="small"
            label="Sprint"
            sx={{ minWidth: 160 }}
            value={filters.sprint ?? resolvedProjectId ?? ""}
            onChange={(e) => setFilter("sprint", e.target.value)}
          >
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} {p.is_active ? "· active" : ""}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Task Type"
            sx={{ minWidth: 160 }}
            value={filters.taskType ?? ""}
            onChange={(e) => setFilter("taskType", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {taskTypes.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Assignee"
            sx={{ minWidth: 160 }}
            value={filters.assignee ?? ""}
            onChange={(e) => setFilter("assignee", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {members.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.full_name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Android POC"
            sx={{ minWidth: 160 }}
            value={filters.poc ?? ""}
            onChange={(e) => setFilter("poc", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {members.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.full_name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {entries.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center" }}>
          <Typography variant="h6">No tasks yet</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            Nothing has been logged for this sprint yet.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialog({ mode: "create" })}
          >
            Add first task
          </Button>
        </Paper>
      ) : (
        <Paper sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Feature</TableCell>
                <TableCell>Task Type</TableCell>
                <TableCell>Task</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell>Android POC</TableCell>
                <TableCell align="right">Hrs</TableCell>
                <TableCell>Activity</TableCell>
                <TableCell>Test Build Date</TableCell>
                <TableCell>Remark</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((row) => {
                const chipStyle = ACTIVITY_CHIP_STYLE[row.activity_label] ?? {
                  bg: "#EEF1F0",
                  color: "#57655F",
                };
                const canEdit = true; // RLS is the real gate; UI just offers the action
                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ maxWidth: 220 }}>{row.feature}</TableCell>
                    <TableCell>{row.task_type_label}</TableCell>
                    <TableCell sx={{ maxWidth: 220, color: "text.secondary" }}>
                      {row.task ?? "—"}
                    </TableCell>
                    <TableCell>{row.assignee_name}</TableCell>
                    <TableCell>{row.android_poc_name ?? "—"}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {Number(row.hours).toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.activity_label}
                        sx={{
                          bgcolor: chipStyle.bg,
                          color: chipStyle.color,
                          fontWeight: 600,
                          transition: "background-color .25s ease, color .25s ease",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {row.test_build_shared_date
                        ? new Date(row.test_build_shared_date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 160, color: "text.secondary" }}>
                      {row.remark ?? "—"}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={canEdit ? "Edit" : "You can't edit this task"}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setDialog({ mode: "edit", entry: toEntryRecord(row) })
                            }
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setConfirmDelete(row)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      <EntryFormDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        mode={dialog?.mode ?? "create"}
        entry={dialog?.mode === "edit" ? dialog.entry : undefined}
      />

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete this task?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            "{confirmDelete?.feature}" will be permanently removed. This can't be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(null)} color="inherit">
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            onClick={handleConfirmDelete}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        sprintId={resolvedProjectId}
        sprintName={activeProjectName ?? "—"}
      />
    </Stack>
  );
}
