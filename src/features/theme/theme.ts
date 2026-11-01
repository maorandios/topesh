export const THEME_STORAGE_KEY = "topesh-theme"

export type AppTheme = "light" | "dark"

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "light" || value === "dark"
}

export function applyThemeClass(theme: AppTheme) {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
}
