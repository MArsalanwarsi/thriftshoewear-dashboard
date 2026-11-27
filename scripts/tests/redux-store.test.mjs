import test from "node:test"
import assert from "node:assert/strict"
import { store } from "../../src/store/store.js"
import { hydrateAuth, fetchMe, loginUser, logout, clearAuthError } from "../../src/store/authSlice.js"
import { hydrateTheme, setTheme, toggleTheme } from "../../src/store/themeSlice.js"
import { clearMutation } from "../../src/store/adminSlice.js"

test("Redux store initializes deterministically in SSR without crashing on localStorage", () => {
  const state = store.getState()
  assert.equal(state.auth.hydrated, false)
  assert.equal(state.auth.token, null)
  assert.equal(state.auth.user, null)
  assert.equal(state.theme.mode, "light")
  assert.ok(state.admin.resources.products)
})

test("Redux themeSlice switches directly between light and dark themes cleanly", () => {
  store.dispatch(setTheme("light"))
  assert.equal(store.getState().theme.mode, "light")
  store.dispatch(toggleTheme())
  assert.equal(store.getState().theme.mode, "dark")
  store.dispatch(toggleTheme())
  assert.equal(store.getState().theme.mode, "light")
  store.dispatch(hydrateTheme())
  assert.equal(store.getState().theme.hydrated, true)
})

test("authSlice keeps session strictly in memory, purges legacy storage, and enforces admin RBAC", async () => {
  globalThis.localStorage.setItem("dashboardToken", "legacy-tok")
  globalThis.localStorage.setItem("dashboardUser", JSON.stringify({ role: "superAdmin", email: "root@thrift.com" }))

  store.dispatch(hydrateAuth())
  assert.equal(store.getState().auth.hydrated, false)
  assert.equal(store.getState().auth.token, null)
  assert.equal(store.getState().auth.user, null)
  assert.equal(globalThis.localStorage.getItem("dashboardToken"), null)
  assert.equal(globalThis.localStorage.getItem("dashboardUser"), null)

  // Block customer accounts from dashboard login
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ data: { csrfToken: "csrf-1", user: { role: "customer" } } }),
  })
  try {
    await store.dispatch(loginUser({ email: "buyer@thrift.com", password: "Password123!" }))
    assert.match(store.getState().auth.error, /admin and super admin/i)
    assert.equal(store.getState().auth.token, null)

    // Allow superAdmin via HttpOnly cookie session mode (no token persisted to storage)
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: {
          csrfToken: "csrf-admin",
          sessionMode: "httponly-cookie",
          user: { role: "superAdmin", email: "root@thrift.com" },
        },
      }),
    })
    await store.dispatch(fetchMe())
    assert.equal(store.getState().auth.hydrated, true)
    assert.equal(store.getState().auth.token, "cookie-session")
    assert.equal(store.getState().auth.user.role, "superAdmin")
    assert.equal(globalThis.localStorage.getItem("dashboardToken"), null)
    assert.equal(globalThis.localStorage.getItem("dashboardUser"), null)

    store.dispatch(logout())
    assert.equal(store.getState().auth.token, null)
    assert.equal(store.getState().auth.user, null)
    store.dispatch(clearAuthError())
    store.dispatch(clearMutation())
    assert.equal(store.getState().auth.error, null)
  } finally {
    globalThis.fetch = originalFetch
  }
})
