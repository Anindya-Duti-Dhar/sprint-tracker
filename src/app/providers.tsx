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
        {/* Global loading indicator: page navigation, sprint/filter changes
            (router.push), and anything else that triggers a route transition.
            Rendered as a centered, colorful Material-style circular wheel
            (via a custom template) instead of a top bar. */}
        <NextTopLoader
          height={0}
          shadow={false}
          showSpinner={false}
          template={`
            <div class="stt-loader-backdrop" role="status" aria-label="Loading">
              <div class="stt-loader-wheel"></div>
            </div>
          `}
        />
        <LocalizationProvider dateAdapter={AdapterDateFns}>{children}</LocalizationProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
