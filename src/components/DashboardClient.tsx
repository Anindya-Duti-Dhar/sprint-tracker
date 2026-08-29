"use client";

import { Grid, Paper, Stack, Typography, Chip, Box, Divider, Avatar, Tooltip } from "@mui/material";
import { motion } from "framer-motion";
import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import DonutLargeOutlinedIcon from "@mui/icons-material/DonutLargeOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
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
  deadlineLabel: string | null;
  milestones: { label: string; date: string | null }[];
  sprintPocName: string | null;
  assistantPocName: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const cardMotion = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: "easeOut" as const },
});

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
        <Grid size={{ xs: 12, sm: 6, md: 4 }} component={motion.div} {...cardMotion(0)}>
          <StatCard
            label="Current sprint"
            accent="teal"
            icon={<RocketLaunchOutlinedIcon fontSize="inherit" />}
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
              sx={{ mr: 1, transition: "background-color .25s ease" }}
            />
            <Typography component="span" variant="body2" color="text.secondary">
              Dev {data.devStartLabel} – {data.devEndLabel}
            </Typography>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }} component={motion.div} {...cardMotion(1)}>
          <StatCard
            label="Days remaining"
            accent="amber"
            icon={<EventAvailableOutlinedIcon fontSize="inherit" />}
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
        <Grid size={{ xs: 12, sm: 6, md: 4 }} component={motion.div} {...cardMotion(2)}>
          <StatCard
            label="Total hours logged"
            value={data.totalHours}
            decimals={1}
            accent="slate"
            icon={<ScheduleOutlinedIcon fontSize="inherit" />}
          >
            Across all entries this sprint
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }} component={motion.div} {...cardMotion(3)}>
          <StatCard
            label="Team capacity"
            value={data.capacity}
            decimals={1}
            accent="violet"
            icon={<GroupsOutlinedIcon fontSize="inherit" />}
          >
            {data.memberCount} members × {data.workdays} working days × 6.5h
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }} component={motion.div} {...cardMotion(4)}>
          <StatCard
            label="Remaining capacity"
            value={data.remainingCapacity}
            decimals={1}
            accent="rose"
            icon={<DonutLargeOutlinedIcon fontSize="inherit" />}
          >
            Capacity − hours logged
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }} component={motion.div} {...cardMotion(5)}>
          <Paper
            sx={{
              p: 2.5,
              height: "100%",
              background:
                "linear-gradient(160deg, #F3F6F5 0%, #FAFBFA 55%, #FFFFFF 100%)",
            }}
          >
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

      <Box component={motion.div} {...cardMotion(6)}>
        <Paper
          sx={{
            p: 2.5,
            background: "linear-gradient(135deg, #EEF3F4 0%, #F9FBFB 45%, #FFFFFF 100%)",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 2.5, md: 4 }}
            sx={{ alignItems: { xs: "stretch", md: "center" } }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 200 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: "14px",
                  bgcolor: "rgba(255,255,255,0.75)",
                  color: "#46595A",
                  fontSize: 24,
                  boxShadow: "0 2px 8px -2px rgba(20,30,28,0.18)",
                  flexShrink: 0,
                }}
              >
                <FlagOutlinedIcon fontSize="inherit" />
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
                  Sprint details
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {data.projectName}
                </Typography>
                {data.deadlineLabel && (
                  <Typography variant="body2" color="text.secondary">
                    Deadline: {data.deadlineLabel}
                  </Typography>
                )}
              </Box>
            </Stack>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />

            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: "wrap", gap: 1, flexGrow: 1, rowGap: 1 }}
            >
              {data.milestones.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No milestone dates set yet.
                </Typography>
              ) : (
                data.milestones.map((m) => (
                  <Chip
                    key={m.label}
                    size="small"
                    variant="outlined"
                    label={`${m.label}: ${m.date}`}
                    sx={{ bgcolor: "rgba(255,255,255,0.6)" }}
                  />
                ))
              )}
            </Stack>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />

            <Stack direction="row" spacing={2.5}>
              {[
                { role: "Sprint POC", name: data.sprintPocName, color: "#1F6F6B" },
                { role: "Assistant POC", name: data.assistantPocName, color: "#6A4FB2" },
              ].map(({ role, name, color }) => (
                <Stack key={role} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Tooltip title={role}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: name ? color : "rgba(0,0,0,0.08)",
                        color: name ? "#fff" : "text.disabled",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {name ? initials(name) : <PersonOutlineOutlinedIcon fontSize="small" />}
                    </Avatar>
                  </Tooltip>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", lineHeight: 1.2, whiteSpace: "nowrap" }}
                    >
                      {role}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, lineHeight: 1.3, whiteSpace: "nowrap" }}
                    >
                      {name ?? "Not assigned"}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}
