export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "infra-os.theme.v1";

export const THEME_COLORS = {
  light: {
    paper: "#f5f6f6",
    canvas: "#fafbfb",
    canvasGrid: "#cbd2d8",
    minimapMask: "rgba(240, 243, 245, 0.72)",
    minimapRack: "#1d3347",
    minimapPower: "#b55229",
    minimapRoom: "#c9d0d5",
    viewerBackground: "#edf0f2",
    viewerGridMajor: "#bac2c9",
    viewerGridMinor: "#d5dade",
  },
  dark: {
    paper: "#11171b",
    canvas: "#10181c",
    canvasGrid: "#3b4d55",
    minimapMask: "rgba(12, 18, 22, 0.72)",
    minimapRack: "#75a4bd",
    minimapPower: "#d88456",
    minimapRoom: "#56646b",
    viewerBackground: "#121b20",
    viewerGridMajor: "#596a72",
    viewerGridMinor: "#34444b",
  },
} satisfies Record<Theme, Record<string, string>>;

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  } catch {
    // The system preference remains a useful fallback when storage is unavailable.
  }

  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}
