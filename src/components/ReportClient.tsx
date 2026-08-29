"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  Grid,
} from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { ACTIVITY_CHIP_STYLE } from "@/lib/activityColors";

type Row = { label: string; hours: number };
type Project = { id: string; name: string; is_active: boolean };

// Validated categorical palette (dataviz skill reference instance), first 3
// slots — safe for the small, fixed set of Task Types (Revamp/CR/New).
const CATEGORICAL = ["#2a78d6", "#eb6834", "#1baf7a"];
const BRAND_HUE = "#1F6F6B"; // single sequential hue: magnitude, not identity

const chartMargin = { top: 8, right: 16, left: 8, bottom: 8 };

function ChartCard({
  title,
  subtitle,
  data,
  colorFor,
  horizontal = false,
}: {
  title: string;
  subtitle: string;
  data: Row[];
  colorFor: (label: string, i: number) => string;
  horizontal?: boolean;
}) {
  return (
    <Paper sx={{ p: 2.5, height: "100%" }}>
      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {subtitle}
      </Typography>
      {data.length === 0 ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No hours logged yet.
          </Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(220, horizontal ? data.length * 40 : 260)}>
          <BarChart
            data={data}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={chartMargin}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={!horizontal} vertical={horizontal} />
            {horizontal ? (
              <>
                <XAxis type="number" tick={{ fontSize: 12, fill: "#898781" }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tick={{ fontSize: 12, fill: "#52514e" }}
                />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#52514e" }} />
                <YAxis tick={{ fontSize: 12, fill: "#898781" }} />
              </>
            )}
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(1)}h`, "Hours"]}
              contentStyle={{ fontSize: 13, borderRadius: 8 }}
            />
            <Bar dataKey="hours" radius={[4, 4, 4, 4]} maxBarSize={28}>
              {data.map((row, i) => (
                <Cell key={row.label} fill={colorFor(row.label, i)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}

export default function ReportClient({
  projects,
  resolvedProjectId,
  byActivity,
  byTaskType,
  byMember,
  crossSprint,
  canExport,
}: {
  projects: Project[];
  resolvedProjectId: string | null;
  byActivity: Row[];
  byTaskType: Row[];
  byMember: Row[];
  crossSprint: Row[];
  canExport: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setSprint(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sprint", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeName = projects.find((p) => p.id === resolvedProjectId)?.name ?? "—";

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5">Report</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Sprint breakdowns and cross-sprint totals.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <TextField
            select
            size="small"
            label="Sprint"
            value={resolvedProjectId ?? ""}
            onChange={(e) => setSprint(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} {p.is_active ? "· active" : ""}
              </MenuItem>
            ))}
          </TextField>
          {canExport && (
            <Button
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              component="a"
              href={`/api/entries/export${resolvedProjectId ? `?sprint=${resolvedProjectId}` : ""}`}
            >
              Export
            </Button>
          )}
        </Stack>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }} className="stt-row-in" sx={{ animationDelay: "0ms" }}>
          <ChartCard
            title="Hours by Activity"
            subtitle={`${activeName} — where the work stands right now`}
            data={byActivity}
            horizontal
            colorFor={(label) => ACTIVITY_CHIP_STYLE[label]?.color ?? BRAND_HUE}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }} className="stt-row-in" sx={{ animationDelay: "60ms" }}>
          <ChartCard
            title="Hours by Task Type"
            subtitle={`${activeName} — Revamp / CR / New split`}
            data={byTaskType}
            colorFor={(_, i) => CATEGORICAL[i % CATEGORICAL.length]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }} className="stt-row-in" sx={{ animationDelay: "120ms" }}>
          <ChartCard
            title="Hours by Member"
            subtitle={`${activeName} — who's logged what`}
            data={byMember}
            horizontal
            colorFor={() => BRAND_HUE}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }} className="stt-row-in" sx={{ animationDelay: "180ms" }}>
          <ChartCard
            title="Hours across sprints"
            subtitle="Every sprint, all time"
            data={crossSprint}
            colorFor={() => BRAND_HUE}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
