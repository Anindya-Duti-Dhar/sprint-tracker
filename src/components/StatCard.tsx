"use client";

import { Paper, Typography, Box } from "@mui/material";
import CountUpNumber from "@/components/CountUpNumber";

// Each accent pairs a bar gradient, a soft tinted card background (materialistic —
// a whisper of color rather than flat white), and a saturated icon color so the
// icon reads as genuinely colorful rather than a faint monochrome watermark.
const ACCENTS: Record<string, { bar: string; bg: string; icon: string }> = {
  teal: {
    bar: "linear-gradient(90deg, #1F6F6B, #5FBDB4)",
    bg: "linear-gradient(160deg, #EAFBF8 0%, #F8FFFE 55%, #FFFFFF 100%)",
    icon: "#1F9C90",
  },
  amber: {
    bar: "linear-gradient(90deg, #B4711F, #E5A25A)",
    bg: "linear-gradient(160deg, #FFF6E8 0%, #FFFCF6 55%, #FFFFFF 100%)",
    icon: "#D98A2B",
  },
  rose: {
    bar: "linear-gradient(90deg, #B23A3A, #E17C7C)",
    bg: "linear-gradient(160deg, #FFEEEE 0%, #FFF8F8 55%, #FFFFFF 100%)",
    icon: "#D8524F",
  },
  slate: {
    bar: "linear-gradient(90deg, #46595A, #8FA6A7)",
    bg: "linear-gradient(160deg, #EEF3F4 0%, #F9FBFB 55%, #FFFFFF 100%)",
    icon: "#4C7A7D",
  },
  violet: {
    bar: "linear-gradient(90deg, #6A4FB2, #A98DE0)",
    bg: "linear-gradient(160deg, #F3EEFD 0%, #FAF8FF 55%, #FFFFFF 100%)",
    icon: "#7C5CD1",
  },
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
  const palette = ACCENTS[accent];
  return (
    <Paper
      sx={{
        position: "relative",
        p: 2.5,
        pt: 3,
        height: "100%",
        overflow: "hidden",
        background: palette.bg,
        transition: "transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow:
            "0 4px 10px rgba(20,30,28,0.08), 0 20px 44px -18px rgba(20,30,28,0.24)",
        },
        "&:hover .stat-icon": { opacity: 1, transform: "scale(1.1) rotate(-4deg)" },
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
          background: palette.bar,
        }}
      />
      {icon && (
        <Box
          className="stat-icon"
          sx={{
            position: "absolute",
            top: 12,
            right: 14,
            fontSize: 30,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: "14px",
            color: palette.icon,
            bgcolor: "rgba(255,255,255,0.65)",
            boxShadow: "0 2px 8px -2px rgba(20,30,28,0.18)",
            opacity: 0.92,
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
