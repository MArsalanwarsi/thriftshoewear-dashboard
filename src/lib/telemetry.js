const reportedKeys = new Map()
const DEDUPE_MS = 10_000

export function reportClientTelemetry({
  source = "dashboard",
  category = "error",
  level = "error",
  action = "CLIENT_RUNTIME_ERROR",
  message = "",
  errorName = null,
  stack = null,
  statusCode = null,
  metadata = {},
} = {}) {
  if (typeof window === "undefined") return
  if (typeof navigator !== "undefined" && navigator.onLine === false) return

  const cleanMsg = String(message || action).slice(0, 500)
  const dedupeKey = `${source}:${action}:${cleanMsg}`
  const now = Date.now()
  if (now - (reportedKeys.get(dedupeKey) || 0) < DEDUPE_MS) return
  reportedKeys.set(dedupeKey, now)

  const endpoint = `${window.location.origin}/api/v1/logs/client`
  fetch(endpoint, {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      source,
      category,
      level,
      action,
      path: window.location.pathname,
      statusCode,
      message: cleanMsg,
      errorName,
      stack: stack ? String(stack).slice(0, 2000) : null,
      metadata,
    }),
  }).catch(() => {
    // Telemetry must never break UI flows
  })
}

export function installGlobalTelemetry(source = "dashboard") {
  if (typeof window === "undefined") return () => {}

  const onError = (event) => {
    reportClientTelemetry({
      source,
      category: "error",
      level: "error",
      action: `${source.toUpperCase()}_UNCAUGHT_ERROR`,
      message: event?.message || "Uncaught runtime error",
      errorName: event?.error?.name || "Error",
      stack: event?.error?.stack || `${event?.filename || ""}:${event?.lineno || 0}`,
    })
  }

  const onRejection = (event) => {
    const reason = event?.reason
    reportClientTelemetry({
      source,
      category: "error",
      level: "error",
      action: `${source.toUpperCase()}_UNHANDLED_REJECTION`,
      message: reason?.message || String(reason || "Unhandled Promise Rejection"),
      errorName: reason?.name || "UnhandledRejection",
      stack: reason?.stack || null,
    })
  }

  window.addEventListener("error", onError)
  window.addEventListener("unhandledrejection", onRejection)
  return () => {
    window.removeEventListener("error", onError)
    window.removeEventListener("unhandledrejection", onRejection)
  }
}
