export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://thriftshoewear-backend.vercel.app/api/v1"

const AUTH_CHANNEL_NAME = "tsw-dashboard-auth"
let inMemoryCsrfToken = ""

const appendQuery = (url, params = {}) => {
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    url.searchParams.set(key, value)
  })
}

export function setInMemoryCsrfToken(token) {
  inMemoryCsrfToken = typeof token === "string" ? token : ""
}

export function readCookieValue(name) {
  if (typeof document === "undefined" || !document.cookie) return ""
  const target = `${name}=`
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim()
    if (trimmed.startsWith(target)) {
      try {
        return decodeURIComponent(trimmed.slice(target.length))
      } catch {
        return trimmed.slice(target.length)
      }
    }
  }
  return ""
}

export function getActiveCsrfToken() {
  return readCookieValue("tsw_csrf") || inMemoryCsrfToken || ""
}

/**
 * Remove any legacy auth tokens or PII left in browser storage from older releases.
 */
export function purgeLegacyAuthStorage() {
  if (typeof window === "undefined") return
  try {
    window.localStorage?.removeItem("dashboardToken")
    window.localStorage?.removeItem("dashboardUser")
    window.sessionStorage?.removeItem("dashboardToken")
    window.sessionStorage?.removeItem("dashboardUser")
  } catch {
    // Ignore storage access errors in restricted contexts
  }
}

export function broadcastAuthEvent(type) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
    channel.postMessage({ type })
    channel.close()
  } catch {
    // Ignore BroadcastChannel errors
  }
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, token, params } = options
  const upperMethod = String(method).toUpperCase()
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(upperMethod)

  if (
    isMutation &&
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  ) {
    const offlineErr = new Error(
      "You are offline. Cached views remain browsable, while changes are paused until connection returns."
    )
    offlineErr.status = 503
    offlineErr.code = "OFFLINE_MUTATION_BLOCKED"
    throw offlineErr
  }

  const url = new URL(`${API_BASE_URL}${path}`)
  appendQuery(url, params)

  const headers = {
    Accept: "application/json",
  }

  if (path.startsWith("/auth/")) {
    headers["X-Auth-Transport"] = "cookie"
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json"
  }
  if (token && token !== "cookie-session") {
    headers.Authorization = `Bearer ${token}`
  }
  if (isMutation) {
    const csrf = getActiveCsrfToken()
    if (csrf) {
      headers["X-CSRF-Token"] = csrf
    }
  }

  const response = await fetch(url, {
    method: upperMethod,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let payload = {}
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { message: response.ok ? text : response.statusText || "Unexpected server response" }
    }
  }

  if (payload?.data?.csrfToken) {
    setInMemoryCsrfToken(payload.data.csrfToken)
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      purgeLegacyAuthStorage()
      inMemoryCsrfToken = ""
      if (
        window.location.pathname !== "/login" &&
        !path.startsWith("/auth/login") &&
        path !== "/auth/me"
      ) {
        window.location.href = "/login"
      }
    }
    const err = new Error(payload.message || `Request failed with ${response.status}`)
    err.status = response.status
    err.details = payload.details || null
    throw err
  }

  return payload
}
