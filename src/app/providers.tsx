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
            A slim colorful top bar (unmissable, spans the full width — the
            part that reliably registers even for a fast local navigation)
            plus a centered Material-style colorful wheel for the fuller
            "something is working" feel on slower loads. */}
        <NextTopLoader
          color="linear-gradient(90deg,#4285F4,#EA4335,#FBBC05,#34A853)"
          height={3}
          shadow="0 0 10px rgba(66,133,244,0.6), 0 0 4px rgba(234,67,53,0.5)"
          showSpinner={false}
          template={`
            <div class="bar" role="bar"><div class="peg"></div></div>
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
