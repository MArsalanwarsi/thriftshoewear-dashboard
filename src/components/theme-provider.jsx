"use client"

import { useCallback, useEffect, useState } from "react"

const DEFAULT_STORAGE_KEY = "tsw-dashboard-theme"
const THEME_EVENT = "tsw-dashboard-theme-change"

function applyThemeToDocument(theme) {
  if (typeof window === "undefined") return undefined
  const root = window.document.documentElement
  root.classList.remove("light", "dark")

  if (theme === "system") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const syncSystem = () => {
      root.classList.remove("light", "dark")
      root.classList.add(mediaQuery.matches ? "dark" : "light")
    }
    syncSystem()
    mediaQuery.addEventListener("change", syncSystem)
    return () => mediaQuery.removeEventListener("change", syncSystem)
  }

  root.classList.add(theme)
  return undefined
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = DEFAULT_STORAGE_KEY,
}) {
  const [theme, setThemeState] = useState(defaultTheme)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey) || defaultTheme
      setThemeState(saved)
    } catch {
      setThemeState(defaultTheme)
    }

    const onThemeEvent = (event) => {
      if (event?.detail?.theme) {
        setThemeState(event.detail.theme)
      }
    }
    window.addEventListener(THEME_EVENT, onThemeEvent)
    return () => window.removeEventListener(THEME_EVENT, onThemeEvent)
  }, [defaultTheme, storageKey])

  useEffect(() => applyThemeToDocument(theme), [theme])

  return children
}

export function useTheme(storageKey = DEFAULT_STORAGE_KEY) {
  const [theme, setThemeState] = useState("system")

  useEffect(() => {
    try {
      setThemeState(window.localStorage.getItem(storageKey) || "system")
    } catch {
      setThemeState("system")
    }

    const onThemeEvent = (event) => {
      if (event?.detail?.theme) {
        setThemeState(event.detail.theme)
      }
    }
    window.addEventListener(THEME_EVENT, onThemeEvent)
    return () => window.removeEventListener(THEME_EVENT, onThemeEvent)
  }, [storageKey])

  const setTheme = useCallback(
    (nextTheme) => {
      try {
        window.localStorage.setItem(storageKey, nextTheme)
      } catch {
        // Ignore storage failure
      }
      setThemeState(nextTheme)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme: nextTheme } }))
      }
    },
    [storageKey],
  )

  return { theme, setTheme }
}
