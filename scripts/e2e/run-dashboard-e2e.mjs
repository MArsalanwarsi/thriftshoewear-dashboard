import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { spawn, execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const projectRoot = fileURLToPath(new URL("../..", import.meta.url))
const argSuite = process.argv.find((a) => a.startsWith("--suite="))?.split("=")[1] || "all"
const PORT = Number(process.env.DASHBOARD_E2E_PORT || 3145)
const BASE_URL = (process.env.DASHBOARD_BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/+$/, "")

function getLaunchOptions() {
  const options = {
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  }
  const winChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe"
  if (fs.existsSync(winChrome)) {
    options.executablePath = winChrome
  }
  return options
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const code = await new Promise((resolve, reject) => {
        const req = http.get(url, { timeout: 4000 }, (res) => {
          res.resume()
          resolve(res.statusCode || 0)
        })
        req.on("error", reject)
        req.on("timeout", () => req.destroy(new Error("timeout")))
      })
      if (code > 0 && code < 500) return
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 350))
  }
  throw new Error(`Timed out waiting for server at ${url}`)
}

function startServer() {
  if (process.env.DASHBOARD_BASE_URL) return null
  const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next")
  return spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "pipe",
  })
}

function killTree(child) {
  if (!child || !child.pid) return
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" })
    } else {
      child.kill("SIGKILL")
    }
  } catch {
    // Ignore
  }
}

function extractAllDashboardRoutes() {
  const appDir = path.join(projectRoot, "src", "app")
  const routes = []

  function walk(dir, segments = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "api") continue
        const nextSegs = /^\(.+\)$/.test(entry.name) ? segments : [...segments, entry.name]
        walk(full, nextSegs)
      } else if (entry.name === "page.jsx") {
        const routePath = segments.length ? `/${segments.join("/")}` : "/"
        let urlPath = routePath
        if (urlPath === "/products/[id]") urlPath = "/products/507f1f77bcf86cd799439011"
        else if (urlPath === "/orders/[id]") urlPath = "/orders/507f1f77bcf86cd799439012"
        else if (urlPath === "/reset-password/[token]") urlPath = "/reset-password/test-reset-token"
        else if (urlPath === "/verify-email/[token]") urlPath = "/verify-email/test-verify-token"
        routes.push({ routePath, urlPath })
      }
    }
  }

  walk(appDir)
  routes.push({ routePath: "*", urlPath: "/this-route-does-not-exist-404" })
  return routes
}

function hasErrorBoundary(text) {
  return text.includes("Something went wrong") || text.includes("Application error")
}

