export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://thriftshoewear-backend.vercel.app/api/v1"

const appendQuery = (url, params = {}) => {
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    url.searchParams.set(key, value)
  })
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, token, params } = options
  const url = new URL(`${API_BASE_URL}${path}`)
  appendQuery(url, params)

  const headers = {
    Accept: "application/json",
  }

  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("dashboardToken")
      localStorage.removeItem("dashboardUser")
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login" &&
        !path.startsWith("/auth/login")
      ) {
        window.location.href = "/login"
      }
    }
    throw new Error(payload.message || `Request failed with ${response.status}`)
  }

  return payload
}
