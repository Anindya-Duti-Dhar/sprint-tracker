"use client";

import { Paper, Typography, Box } from "@mui/material";
import CountUpNumber from "@/components/CountUpNumber";

export default function StatCard({
  label,
  value,
  decimals = 0,
  valueNode,
  children,
}: {
  label: string;
  value?: number;
  decimals?: number;
  valueNode?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Paper
      sx={{
        p: 2.5,
        height: "100%",
        transition: "transform .18s ease, box-shadow .18s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow:
            "0 2px 6px rgba(20,30,28,0.08), 0 16px 36px -16px rgba(20,30,28,0.2)",
        },
        "@media (prefers-reduced-motion: reduce)": {
          transition: "none",
          "&:hover": { transform: "none" },
        },
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.5, mb: 0.75 }}>
        {valueNode ?? (
          <Typography variant="h4" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
            {value !== undefined ? <CountUpNumber value={value} decimals={decimals} /> : null}
          </Typography>
        )}
      </Box>
      <Box sx={{ typography: "body2", color: "text.secondary" }}>{children}</Box>
    </Paper>
  );
}
