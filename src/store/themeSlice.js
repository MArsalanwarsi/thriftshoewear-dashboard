import { createSlice } from "@reduxjs/toolkit"

export const THEME_STORAGE_KEY = "tsw-dashboard-theme"

const readSavedTheme = () => {
  if (typeof window === "undefined") return "light"
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === "dark" || saved === "light") return saved
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light"
  } catch {
    return "light"
  }
}

const persistTheme = (mode) => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // Ignore storage quota errors
  }
}

const themeSlice = createSlice({
  name: "theme",
  initialState: {
    mode: "light",
    hydrated: false,
  },
  reducers: {
    hydrateTheme(state) {
      state.mode = readSavedTheme()
      state.hydrated = true
    },
    setTheme(state, action) {
      const next = action.payload === "dark" ? "dark" : "light"
      state.mode = next
      state.hydrated = true
      persistTheme(next)
    },
    toggleTheme(state) {
      const next = state.mode === "dark" ? "light" : "dark"
      state.mode = next
      state.hydrated = true
      persistTheme(next)
    },
  },
})

export const { hydrateTheme, setTheme, toggleTheme } = themeSlice.actions
export const selectThemeMode = (state) => state.theme?.mode || "light"
export default themeSlice.reducer
