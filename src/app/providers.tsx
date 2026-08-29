"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import NextTopLoader from "nextjs-toploader";
import theme from "@/lib/theme";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Global progress bar: page navigation, sprint/filter changes (router.push),
            and anything else that triggers a route transition. */}
        <NextTopLoader
          color="linear-gradient(90deg,#1F6F6B,#5FBDB4)"
          height={3}
          shadow="0 0 10px #5FBDB4, 0 0 5px #1F6F6B"
          showSpinner={false}
        />
        <LocalizationProvider dateAdapter={AdapterDateFns}>{children}</LocalizationProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
