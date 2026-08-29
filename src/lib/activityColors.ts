// Status-chip colors for the Activity dropdown (blueprint section 09/13).
// Semantic, not the brand accent — see the "materialistic" motion spec.
export const ACTIVITY_COLORS: Record<string, string> = {
  Planning: "grey.400",
  TODO: "warning.main",
  "Dev In-progress": "primary.main",
  Done: "success.main",
  Pause: "warning.dark",
  Stop: "error.main",
  Shifted: "grey.500",
  QA: "primary.dark",
  Released: "success.dark",
  Live: "success.main",
};

export const ACTIVITY_CHIP_STYLE: Record<
  string,
  { bg: string; color: string }
> = {
  Planning: { bg: "#EEF1F0", color: "#57655F" },
  TODO: { bg: "#F7ECDC", color: "#B4711F" },
  "Dev In-progress": { bg: "#E3EFEC", color: "#0E3F3D" },
  Done: { bg: "#E3F1E7", color: "#2E7D4F" },
  Pause: { bg: "#F7ECDC", color: "#8A5416" },
  Stop: { bg: "#F6E4E2", color: "#B23A3A" },
  Shifted: { bg: "#EEF1F0", color: "#57655F" },
  QA: { bg: "#E3EFEC", color: "#0E3F3D" },
  Released: { bg: "#E3F1E7", color: "#1F5C38" },
  Live: { bg: "#E3F1E7", color: "#2E7D4F" },
};
