"use client"

import { useEffect, useSyncExternalStore } from "react"
import { Provider, useDispatch } from "react-redux"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { store } from "@/store/store"
import { fetchMe, hydrateAuth, logout } from "@/store/authSlice"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { installGlobalTelemetry } from "@/lib/telemetry"

function AuthBootstrap({ children }) {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(hydrateAuth())
    dispatch(fetchMe())
    return installGlobalTelemetry("dashboard")
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

const emptySubscribe = () => () => {}

function VercelTelemetry() {
  const isProdBrowser = useSyncExternalStore(
    emptySubscribe,
    () => window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1",
    () => false,
  )

  if (!isProdBrowser) return null

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
      <ThemeProvider>
        <AuthBootstrap>{children}</AuthBootstrap>
        <Toaster position="bottom-right" richColors closeButton />
        <VercelTelemetry />
      </ThemeProvider>
    </Provider>
  )
}

export default Providers
