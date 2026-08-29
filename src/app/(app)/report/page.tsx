import { Paper, Typography } from "@mui/material";

export default function ReportPage() {
  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5">Report</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Cross-sprint charts and Excel export are coming in a later phase (blueprint
        section 07/10). The Task List and Dashboard are fully working now.
      </Typography>
    </Paper>
  );
}
