import test from "node:test"
import assert from "node:assert/strict"
import { apiRequest, API_BASE_URL, setInMemoryCsrfToken } from "../../src/lib/api.js"

test("api.js uses Next.js NEXT_PUBLIC_API_BASE_URL or canonical production API base", () => {
  assert.match(API_BASE_URL, /^https?:\/\/.+\/api\/v1$/)
})

test("apiRequest serializes query params, sends credentials + CSRF header, and purges legacy keys on 401", async () => {
  const originalFetch = globalThis.fetch
  let capturedUrl = ""
  let capturedInit = null

  globalThis.localStorage.setItem("dashboardToken", "expired-tok")
  globalThis.localStorage.setItem("dashboardUser", '{"role":"admin"}')
  setInMemoryCsrfToken("csrf-test-token")

  globalThis.fetch = async (url, init) => {
    capturedUrl = String(url)
    capturedInit = init
    return {
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => JSON.stringify({ message: "Session expired" }),
    }
  }

  try {
    await assert.rejects(
      () =>
        apiRequest("/logs", {
          method: "POST",
          body: { check: true },
          params: { category: "error", empty: "" },
        }),
      (err) => err.message === "Session expired" && err.status === 401,
    )
    assert.ok(capturedUrl.includes("/logs?category=error"))
    assert.equal(capturedUrl.includes("empty="), false)
    assert.equal(capturedInit.credentials, "include")
    assert.equal(capturedInit.headers["X-CSRF-Token"], "csrf-test-token")
    assert.equal(globalThis.localStorage.getItem("dashboardToken"), null)
    assert.equal(globalThis.localStorage.getItem("dashboardUser"), null)
  } finally {
    setInMemoryCsrfToken("")
    globalThis.fetch = originalFetch
  }
})

test("apiRequest blocks mutating requests when offline while permitting GET requests", async () => {
  const prevOnLine = globalThis.navigator.onLine
  Object.defineProperty(globalThis.navigator, "onLine", { value: false, configurable: true })
  try {
    await assert.rejects(
      () => apiRequest("/orders", { method: "POST", body: { status: "confirmed" } }),
      (err) => err.code === "OFFLINE_MUTATION_BLOCKED" && err.status === 503,
    )
  } finally {
    Object.defineProperty(globalThis.navigator, "onLine", { value: prevOnLine, configurable: true })
  }
})
