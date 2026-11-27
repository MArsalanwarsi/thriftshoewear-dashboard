export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://thriftshoewear-backend.vercel.app/api/v1"

const appendQuery = (url, params = {}) => {
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    url.searchParams.set(key, value)
  })
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, token, params } = options
  const upperMethod = String(method).toUpperCase()

  if (
    upperMethod !== "GET" &&
    upperMethod !== "HEAD" &&
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

  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, {
    method: upperMethod,
    headers,
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

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("dashboardToken")
      window.localStorage.removeItem("dashboardUser")
      if (
        window.location.pathname !== "/login" &&
        !path.startsWith("/auth/login")
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
