import { Paper, Typography } from "@mui/material";
import { getSessionUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await getSessionUser();
  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5">Settings</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Signed in as {user?.fullName} ({user?.globalRole}). Profile editing, Sprint
        Details, and Dropdown Lists management are coming in a later phase (blueprint
        section 09).
      </Typography>
    </Paper>
  );
}
