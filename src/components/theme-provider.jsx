"use client"

import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { hydrateTheme, selectThemeMode, setTheme, toggleTheme } from "@/store/themeSlice"

export function ThemeProvider({ children }) {
  const dispatch = useDispatch()
  const mode = useSelector(selectThemeMode)

  useEffect(() => {
    dispatch(hydrateTheme())
  }, [dispatch])

  useEffect(() => {
    if (typeof window === "undefined") return
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(mode === "dark" ? "dark" : "light")
  }, [mode])

  return children
}

export function useTheme() {
  const dispatch = useDispatch()
  const theme = useSelector(selectThemeMode)
  return {
    theme,
    setTheme: (next) => dispatch(setTheme(next)),
    toggleTheme: () => dispatch(toggleTheme()),
  }
}
