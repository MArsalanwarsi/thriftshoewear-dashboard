import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { spawn, execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const projectRoot = fileURLToPath(new URL("../..", import.meta.url))
const PORT = Number(process.env.DASHBOARD_E2E_PORT || 3145)
const BASE_URL = `http://127.0.0.1:${PORT}`

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
  const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next")
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "pipe",
  })
  return child
}

function killTree(child) {
  if (!child) return
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

async function main() {
  const server = startServer()
  let browser = null

  try {
    await waitForServer(`${BASE_URL}/login`)
    browser = await chromium.launch(getLaunchOptions())

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

    const fakeLogs = [
      {
        _id: "log_001",
        category: "error",
        level: "error",
        action: "ERR_POST_ORDERS",
        method: "POST",
        path: "/api/v1/orders",
        statusCode: 500,
        durationMs: 42,
        actor: { email: "buyer@thrift.com", role: "customer", displayName: "Buyer" },
        ip: "127.0.0.1",
        message: "Simulated payment gateway timeout",
        errorName: "GatewayError",
        stack: "Error: Simulated payment gateway timeout\n at orderController.js:44",
        metadata: { body: { password: "[REDACTED]", amount: 4500 } },
        createdAt: "2026-11-27T07:30:00.000Z",
      },
      {
        _id: "log_002",
        category: "security",
        level: "warn",
        action: "FEATURE_TOGGLE_DENIED",
        method: "PATCH",
        path: "/api/v1/site/features",
        statusCode: 403,
        durationMs: 11,
        actor: { email: "root@thrift.com", role: "superAdmin", displayName: "Root Admin" },
        ip: "127.0.0.1",
        message: "Invalid password supplied when attempting to change feature toggles",
        metadata: { attemptedKeys: ["cart"] },
        createdAt: "2026-11-27T07:31:00.000Z",
      },
    ]

    async function mountApiMock(page, activeUser) {
      await page.route("**/api/v1/**", async (route) => {
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

        if (pathname.endsWith("/site/dashboard")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: { summary: { products: 42, orders: 18, revenue: 125000 } },
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
              data: {
                logs: fakeLogs,
                summary: { actions: 14, errors: 1, security: 1, total: 16 },
              },
              meta: { page: 1, pages: 1, total: 2 },
            }),
          })
        }

        if (pathname.endsWith("/site/features") && method === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: { features: featureState, updatedAt: "2026-11-27T07:35:00.000Z" },
            }),
          })
        }

        if (pathname.endsWith("/site/features") && method === "PATCH") {
          const payload = JSON.parse(route.request().postData() || "{}")
          if (payload.password !== "SuperSecret#2026") {
            return route.fulfill({
              status: 403,
              contentType: "application/json",
              body: JSON.stringify({
                success: false,
                message: "Invalid password. Feature toggle verification failed.",
              }),
            })
          }
          featureState[payload.key] = payload.active
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: { features: featureState, updatedAt: new Date().toISOString() },
            }),
          })
        }

        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: {} }),
        })
      })
    }

    // 1. Login page & SEO/PWA endpoints smoke check
    const guestCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const guestPage = await guestCtx.newPage()
    const runtimeErrors = []
    guestPage.on("pageerror", (err) => runtimeErrors.push(err.message))
    await guestPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
    await guestPage.getByText("Admin login").waitFor()

    for (const staticPath of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/manifest.webmanifest", "/~offline", "/sw.js"]) {
      const resp = await guestCtx.request.get(`${BASE_URL}${staticPath}`)
      if (!resp.ok()) {
        throw new Error(`Expected ${staticPath} to return HTTP 200, got ${resp.status()}`)
      }
    }
    await guestCtx.close()
    console.log("PASS  Login route + SEO/GEO (/robots.txt, /sitemap.xml, /llms.txt) + PWA (/sw.js, /manifest.webmanifest, /~offline) verified")

    // 2. Regular Admin isolation
    const adminUser = { _id: "a1", role: "admin", email: "admin@thrift.com", firstName: "Staff" }
    const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await adminCtx.addInitScript((user) => {
      window.localStorage.setItem("dashboardToken", "admin-jwt")
      window.localStorage.setItem("dashboardUser", JSON.stringify(user))
    }, adminUser)
    const adminPage = await adminCtx.newPage()
    adminPage.on("pageerror", (err) => runtimeErrors.push(err.message))
    await mountApiMock(adminPage, adminUser)
    await adminPage.goto(`${BASE_URL}/features`, { waitUntil: "networkidle" })
    await adminPage.getByText("Super Admin Access Required").waitFor()
    const logsNavVisibleForAdmin = await adminPage.getByText("Audit & Error Logs").isVisible()
    if (logsNavVisibleForAdmin) {
      throw new Error("Regular admin must not see Super Admin sidebar links")
    }
    await adminCtx.close()
    console.log("PASS  Regular admin is blocked from Super Admin links and /features")

    // 3. Super Admin Logs inspection & Password-Locked Feature Controls E2E
    const superUser = { _id: "sa1", role: "superAdmin", email: "root@thrift.com", firstName: "Root" }
    const superCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await superCtx.addInitScript((user) => {
      window.localStorage.setItem("dashboardToken", "super-jwt")
      window.localStorage.setItem("dashboardUser", JSON.stringify(user))
    }, superUser)
    const superPage = await superCtx.newPage()
    superPage.on("pageerror", (err) => runtimeErrors.push(err.message))
    await mountApiMock(superPage, superUser)

    await superPage.goto(`${BASE_URL}/logs`, { waitUntil: "networkidle" })
    await superPage.getByText("Audit & Error Logs").waitFor()

    // Check DOM Accessibility hygiene (zero broken aria-controls & zero unlabeled visible buttons)
    const a11yAudit = await superPage.evaluate(() => {
      const brokenAria = [...document.querySelectorAll("[aria-controls]")].filter((el) => {
        const id = el.getAttribute("aria-controls")
        return id && !document.getElementById(id)
      })
      const badButtons = [...document.querySelectorAll("button")].filter((b) => {
        const label = (b.innerText || b.textContent || "").trim() || b.getAttribute("aria-label") || b.getAttribute("title") || ""
        return label.length === 0
      })
      return { brokenAriaCount: brokenAria.length, badButtonCount: badButtons.length }
    })
    if (a11yAudit.brokenAriaCount > 0 || a11yAudit.badButtonCount > 0) {
      throw new Error(`Accessibility check failed: ${JSON.stringify(a11yAudit)}`)
    }
    await superPage.getByText("ERR_POST_ORDERS").waitFor()
    // Open log detail modal
    await superPage.locator("tbody tr").first().getByRole("button").click()
    await superPage.getByText("Simulated payment gateway timeout", { exact: true }).waitFor()
    await superPage.getByText("[REDACTED]").waitFor()
    await superPage.keyboard.press("Escape")
    console.log("PASS  Super Admin /logs displays audit summary, events, and redacted stack trace dialog")

    // Navigate to Feature Controls via sidebar link
    await superPage.getByRole("link", { name: "Feature Controls" }).click()
    await superPage.waitForURL("**/features")
    await superPage.getByText("Password-Locked (10/10 Active)").waitFor()

    // Click switch for Shopping Cart -> Password Modal must open
    await superPage.getByRole("switch", { name: "Toggle Shopping Cart" }).click()
    await superPage.getByText("Confirm Super Admin Password").waitFor()

    // Attempt wrong password -> blocked with error
    await superPage.fill("#superadmin-password-confirm", "WrongPassword")
    await superPage.getByRole("button", { name: /Confirm Deactivate/i }).click()
    await superPage.getByText("Invalid password. Feature toggle verification failed.").waitFor()

    // Retry with valid password -> succeeds and flips to Inactive
    await superPage.fill("#superadmin-password-confirm", "SuperSecret#2026")
    await superPage.getByRole("button", { name: /Confirm Deactivate/i }).click()
    await superPage.getByText("Password-Locked (9/10 Active)").waitFor()
    console.log("PASS  Super Admin /features rejects wrong password and locks/unlocks toggle upon re-authentication")

    await superCtx.close()
    if (runtimeErrors.length > 0) {
      throw new Error(`Page runtime errors encountered: ${runtimeErrors.join(" | ")}`)
    }
    console.log("ALL DASHBOARD E2E TESTS PASSED!")
  } finally {
    if (browser) await browser.close()
    killTree(server)
  }
}

main().catch((err) => {
  console.error("DASHBOARD E2E FAILED:", err)
  process.exit(1)
})
