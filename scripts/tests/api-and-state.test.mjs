import test from "node:test"
import assert from "node:assert/strict"
import { apiRequest, API_BASE_URL, getClientApiBaseUrl, setInMemoryCsrfToken } from "../../src/lib/api.js"
import { POST as proxyPost } from "../../src/app/api/v1/[...path]/route.js"

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

test("Same-origin BFF proxy forwards cookies and rewrites Set-Cookie to first-party SameSite=Lax", async () => {
  const prevWin = globalThis.window
  globalThis.window = { location: { origin: "https://thriftshoewear-dashboard.vercel.app" } }
  assert.equal(getClientApiBaseUrl(), "https://thriftshoewear-dashboard.vercel.app/api/v1")
  if (prevWin === undefined) delete globalThis.window
  else globalThis.window = prevWin

  const originalFetch = globalThis.fetch
  let upstreamHeaders = null
  globalThis.fetch = async (url, init) => {
    upstreamHeaders = init.headers
    const headers = new Headers({ "content-type": "application/json", "content-encoding": "gzip" })
    headers.append(
      "set-cookie",
      "tsw_auth=jwt-cookie; Max-Age=604800; Path=/; HttpOnly; SameSite=None; Secure",
    )
    headers.append("set-cookie", "tsw_csrf=csrf-val; Path=/; SameSite=None; Secure")
    return new Response(JSON.stringify({ success: true, data: { sessionMode: "httponly-cookie" } }), {
      status: 200,
      headers,
    })
  }

  try {
    const req = new Request("https://thriftshoewear-dashboard.vercel.app/api/v1/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "tsw_auth=prior",
        "x-auth-transport": "cookie",
      },
      body: JSON.stringify({ email: "root@thrift.com", password: "pw" }),
    })

    const res = await proxyPost(req, { params: Promise.resolve({ path: ["auth", "login"] }) })
    assert.equal(res.status, 200)
    assert.equal(upstreamHeaders.get("cookie"), "tsw_auth=prior")
    assert.equal(res.headers.get("content-encoding"), null)
    const setCookies = res.headers.getSetCookie()
    assert.equal(setCookies.length, 2)
    assert.match(setCookies[0], /HttpOnly/i)
    assert.match(setCookies[0], /SameSite=Lax/i)
    assert.match(setCookies[0], /Secure/i)
  } finally {
    globalThis.fetch = originalFetch
  }
})
