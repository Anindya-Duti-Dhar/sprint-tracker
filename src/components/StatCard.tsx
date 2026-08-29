"use client";

import { Paper, Typography, Box } from "@mui/material";
import CountUpNumber from "@/components/CountUpNumber";

const ACCENTS: Record<string, string> = {
  teal: "linear-gradient(90deg, #1F6F6B, #5FBDB4)",
  amber: "linear-gradient(90deg, #B4711F, #E5A25A)",
  rose: "linear-gradient(90deg, #B23A3A, #E17C7C)",
  slate: "linear-gradient(90deg, #46595A, #8FA6A7)",
};

export default function StatCard({
  label,
  value,
  decimals = 0,
  valueNode,
  children,
  icon,
  accent = "teal",
}: {
  label: string;
  value?: number;
  decimals?: number;
  valueNode?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <Paper
      sx={{
        position: "relative",
        p: 2.5,
        pt: 3,
        height: "100%",
        overflow: "hidden",
        transition: "transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow:
            "0 4px 10px rgba(20,30,28,0.08), 0 20px 44px -18px rgba(20,30,28,0.24)",
        },
        "&:hover .stat-icon": { opacity: 0.16, transform: "scale(1.08) rotate(-4deg)" },
        "@media (prefers-reduced-motion: reduce)": {
          transition: "none",
          "&:hover": { transform: "none" },
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: ACCENTS[accent],
        }}
      />
      {icon && (
        <Box
          className="stat-icon"
          sx={{
            position: "absolute",
            top: 10,
            right: 12,
            fontSize: 52,
            lineHeight: 1,
            color: "primary.main",
            opacity: 0.08,
            transition: "opacity .25s ease, transform .25s ease",
            pointerEvents: "none",
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.5, mb: 0.75, position: "relative" }}>
        {valueNode ?? (
          <Typography variant="h4" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
            {value !== undefined ? <CountUpNumber value={value} decimals={decimals} /> : null}
          </Typography>
        )}
      </Box>
      <Box sx={{ typography: "body2", color: "text.secondary", position: "relative" }}>
        {children}
      </Box>
    </Paper>
  );
}
