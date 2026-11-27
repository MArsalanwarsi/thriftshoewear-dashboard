import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { Provider } from "react-redux"
import { configureStore } from "@reduxjs/toolkit"
import authReducer from "../../src/store/authSlice.js"
import adminReducer from "../../src/store/adminSlice.js"
import { AppSidebar } from "../../src/components/app-sidebar.jsx"
import { SidebarProvider } from "../../src/components/ui/sidebar.jsx"
import LogsPage from "../../src/components/pages/LogsPage.jsx"
import FeaturesPage, { FEATURE_CATALOG } from "../../src/components/pages/FeaturesPage.jsx"
import LoginPage from "../../src/components/pages/LoginPage.jsx"
import NotFound from "../../src/app/not-found.jsx"

function createStoreWithRole(role) {
  return configureStore({
    reducer: { auth: authReducer, admin: adminReducer },
    preloadedState: {
      auth: {
        token: role ? "tok" : null,
        user: role ? { _id: "u1", role, email: `${role}@thrift.com`, firstName: "Test" } : null,
        hydrated: true,
        status: "idle",
        error: null,
        message: null,
      },
    },
  })
}

test("SSR Role Isolation: Sidebar shows Audit Logs & Feature Controls ONLY to superAdmin", () => {
  const adminHtml = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store: createStoreWithRole("admin") },
      React.createElement(SidebarProvider, null, React.createElement(AppSidebar))
    )
  )
  assert.match(adminHtml, /Overview/)
  assert.equal(adminHtml.includes("Audit &amp; Error Logs"), false)
  assert.equal(adminHtml.includes("Feature Controls"), false)

  const superHtml = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store: createStoreWithRole("superAdmin") },
      React.createElement(SidebarProvider, null, React.createElement(AppSidebar))
    )
  )
  assert.match(superHtml, /Audit &amp; Error Logs/)
  assert.match(superHtml, /Feature Controls/)
})

test("SSR Super Admin Views: LogsPage and FeaturesPage block admin role and render controls for superAdmin", () => {
  const deniedLogsHtml = renderToStaticMarkup(
    React.createElement(Provider, { store: createStoreWithRole("admin") }, React.createElement(LogsPage))
  )
  assert.match(deniedLogsHtml, /Super Admin Access Required/)

  const deniedFeaturesHtml = renderToStaticMarkup(
    React.createElement(Provider, { store: createStoreWithRole("admin") }, React.createElement(FeaturesPage))
  )
  assert.match(deniedFeaturesHtml, /Super Admin Access Required/)

  const superLogsHtml = renderToStaticMarkup(
    React.createElement(Provider, { store: createStoreWithRole("superAdmin") }, React.createElement(LogsPage))
  )
  assert.match(superLogsHtml, /System &amp; Error Logs/)

  const superFeaturesHtml = renderToStaticMarkup(
    React.createElement(Provider, { store: createStoreWithRole("superAdmin") }, React.createElement(FeaturesPage))
  )
  assert.match(superFeaturesHtml, /Feature Controls/)
  assert.match(superFeaturesHtml, /Password-Locked/)
  assert.equal(FEATURE_CATALOG.length, 10)
})

test("SSR Auth & NotFound views render cleanly", () => {
  const loginHtml = renderToStaticMarkup(
    React.createElement(Provider, { store: createStoreWithRole(null) }, React.createElement(LoginPage))
  )
  assert.match(loginHtml, /Admin login/)
  assert.match(loginHtml, /Sign in/)

  const notFoundHtml = renderToStaticMarkup(React.createElement(NotFound))
  assert.match(notFoundHtml, /404/)
})