async function mountDashboardApiMocks(target, activeUser, featureStateRef) {
  await target.route("**/sw.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      body: "self.addEventListener('install', () => self.skipWaiting());",
    })
  )
  const fakeProduct = {
    _id: "507f1f77bcf86cd799439011",
    name: "Vintage Nike Dunk Low",
    slug: "vintage-nike-dunk-low",
    brand: "Nike",
    productType: "shoes",
    condition: "excellent",
    status: "active",
    price: 5800,
    salePrice: 4900,
    variants: [{ _id: "v1", sku: "TSW-001", size: "EU 41", color: "Panda", price: 5800, stock: 1 }],
    images: [],
    category: { _id: "c1", name: "Sneakers", slug: "sneakers" },
    salesStats: { viewCount: 14, soldCount: 0 },
    createdAt: "2026-11-27T07:00:00.000Z",
  }

  const fakeOrder = {
    _id: "507f1f77bcf86cd799439012",
    orderNumber: "TSW-1001",
    status: "placed",
    customer: { firstName: "Ayesha", lastName: "Khan", email: "ayesha@example.com", phone: "03001234567" },
    shippingAddress: { addressLine1: "Model Town", city: "Lahore", state: "Punjab", country: "Pakistan", postalCode: "54000" },
    items: [{ _id: "i1", product: fakeProduct, productName: "Vintage Nike Dunk Low", price: 4900, quantity: 1 }],
    totals: { subtotal: 4900, shippingFee: 350, discountTotal: 0, grandTotal: 5250, amountPaid: 0, amountDue: 5250 },
    payment: { method: "cod", status: "pending" },
    timeline: [],
    createdAt: "2026-11-27T07:15:00.000Z",
  }

  const fakeLogs = [
    {
      _id: "log_001",
      occurredAt: "2026-11-27T07:30:00.000Z",
      category: "error",
      level: "error",
      action: "ERR_POST_ORDERS",
      method: "POST",
      path: "/api/v1/orders",
      statusCode: 500,
      durationMs: 42,
      actor: { email: "buyer@thrift.com", role: "customer", displayName: "Buyer" },
      ip: "127.0.0.1",
      location: {
        country: "PK",
        region: "Punjab",
        city: "Lahore",
        timezone: "Asia/Karachi",
        source: "vercel-edge",
      },
      systemConfig: {
        requestId: "req-e2e-001",
        browser: "Chrome",
        os: "Windows",
        deviceType: "desktop",
        nodeVersion: "v24.0.0",
        platform: "linux",
        environment: "production",
        serverRegion: "sin1",
      },
      message: "Simulated payment gateway timeout",
      errorName: "GatewayError",
      stack: "Error: Simulated payment gateway timeout\n at orderController.js:44",
      metadata: { body: { password: "[REDACTED]", amount: 4500 } },
      createdAt: "2026-11-27T07:30:00.000Z",
    },
  ]

  await target.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    const pathname = url.pathname

    if (pathname.endsWith("/auth/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { user: activeUser } }),
      })
    }

    if (pathname.endsWith("/auth/verify-email/test-verify-token")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Email verified cleanly." }),
      })
    }

    if (pathname.endsWith("/site/dashboard")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            counts: { products: 24, activeProducts: 18, orders: 12, users: 9 },
            revenue: { revenue: 125000, paid: 90000, due: 35000 },
            popularProducts: [fakeProduct],
            storage: { fileCount: 12, formattedSize: "1.2 MB", percentageUsed: 5 },
          },
        }),
      })
    }

    if (pathname.endsWith("/site/settings") || pathname.endsWith("/site/config")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            settings: {
              storeName: "Thrift Shoe Wear",
              supportEmail: "support@thriftshoewear.com",
              currency: "PKR",
              shipping: { flatFee: 350, freeShippingThreshold: 10000 },
              paymentMethods: [],
              socialLinks: [],
            },
          },
        }),
      })
    }

    if (pathname.endsWith("/site/features") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { features: featureStateRef, updatedAt: "2026-11-27T07:35:00.000Z" },
        }),
      })
    }

    if (pathname.endsWith("/site/features") && method === "PATCH") {
      const payload = JSON.parse(route.request().postData() || "{}")
      if (payload.password !== "SuperSecret#2026") {
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Invalid password. Feature toggle verification failed." }),
        })
      }
      featureStateRef[payload.key] = payload.active
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { features: featureStateRef, updatedAt: new Date().toISOString() },
        }),
      })
    }

    if (pathname.endsWith("/logs")) {
      if (activeUser.role !== "superAdmin") {
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Super admin required" }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { logs: fakeLogs, summary: { actions: 14, errors: 1, security: 1, total: 16 } },
          meta: { page: 1, pages: 1, total: 1 },
        }),
      })
    }

    if (pathname.endsWith(`/products/${fakeProduct._id}`)) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { product: fakeProduct } }) })
    }
    if (pathname.endsWith("/products")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { products: [fakeProduct] }, meta: { page: 1, pages: 1, total: 1 } }) })
    }
    if (pathname.endsWith(`/orders/${fakeOrder._id}`)) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { order: fakeOrder } }) })
    }
    if (pathname.endsWith("/orders")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { orders: [fakeOrder] }, meta: { page: 1, pages: 1, total: 1 } }) })
    }
    if (pathname.endsWith("/categories")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { categories: [{ _id: "c1", name: "Sneakers", slug: "sneakers", isActive: true }] }, meta: { page: 1, pages: 1, total: 1 } }) })
    }
    if (pathname.endsWith("/users")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { users: [activeUser] }, meta: { page: 1, pages: 1, total: 1 } }) })
    }
    if (pathname.endsWith("/payments")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { payments: [] }, meta: { page: 1, pages: 1, total: 0 } }) })
    }
    if (pathname.endsWith("/coupons")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { coupons: [] }, meta: { page: 1, pages: 1, total: 0 } }) })
    }
    if (pathname.endsWith("/shipments")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { shipments: [] }, meta: { page: 1, pages: 1, total: 0 } }) })
    }
    if (pathname.endsWith("/reviews")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { reviews: [] }, meta: { page: 1, pages: 1, total: 0 } }) })
    }
    if (pathname.endsWith("/site/assets")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { assets: [] }, meta: { page: 1, pages: 1, total: 0 } }) })
    }
    if (pathname.endsWith("/upload/usage")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, key: "site/sample.webp", inUse: false, count: 0, usages: [] }) })
    }
    if (pathname.endsWith("/upload/storage-stats")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, storage: { fileCount: 0, totalSize: 0, formattedSize: "0 B" } }) })
    }
    if (pathname.includes("/upload/media")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, media: [], pagination: { page: 1, limit: 24, total: 0, pages: 1 }, data: { media: [], storage: { fileCount: 0, formattedSize: "0 B" } } }) })
    }

    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: {} }) })
  })
}

