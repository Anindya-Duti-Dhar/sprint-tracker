"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  AppBar,
  Toolbar,
  Box,
  Stack,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Container,
  Button,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import EntryFormDialog from "@/components/EntryFormDialog";
import type { SessionUser } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/report", label: "Report" },
  { href: "/task-list", label: "Task List" },
  { href: "/settings", label: "Settings" },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          boxShadow: scrolled
            ? "0 1px 2px rgba(20,30,28,0.06), 0 8px 24px -12px rgba(20,30,28,0.12)"
            : "none",
          transition: "box-shadow .2s ease",
        }}
      >
        <Toolbar sx={{ gap: 3 }}>
          <Stack direction="row" spacing={3} sx={{ flexGrow: 1, alignItems: "center" }}>
            {NAV_LINKS.map((link) => {
              const active = pathname?.startsWith(link.href);
              return (
                <Box
                  key={link.href}
                  component={Link}
                  href={link.href}
                  sx={{
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? "primary.dark" : "text.secondary",
                  }}
                >
                  {link.label}
                </Box>
              );
            })}
            <Button
              size="small"
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={() => setQuickAddOpen(true)}
            >
              New Task
            </Button>
          </Stack>

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
            <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: "primary.light" }}>
              {initials(user.fullName) || <PersonIcon fontSize="small" />}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Box sx={{ fontWeight: 600, fontSize: 14 }}>{user.fullName}</Box>
              <Box sx={{ fontSize: 12, color: "text.secondary" }}>{user.email}</Box>
            </Box>
            <Divider />
            <MenuItem
              component={Link}
              href="/settings"
              onClick={() => setAnchorEl(null)}
            >
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>

      <EntryFormDialog
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        mode="create"
      />
    </Box>
  );
}
