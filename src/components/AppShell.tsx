"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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
  Drawer,
  List,
  ListItemButton,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import MenuIcon from "@mui/icons-material/Menu";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
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
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const links = [
    ...NAV_LINKS,
    ...(user.globalRole === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

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
          bgcolor: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(14px) saturate(160%)",
          WebkitBackdropFilter: "blur(14px) saturate(160%)",
          borderBottom: "1px solid",
          borderColor: scrolled ? "divider" : "transparent",
          boxShadow: scrolled
            ? "0 1px 2px rgba(20,30,28,0.06), 0 12px 32px -16px rgba(20,30,28,0.16)"
            : "none",
          transition: "box-shadow .25s ease, border-color .25s ease",
        }}
      >
        <Toolbar sx={{ gap: 3 }}>
          <Box
            sx={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: 0.2,
              background: "linear-gradient(135deg, #1F6F6B, #5FBDB4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              whiteSpace: "nowrap",
              mr: 1,
            }}
          >
            Sprint Tracker
          </Box>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              flexGrow: 1,
              alignItems: "center",
              position: "relative",
              display: { xs: "none", md: "flex" },
            }}
          >
            {links.map((link) => {
              const active =
                link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname?.startsWith(link.href);
              return (
                <Box
                  key={link.href}
                  component={Link}
                  href={link.href}
                  sx={{
                    position: "relative",
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? "primary.dark" : "text.secondary",
                    transition: "color .18s ease, background-color .18s ease",
                    "&:hover": {
                      color: "primary.dark",
                      bgcolor: "rgba(31,111,107,0.06)",
                    },
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-active-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 8,
                        background: "rgba(31,111,107,0.1)",
                        zIndex: -1,
                      }}
                    />
                  )}
                  {link.href === "/admin" && (
                    <AdminPanelSettingsIcon
                      fontSize="inherit"
                      sx={{ fontSize: 15, verticalAlign: "-2px", mr: 0.5 }}
                    />
                  )}
                  {link.label}
                </Box>
              );
            })}
            <Button
              size="small"
              startIcon={<AddIcon />}
              variant="contained"
              disableElevation
              onClick={() => setQuickAddOpen(true)}
              sx={{
                ml: 1.5,
                background: "linear-gradient(135deg, #1F6F6B, #2C8C86)",
                transition: "transform .15s ease, box-shadow .15s ease",
                "&:hover": {
                  background: "linear-gradient(135deg, #1a615d, #257a75)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 8px 20px -8px rgba(31,111,107,0.6)",
                },
              }}
            >
              New Task
            </Button>
          </Stack>

          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" }, justifyContent: "flex-end" }}>
            <IconButton
              onClick={() => setQuickAddOpen(true)}
              size="small"
              aria-label="New task"
              sx={{ color: "primary.main" }}
            >
              <AddIcon />
            </IconButton>
            <IconButton
              onClick={() => setNavOpen(true)}
              size="small"
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </IconButton>
          </Box>

          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            size="small"
            sx={{
              transition: "transform .15s ease",
              "&:hover": { transform: "scale(1.06)" },
            }}
          >
            <Avatar
              src={user.avatarUrl ?? undefined}
              sx={{
                width: 32,
                height: 32,
                fontSize: 13,
                fontWeight: 700,
                background: "linear-gradient(135deg, #5FBDB4, #1F6F6B)",
                color: "#fff",
              }}
            >
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

      <Drawer anchor="right" open={navOpen} onClose={() => setNavOpen(false)}>
        <Box sx={{ width: 260, pt: 1 }} role="presentation">
          <Box sx={{ px: 2, py: 1.5 }}>
            <Box sx={{ fontWeight: 600, fontSize: 14 }}>{user.fullName}</Box>
            <Box sx={{ fontSize: 12, color: "text.secondary" }}>{user.email}</Box>
          </Box>
          <Divider />
          <List sx={{ py: 0.5 }}>
            {links.map((link) => {
              const active =
                link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname?.startsWith(link.href);
              return (
                <ListItemButton
                  key={link.href}
                  component={Link}
                  href={link.href}
                  selected={active}
                  onClick={() => setNavOpen(false)}
                  sx={{
                    "&.Mui-selected": {
                      bgcolor: "rgba(31,111,107,0.1)",
                      color: "primary.dark",
                      fontWeight: 700,
                    },
                  }}
                >
                  {link.href === "/admin" && (
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <AdminPanelSettingsIcon fontSize="small" />
                    </ListItemIcon>
                  )}
                  <ListItemText>{link.label}</ListItemText>
                </ListItemButton>
              );
            })}
          </List>
          <Divider />
          <List sx={{ py: 0.5 }}>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <motion.div
          key={pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </Container>

      <EntryFormDialog
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        mode="create"
      />
    </Box>
  );
}