async function runAllRoutesSmokeSuite(browser, featureStateRef) {
  const routes = extractAllDashboardRoutes()
  console.log(`\n[SMOKE] Crawling all ${routes.length} Dashboard App Router routes...`)
  const superUser = { _id: "sa1", role: "superAdmin", email: "root@thrift.com", firstName: "Root", displayName: "Root Admin" }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await mountDashboardApiMocks(ctx, superUser, featureStateRef)

  const page = await ctx.newPage()
  const failures = []

  for (const r of routes) {
    const consoleErrors = []
    const pageErrors = []
    const badResponses = []

    const onConsole = (msg) => {
      if (msg.type() === "error") {
        const t = msg.text()
        if (r.routePath === "*" && /status of 404/i.test(t)) return
        consoleErrors.push(t)
      }
    }
    const onPageErr = (err) => pageErrors.push(String(err))
    const onResp = (res) => {
      if (res.status() >= 400 && res.url().startsWith(BASE_URL) && !r.urlPath.includes("does-not-exist")) {
        badResponses.push(`${res.status()} ${res.url()}`)
      }
    }

    page.on("console", onConsole)
    page.on("pageerror", onPageErr)
    page.on("response", onResp)

    try {
      await page.goto(`${BASE_URL}${r.urlPath}`, { waitUntil: "domcontentloaded", timeout: 15000 })
      await page.waitForFunction(() => document.body.innerText.trim().length > 10, { timeout: 10000 })
      await page.waitForTimeout(200)

      const check = await page.evaluate(() => {
        const text = document.body.innerText
        const brokenImgs = [...document.querySelectorAll("img")]
          .filter((img) => getComputedStyle(img).display !== "none" && img.complete && img.naturalWidth === 0)
          .map((img) => img.getAttribute("src"))
        return { text, brokenImgs }
      })

      if (hasErrorBoundary(check.text)) {
        failures.push(`${r.urlPath}: ErrorBoundary rendered`)
      }
      if (check.brokenImgs.length > 0) {
        failures.push(`${r.urlPath}: broken images ${check.brokenImgs.join(", ")}`)
      }
      if (consoleErrors.length > 0) {
        failures.push(`${r.urlPath}: console.error -> ${consoleErrors.join(" | ")}`)
      }
      if (pageErrors.length > 0) {
        failures.push(`${r.urlPath}: pageerror -> ${pageErrors.join(" | ")}`)
      }
      if (badResponses.length > 0) {
        failures.push(`${r.urlPath}: HTTP errors -> ${badResponses.join(" | ")}`)
      }
      console.log(`  OK   ${r.urlPath}`)
    } catch (err) {
      failures.push(`${r.urlPath}: navigation exception -> ${err.message}`)
    } finally {
      page.off("console", onConsole)
      page.off("pageerror", onPageErr)
      page.off("response", onResp)
    }
  }

  await ctx.close()
  if (failures.length > 0) {
    throw new Error(`Smoke route failures (${failures.length}):\n  - ${failures.join("\n  - ")}`)
  }
  console.log(`PASS  All ${routes.length} routes rendered cleanly with zero errors.`)
}

async function runResponsiveSuite(browser, featureStateRef) {
  console.log("\n[RESPONSIVE] Testing Desktop (1440px), Tablet (768px), and Mobile (375px) across core views...")
  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 812 },
  ]
  const routes = ["/", "/products", "/orders", "/payments", "/coupons", "/categories", "/users", "/settings", "/logs", "/features", "/login"]
  const superUser = { _id: "sa1", role: "superAdmin", email: "root@thrift.com", firstName: "Root" }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await mountDashboardApiMocks(ctx, superUser, featureStateRef)
  const page = await ctx.newPage()
  const failures = []

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    for (const r of routes) {
      await page.goto(`${BASE_URL}${r}`, { waitUntil: "domcontentloaded", timeout: 15000 })
      await page.waitForFunction(() => document.body.innerText.trim().length > 10, { timeout: 10000 })
      await page.waitForTimeout(150)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 4)
      if (overflow) {
        failures.push(`Horizontal overflow on ${r} at ${vp.name} (${vp.width}px)`)
      }
    }
  }

  // Test Mobile Sidebar Trigger opens sheet cleanly
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" })
  const sidebarTrigger = page.locator('[data-sidebar="trigger"]').first()
  if (await sidebarTrigger.isVisible().catch(() => false)) {
    await sidebarTrigger.click()
    await page.waitForTimeout(200)
    const sheetVisible = await page.locator('[data-sidebar="sidebar"]').isVisible().catch(() => false)
    if (!sheetVisible) failures.push("Mobile sidebar drawer did not open when clicking SidebarTrigger")
  }

  await ctx.close()
  if (failures.length > 0) {
    throw new Error(`Responsive failures:\n  - ${failures.join("\n  - ")}`)
  }
  console.log(`PASS  Responsive checks passed across ${routes.length * viewports.length} viewport renders.`)
}

