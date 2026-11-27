import test from "node:test"
import assert from "node:assert/strict"
import { apiRequest, API_BASE_URL } from "../../src/lib/api.js"

test("api.js uses Next.js NEXT_PUBLIC_API_BASE_URL or canonical production API base", () => {
  assert.match(API_BASE_URL, /^https?:\/\/.+\/api\/v1$/)
})

test("apiRequest serializes query params, bearer token, and handles 401 storage cleanup safely in Node", async () => {
  const originalFetch = globalThis.fetch
  let capturedUrl = ""
  let capturedHeaders = null

  globalThis.localStorage.setItem("dashboardToken", "expired-tok")
  globalThis.localStorage.setItem("dashboardUser", '{"role":"admin"}')

  globalThis.fetch = async (url, init) => {
    capturedUrl = String(url)
    capturedHeaders = init.headers
    return {
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => JSON.stringify({ message: "Session expired" }),
    }
  }

  try {
    await assert.rejects(
      () => apiRequest("/logs", { token: "jwt-123", params: { category: "error", empty: "" } }),
      (err) => err.message === "Session expired" && err.status === 401
    )
    assert.ok(capturedUrl.includes("/logs?category=error"))
    assert.equal(capturedUrl.includes("empty="), false)
    assert.equal(capturedHeaders.Authorization, "Bearer jwt-123")
    assert.equal(globalThis.localStorage.getItem("dashboardToken"), null)
    assert.equal(globalThis.localStorage.getItem("dashboardUser"), null)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("apiRequest blocks mutating requests when offline while permitting GET requests", async () => {
  const prevOnLine = globalThis.navigator.onLine
  Object.defineProperty(globalThis.navigator, "onLine", { value: false, configurable: true })
  try {
    await assert.rejects(
      () => apiRequest("/orders", { method: "POST", body: { status: "confirmed" } }),
      (err) => err.code === "OFFLINE_MUTATION_BLOCKED" && err.status === 503
    )
  } finally {
    Object.defineProperty(globalThis.navigator, "onLine", { value: prevOnLine, configurable: true })
  }
})
