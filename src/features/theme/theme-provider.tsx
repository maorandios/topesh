"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  THEME_STORAGE_KEY,
  applyThemeClass,
  isAppTheme,
  type AppTheme,
} from "@/features/theme/theme"

type ThemeContextValue = {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): AppTheme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (isAppTheme(stored)) return stored
  } catch {
    /* ignore */
  }
  return "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("light")

  useEffect(() => {
    const initial = readStoredTheme()
    setThemeState(initial)
    applyThemeClass(initial)
  }, [])

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next)
    applyThemeClass(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [setTheme, theme])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return ctx
}
