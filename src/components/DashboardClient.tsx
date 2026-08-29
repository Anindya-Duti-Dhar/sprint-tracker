"use client";

import { Grid, Paper, Stack, Typography, Chip, Box, Divider } from "@mui/material";
import StatCard from "@/components/StatCard";

const STATUS_COLOR: Record<string, "default" | "success" | "warning"> = {
  Planning: "default",
  Started: "success",
  Completed: "warning",
};

export type DashboardData = {
  projectName: string;
  status: "Planning" | "Started" | "Completed";
  devStartLabel: string;
  devEndLabel: string;
  remaining: number | null;
  totalHours: number;
  capacity: number;
  remainingCapacity: number;
  memberCount: number;
  workdays: number;
  byMember: { name: string; hours: number }[];
};

export default function DashboardClient({ data }: { data: DashboardData }) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Dashboard</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Current sprint at a glance.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label="Current sprint"
            valueNode={
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {data.projectName}
              </Typography>
            }
          >
            <Chip
              size="small"
              label={data.status}
              color={STATUS_COLOR[data.status]}
              sx={{ mr: 1 }}
            />
            <Typography component="span" variant="body2" color="text.secondary">
              Dev {data.devStartLabel} – {data.devEndLabel}
            </Typography>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label="Days remaining"
            valueNode={
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {data.remaining ?? "—"}{" "}
                <Typography component="span" variant="body2" color="text.secondary">
                  days
                </Typography>
              </Typography>
            }
          >
            Counted between Dev Start and Dev End
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard label="Total hours logged" value={data.totalHours} decimals={1}>
            Across all entries this sprint
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard label="Team capacity" value={data.capacity} decimals={1}>
            {data.memberCount} members × {data.workdays} working days × 6.5h
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label="Remaining capacity"
            value={data.remainingCapacity}
            decimals={1}
          >
            Capacity − hours logged
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper sx={{ p: 2.5, height: "100%" }}>
            <Typography variant="overline" color="text.secondary">
              Hours by member
            </Typography>
            <Stack divider={<Divider />} sx={{ mt: 1 }}>
              {data.byMember.map((m) => (
                <Stack
                  key={m.name}
                  direction="row"
                  sx={{ justifyContent: "space-between", py: 0.75 }}
                >
                  <Typography variant="body2">{m.name}</Typography>
                  <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {m.hours.toFixed(1)}h
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
