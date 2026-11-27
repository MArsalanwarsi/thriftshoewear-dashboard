import test from "node:test"
import assert from "node:assert/strict"
import { store } from "../../src/store/store.js"
import { hydrateAuth, loginUser, logout, clearAuthError } from "../../src/store/authSlice.js"
import { clearMutation } from "../../src/store/adminSlice.js"

test("Redux store initializes deterministically in SSR without crashing on localStorage", () => {
  const state = store.getState()
  assert.equal(state.auth.hydrated, false)
  assert.equal(state.auth.token, null)
  assert.equal(state.auth.user, null)
  assert.ok(state.admin.resources.products)
})

test("authSlice.hydrateAuth, loginUser RBAC enforcement, and logout state wipe work end-to-end", async () => {
  globalThis.localStorage.setItem("dashboardToken", "tok-hydrate")
  globalThis.localStorage.setItem("dashboardUser", JSON.stringify({ role: "superAdmin", email: "root@thrift.com" }))

  store.dispatch(hydrateAuth())
  assert.equal(store.getState().auth.hydrated, true)
  assert.equal(store.getState().auth.token, "tok-hydrate")
  assert.equal(store.getState().auth.user.role, "superAdmin")

  store.dispatch(logout())
  assert.equal(store.getState().auth.token, null)
  assert.equal(store.getState().auth.user, null)
  assert.equal(globalThis.localStorage.getItem("dashboardToken"), null)

  // Block customer accounts from dashboard login
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ data: { token: "cust-tok", user: { role: "customer" } } }),
  })
  try {
    await store.dispatch(loginUser({ email: "buyer@thrift.com", password: "Password123!" }))
    assert.match(store.getState().auth.error, /admin and super admin/i)
    assert.equal(store.getState().auth.token, null)
    store.dispatch(clearAuthError())
    store.dispatch(clearMutation())
    assert.equal(store.getState().auth.error, null)
  } finally {
    globalThis.fetch = originalFetch
  }
})
