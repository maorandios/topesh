/** Shared side-panel / sheet / drawer surface for light + dark themes. */
export const panelSurfaceClass =
  "border-border bg-card text-card-foreground shadow-lg dark:bg-[#16161a]"

/** Opaque card fill — avoids translucent mixes that break in dark mode. */
export const panelSurfaceStyle = {
  backgroundColor: "var(--card)",
} as const