async function runInteractiveSuite(browser, featureStateRef) {
  console.log("\n[INTERACTIVE] Running RBAC, Logs, Feature Password Lock & SEO/PWA checks...")
  const runtimeErrors = []

  // 1. SEO, GEO & PWA endpoints
  const guestCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const guestPage = await guestCtx.newPage()
  guestPage.on("pageerror", (err) => runtimeErrors.push(err.message))
  await guestPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
  await guestPage.getByText("Admin login").waitFor()

  const [robotsRes, sitemapRes, llmsRes, llmsFullRes, ogRes, manifestRes, swRes, offlineRes, loginHtmlRes] =
    await Promise.all([
      guestCtx.request.get(`${BASE_URL}/robots.txt`),
      guestCtx.request.get(`${BASE_URL}/sitemap.xml`),
      guestCtx.request.get(`${BASE_URL}/llms.txt`),
      guestCtx.request.get(`${BASE_URL}/llms-full.txt`),
      guestCtx.request.get(`${BASE_URL}/api/og`),
      guestCtx.request.get(`${BASE_URL}/manifest.webmanifest`),
      guestCtx.request.get(`${BASE_URL}/sw.js`),
      guestCtx.request.get(`${BASE_URL}/~offline`),
      guestCtx.request.get(`${BASE_URL}/login`),
    ])

  const ogMagic = (await ogRes.body()).subarray(0, 4).toString("hex")
  const loginHtml = await loginHtmlRes.text()
  if (
    !robotsRes.ok() ||
    !sitemapRes.ok() ||
    !llmsRes.ok() ||
    !llmsFullRes.ok() ||
    !ogRes.ok() ||
    ogMagic !== "89504e47" ||
    !manifestRes.ok() ||
    !swRes.ok() ||
    !offlineRes.ok() ||
    !loginHtml.includes("application/ld+json")
  ) {
    throw new Error("SEO/GEO/PWA endpoint verification failed")
  }
  await guestCtx.close()
  console.log("PASS  SEO/GEO (/robots.txt, /sitemap.xml, /llms.txt, /api/og PNG, JSON-LD) + PWA (/sw.js, /manifest.webmanifest, /~offline)")

  // 2. Regular Admin isolation
  const adminUser = { _id: "a1", role: "admin", email: "admin@thrift.com", firstName: "Staff" }
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const adminPage = await adminCtx.newPage()
  adminPage.on("pageerror", (err) => runtimeErrors.push(err.message))
  await mountDashboardApiMocks(adminCtx, adminUser, featureStateRef)
  await adminPage.goto(`${BASE_URL}/features`, { waitUntil: "networkidle" })
  await adminPage.getByText("Super Admin Access Required").waitFor()
  if (await adminPage.getByText("Audit & Error Logs").isVisible()) {
    throw new Error("Regular admin must not see Super Admin sidebar links")
  }
  await adminCtx.close()
  console.log("PASS  Regular admin blocked from Super Admin links and /features")

  // 3. Super Admin Logs, Features Password Lock, Zero Browser PII & Overview CLS/ARIA
  const superUser = { _id: "sa1", role: "superAdmin", email: "root@thrift.com", firstName: "Root" }
  const superCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await superCtx.addInitScript(() => {
    window.__clsTotal = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__clsTotal += entry.value
      }
    }).observe({ type: "layout-shift", buffered: true })
  })
  const superPage = await superCtx.newPage()
  superPage.on("pageerror", (err) => runtimeErrors.push(err.message))
  await mountDashboardApiMocks(superCtx, superUser, featureStateRef)

  await superPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" })
  await superPage.waitForTimeout(400)
  const perfA11y = await superPage.evaluate(() => {
    const brokenAria = [...document.querySelectorAll("[aria-controls]")].filter((el) => {
      const id = el.getAttribute("aria-controls")
      return id && !document.getElementById(id)
    })
    const badButtons = [...document.querySelectorAll("button")].filter((b) => {
      const label = (b.innerText || b.textContent || "").trim() || b.getAttribute("aria-label") || b.getAttribute("title") || ""
      return label.length === 0
    })
    return { cls: Number(window.__clsTotal.toFixed(4)), brokenAria: brokenAria.length, badButtons: badButtons.length }
  })
  if (perfA11y.cls > 0.05 || perfA11y.brokenAria > 0 || perfA11y.badButtons > 0) {
    throw new Error(`Overview Perf/A11y gate failed: ${JSON.stringify(perfA11y)}`)
  }
  console.log(`PASS  Overview CLS=${perfA11y.cls}, brokenAria=${perfA11y.brokenAria}, badButtons=${perfA11y.badButtons}`)

  await superPage.goto(`${BASE_URL}/logs`, { waitUntil: "networkidle" })
  await superPage.waitForTimeout(500)
  const logsText = await superPage.locator("body").innerText()
  if (!logsText.includes("ERR_POST_ORDERS") || !logsText.includes("Lahore")) {
    throw new Error(`Expected ERR_POST_ORDERS and location on /logs (url=${superPage.url()}). Page text:\n${logsText.slice(0, 600)}`)
  }
  await superPage.getByText("ERR_POST_ORDERS").waitFor()
  await superPage.getByRole("button", { name: /Inspect log ERR_POST_ORDERS/i }).first().click()
  await superPage.getByText("Simulated payment gateway timeout", { exact: true }).waitFor()
  await superPage.getByText("req-e2e-001").waitFor()
  await superPage.getByText("[REDACTED]").waitFor()
  await superPage.keyboard.press("Escape")

  const browserStorageLeak = await superPage.evaluate(() => ({
    lsKeys: Object.keys(window.localStorage),
    ssKeys: Object.keys(window.sessionStorage),
  }))
  if (
    browserStorageLeak.lsKeys.some((k) => /token|user|email|secret|password/i.test(k)) ||
    browserStorageLeak.ssKeys.some((k) => /token|user|order|email|secret|password/i.test(k))
  ) {
    throw new Error(`Sensitive keys detected in browser storage: ${JSON.stringify(browserStorageLeak)}`)
  }
  console.log("PASS  Super Admin /logs displays time, location, system config, and zero sensitive browser storage")

  await superPage.getByRole("link", { name: "Feature Controls" }).click()
  await superPage.waitForURL("**/features")
  await superPage.getByText("Password-Locked (10/10 Active)").waitFor()
  await superPage.getByRole("switch", { name: "Toggle Shopping Cart" }).click()
  await superPage.getByText("Confirm Super Admin Password").waitFor()

  await superPage.fill("#superadmin-password-confirm", "WrongPassword")
  await superPage.getByRole("button", { name: /Confirm Deactivate/i }).click()
  await superPage.getByText("Invalid password. Feature toggle verification failed.").waitFor()

  await superPage.fill("#superadmin-password-confirm", "SuperSecret#2026")
  await superPage.getByRole("button", { name: /Confirm Deactivate/i }).click()
  await superPage.getByText("Password-Locked (9/10 Active)").waitFor()
  console.log("PASS  Super Admin /features enforces password re-entry")

  await superCtx.close()
  if (runtimeErrors.length > 0) {
    throw new Error(`Runtime errors encountered: ${runtimeErrors.join(" | ")}`)
  }
}

async function main() {
  const server = startServer()
  let browser = null

  const featureState = {
    cart: true,
    wishlist: true,
    checkout: true,
    sales: true,
    coupons: true,
    reviews: true,
    orderTracking: true,
    registration: true,
    newsletter: true,
    search: true,
  }

  try {
    await waitForServer(`${BASE_URL}/login`)
    browser = await chromium.launch(getLaunchOptions())

    if (argSuite === "smoke" || argSuite === "all") {
      await runAllRoutesSmokeSuite(browser, featureState)
    }
    if (argSuite === "responsive" || argSuite === "all") {
      await runResponsiveSuite(browser, featureState)
    }
    if (argSuite === "interactive" || argSuite === "all") {
      await runInteractiveSuite(browser, featureState)
    }

    console.log("\nALL DASHBOARD E2E SUITES PASSED!")
  } finally {
    if (browser) await browser.close()
    killTree(server)
  }
}

main().catch((err) => {
  console.error("DASHBOARD E2E FAILED:", err)
  process.exit(1)
})
