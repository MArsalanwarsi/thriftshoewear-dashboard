import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

function readSrc(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), "utf-8")
}

console.log("=== Running M2 Layout & Navigation Verifier ===")

let passed = 0
let total = 0

function runTest(name, fn) {
  total++
  try {
    fn()
    console.log(`  ✓ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`)
    console.error(`         ${err.message}`)
  }
}

// Suite 1: File Existence & Export Structure
console.log("\n--- Suite 1: M2 Component Architecture & File Integrity ---")

runTest("DashboardLayout.jsx exists and exports DashboardLayout", () => {
  const code = readSrc("src/layouts/DashboardLayout.jsx")
  assert.ok(code.includes("export default function DashboardLayout"), "Missing default export")
  assert.ok(code.includes("SidebarProvider"), "Missing SidebarProvider")
  assert.ok(code.includes("AppSidebar"), "Missing AppSidebar")
  assert.ok(code.includes("SidebarInset"), "Missing SidebarInset")
  assert.ok(code.includes("SiteHeader"), "Missing SiteHeader")
  assert.ok(code.includes("@container/main flex flex-1 flex-col gap-2 p-4 md:p-6"), "Missing container layout class")
  assert.ok(code.includes("<Outlet />"), "Missing Outlet")
})

runTest("app-sidebar.jsx exists and defines all 11 administrative domains", () => {
  const code = readSrc("src/components/app-sidebar.jsx")
  assert.ok(code.includes("export function AppSidebar"), "Missing AppSidebar named export")
  assert.ok(code.includes("Thrift Shoe Wear"), "Missing brand title")
  assert.ok(code.includes("Admin Dashboard"), "Missing brand subtitle")
  assert.ok(code.includes("NavMain"), "Missing NavMain reference")
  assert.ok(code.includes("NavUser"), "Missing NavUser reference")
  assert.ok(code.includes("SidebarRail"), "Missing SidebarRail")

  const requiredRoutes = [
    "/",
    "/products",
    "/products/new",
    "/categories",
    "/orders",
    "/payments",
    "/coupons",
    "/users",
    "/users/access-requests",
    "/shipments",
    "/reviews",
    "/assets",
    "/settings",
  ]
  for (const route of requiredRoutes) {
    assert.ok(code.includes(`"${route}"`), `Missing navigation route ${route}`)
  }
})

runTest("nav-main.jsx exists with collapsible group navigation & active checking", () => {
  const code = readSrc("src/components/nav-main.jsx")
  assert.ok(code.includes("export function NavMain"), "Missing NavMain named export")
  assert.ok(code.includes("useLocation"), "Missing useLocation for active route detection")
  assert.ok(code.includes("Collapsible"), "Missing Collapsible wrapper")
  assert.ok(code.includes("SidebarMenuSub"), "Missing SidebarMenuSub")
})

runTest("nav-user.jsx exists with user profile, initials fallback, and logout", () => {
  const code = readSrc("src/components/nav-user.jsx")
  assert.ok(code.includes("export function NavUser"), "Missing NavUser named export")
  assert.ok(code.includes("AvatarFallback"), "Missing AvatarFallback")
  assert.ok(code.includes("DropdownMenu"), "Missing DropdownMenu")
  assert.ok(code.includes("handleLogout"), "Missing handleLogout")
  assert.ok(code.includes("dashboardToken"), "Missing token removal on logout")
  assert.ok(code.includes("dashboardUser"), "Missing user removal on logout")
})

runTest("site-header.jsx exists with trigger, vertical separator, breadcrumbs, mode toggle", () => {
  const code = readSrc("src/components/site-header.jsx")
  assert.ok(code.includes("export function SiteHeader"), "Missing SiteHeader named export")
  assert.ok(code.includes("SidebarTrigger"), "Missing SidebarTrigger")
  assert.ok(code.includes("Separator"), "Missing Separator")
  assert.ok(code.includes("DynamicBreadcrumbs"), "Missing DynamicBreadcrumbs")
  assert.ok(code.includes("ModeToggle"), "Missing ModeToggle")
  assert.ok(code.includes("sticky top-0 z-10"), "Missing sticky header styling")
})

runTest("dynamic-breadcrumbs.jsx exists with route parsing, mobile compression, and ID formatting", () => {
  const code = readSrc("src/components/dynamic-breadcrumbs.jsx")
  assert.ok(code.includes("export function DynamicBreadcrumbs"), "Missing DynamicBreadcrumbs export")
  assert.ok(code.includes("useLocation"), "Missing useLocation hook")
  assert.ok(code.includes("BreadcrumbList"), "Missing BreadcrumbList")
  assert.ok(code.includes("formatSegmentLabel"), "Missing formatSegmentLabel function")
  assert.ok(code.includes("/^[a-fA-F0-9]{24}$/"), "Missing ObjectId detection regex")
  assert.ok(code.includes("hidden sm:inline-flex"), "Missing responsive mobile class")
})

// Suite 2: App.jsx Integration & Backwards Compatibility
console.log("\n--- Suite 2: App.jsx Routing & Backwards Compatibility ---")

runTest("App.jsx routes authenticated views through DashboardLayout", () => {
  const code = readSrc("src/App.jsx")
  assert.ok(code.includes("import DashboardLayout from \"./layouts/DashboardLayout\""), "Missing DashboardLayout import")
  assert.ok(code.includes("<DashboardLayout />"), "Missing DashboardLayout element inside Route")
})

runTest("AppShell.jsx is preserved on disk for test backward-compatibility", () => {
  assert.ok(fs.existsSync(path.join(rootDir, "src/components/AppShell.jsx")), "AppShell.jsx must exist")
  const code = readSrc("src/components/AppShell.jsx")
  assert.ok(code.includes("export default function AppShell"), "AppShell export missing")
})

runTest("App.jsx preserves all required security guards and wildcard route", () => {
  const code = readSrc("src/App.jsx")
  assert.ok(code.includes("if (!token) return <Navigate to=\"/login\" replace />"))
  assert.ok(code.includes("if (user && !isAdmin) return <Navigate to=\"/login\" replace />"))
  assert.ok(code.includes("<Route path=\"*\" element={<Navigate to=\"/\" replace />} />"))
  assert.ok(code.includes("user?.role === \"admin\" || user?.role === \"superAdmin\""))
  assert.ok(code.includes("useEffect"))
  assert.ok(code.includes("fetchMe()"))
})

console.log(`\nM2 verification completed: ${passed}/${total} passed.\n`)
if (passed !== total) {
  process.exit(1)
}
