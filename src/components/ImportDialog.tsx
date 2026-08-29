"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Alert,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  CircularProgress,
  Link as MuiLink,
} from "@mui/material";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import type { PreviewRow } from "@/app/api/entries/import/preview/route";
import { confirmImport } from "@/lib/actions/import";

export default function ImportDialog({
  open,
  onClose,
  sprintId,
  sprintName,
}: {
  open: boolean;
  onClose: () => void;
  sprintId: string | null;
  sprintName: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ rows: PreviewRow[]; validCount: number; invalidCount: number } | null>(
    null,
  );
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  function reset() {
    setPreview(null);
    setError(null);
    setDone(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    if (!sprintId) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    setDone(null);
    try {
      const form = new FormData();
      form.append("sprintId", sprintId);
      form.append("file", file);
      const res = await fetch("/api/entries/import/preview", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't preview that file.");
        return;
      }
      setPreview(data);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!sprintId || !preview) return;
    setImporting(true);
    setError(null);
    const result = await confirmImport(sprintId, preview.rows);
    setImporting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(result.imported ?? 0);
    setPreview(null);
    router.refresh();
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Import tasks — {sprintName}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {!sprintId && <Alert severity="warning">Pick a sprint in the filter above first.</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          {done !== null && (
            <Alert severity="success" onClose={() => setDone(null)}>
              Imported {done} task{done === 1 ? "" : "s"}.
            </Alert>
          )}

          <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              component="a"
              href={sprintId ? `/api/entries/import-template?sprint=${sprintId}` : undefined}
              disabled={!sprintId}
            >
              Download template
            </Button>
            <Button
              variant="contained"
              startIcon={<UploadFileOutlinedIcon />}
              disabled={!sprintId || loading}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? "Reading…" : "Choose file"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Fill in the downloaded template, then upload it here to preview before importing.
            </Typography>
          </Stack>

          {loading && (
            <Stack sx={{ alignItems: "center", py: 3 }}>
              <CircularProgress size={28} />
            </Stack>
          )}

          {preview && (
            <>
              <Stack direction="row" spacing={1}>
                <Chip
                  size="small"
                  color="success"
                  label={`${preview.validCount} ready to import`}
                />
                {preview.invalidCount > 0 && (
                  <Chip size="small" color="error" label={`${preview.invalidCount} need fixing`} />
                )}
              </Stack>
              <Box sx={{ overflowX: "auto", maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Row</TableCell>
                      <TableCell>Feature</TableCell>
                      <TableCell>Assignee</TableCell>
                      <TableCell>Hrs</TableCell>
                      <TableCell>Activity</TableCell>
                      <TableCell>Issues</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.rows.map((r) => (
                      <TableRow
                        key={r.rowNumber}
                        sx={r.errors.length ? { bgcolor: "rgba(178,58,58,0.06)" } : undefined}
                      >
                        <TableCell>{r.rowNumber}</TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>{r.feature}</TableCell>
                        <TableCell>{r.assigneeLabel}</TableCell>
                        <TableCell>{r.hours ?? "—"}</TableCell>
                        <TableCell>{r.activityLabel}</TableCell>
                        <TableCell sx={{ color: "error.main", fontSize: 12 }}>
                          {r.errors.join(" ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}

          <Typography variant="body2" color="text.secondary">
            Need the raw column list instead? See the{" "}
            <MuiLink href={sprintId ? `/api/entries/export?sprint=${sprintId}` : "#"}>
              current export
            </MuiLink>{" "}
            for the exact format.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Close
        </Button>
        <Button
          variant="contained"
          disabled={!preview || preview.validCount === 0 || importing}
          onClick={handleConfirm}
        >
          {importing ? "Importing…" : `Import ${preview?.validCount ?? 0} task(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
