export const colors = {
  primary: "#2563eb",
  primaryLight: "#3b82f6",
  primaryDark: "#1d4ed8",

  background: "#f8fafc",
  surface: "#ffffff",

  text: "#1e293b",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",

  border: "#e2e8f0",
  borderLight: "#f1f5f9",

  success: "#16a34a",
  warning: "#f59e0b",
  error: "#ef4444",

  white: "#ffffff",
  black: "#000000",
} as const;

export const fonts = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 36,
  },
  weights: {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;
