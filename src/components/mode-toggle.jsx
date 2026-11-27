"use client"

import { Moon, Sun } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { Button } from "@/components/ui/button"
import { selectThemeMode, toggleTheme } from "@/store/themeSlice"

export function ModeToggle() {
  const dispatch = useDispatch()
  const mode = useSelector(selectThemeMode)
  const isDark = mode === "dark"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => dispatch(toggleTheme())}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative size-9 overflow-hidden"
    >
      <Sun
        className={`h-[1.15rem] w-[1.15rem] transition-all duration-250 ease-in-out ${
          isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        }`}
      />
      <Moon
        className={`absolute h-[1.15rem] w-[1.15rem] transition-all duration-250 ease-in-out ${
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
        }`}
      />
    </Button>
  )
}
