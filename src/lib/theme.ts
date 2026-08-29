"use client";

import { createTheme } from "@mui/material/styles";

// Same palette as the project blueprint: a teal accent on a warm-neutral ground.
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1F6F6B", dark: "#0E3F3D", light: "#5FBDB4" },
    background: { default: "#F6F7F6", paper: "#FFFFFF" },
    text: { primary: "#1B2422", secondary: "#57655F" },
    success: { main: "#2E7D4F" },
    warning: { main: "#B4711F" },
    error: { main: "#B23A3A" },
    divider: "#DCE2DF",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "'Public Sans', system-ui, -apple-system, sans-serif",
    h1: { fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 800 },
    h2: { fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 800 },
    h3: { fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 700 },
    h4: { fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 700 },
    h5: { fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 700 },
    h6: { fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        elevation1: {
          boxShadow:
            "0 1px 2px rgba(20,30,28,0.06), 0 8px 24px -12px rgba(20,30,28,0.12)",
        },
      },
    },
    MuiButton: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          color: "#1B2422",
        },
      },
    },
  },
});

export default theme;
