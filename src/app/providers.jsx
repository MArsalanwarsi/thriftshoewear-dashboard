"use client"

import { useEffect, useState } from "react"
import { Provider, useDispatch, useSelector } from "react-redux"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { store } from "@/store/store"
import { fetchMe, hydrateAuth, logout } from "@/store/authSlice"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

function AuthBootstrap({ children }) {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(hydrateAuth())
    dispatch(fetchMe())
  }, [dispatch])

  useEffect(() => {
    if (typeof window === "undefined") return undefined

    let channel = null
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("tsw-dashboard-auth")
      channel.onmessage = (event) => {
        if (event?.data?.type === "logout") {
          dispatch(logout())
        }
      }
    }

    const handleStorage = (event) => {
      if (event.key === "dashboardToken" && !event.newValue) {
        dispatch(logout())
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener("storage", handleStorage)
      channel?.close()
    }
  }, [dispatch])

  return children
}

function VercelTelemetry() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const host = window.location.hostname
    if (host !== "localhost" && host !== "127.0.0.1") {
      setEnabled(true)
    }
  }, [])

  if (!enabled) return null

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <ThemeProvider defaultTheme="system" storageKey="tsw-dashboard-theme">
        <AuthBootstrap>{children}</AuthBootstrap>
        <Toaster position="bottom-right" richColors closeButton />
        <VercelTelemetry />
      </ThemeProvider>
    </Provider>
  )
}

export default Providers
