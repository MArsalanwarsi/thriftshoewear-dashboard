export const ADMIN_MODULES = [
  {
    key: "overview",
    label: "Overview",
    description: "Store KPI summary, revenue analytics chart, and recent order snapshots.",
    href: "/",
  },
  {
    key: "products",
    label: "Products",
    description: "Create, edit, archive, restore products, variants, and pricing.",
    href: "/products",
  },
  {
    key: "categories",
    label: "Categories",
    description: "Manage top-level and sub-category navigation trees and thumbnails.",
    href: "/categories",
  },
  {
    key: "orders",
    label: "Orders",
    description: "View customer orders, advance fulfillment statuses, and timelines.",
    href: "/orders",
  },
  {
    key: "payments",
    label: "Payments",
    description: "Verify bank transfer / wallet payment proofs and payment statuses.",
    href: "/payments",
  },
  {
    key: "coupons",
    label: "Coupons",
    description: "Create promo codes, discount rules, limits, and track usage.",
    href: "/coupons",
  },
  {
    key: "users",
    label: "Users Directory",
    description: "View customer accounts and manage customer profiles.",
    href: "/users",
  },
  {
    key: "shipments",
    label: "Shipments",
    description: "Create courier dispatches, tracking numbers, and delivery proofs.",
    href: "/shipments",
  },
  {
    key: "reviews",
    label: "Reviews",
    description: "Approve, hide, reject customer reviews and resolve reports.",
    href: "/reviews",
  },
  {
    key: "assets",
    label: "Site Assets",
    description: "Manage Cloudflare R2 media objects and storefront banner placements.",
    href: "/assets",
  },
  {
    key: "settings",
    label: "Settings",
    description: "Configure store branding, contact details, shipping rates, and SEO.",
    href: "/settings",
  },
]

export const ALL_MODULE_KEYS = ADMIN_MODULES.map((m) => m.key)

export function hasModuleAccess(user, moduleKey) {
  if (!user) return false
  if (user.role === "superAdmin") return true
  if (user.role !== "admin") return false
  if (!moduleKey) return true
  // Admins without an explicit array preserve full Operations access
  if (!Array.isArray(user.assignedModules)) return true
  return user.assignedModules.includes(moduleKey)
}

export function getModuleForPathname(pathname = "/") {
  const path = String(pathname || "/")
  if (path === "/") return "overview"
  if (path.startsWith("/users/access-requests") || path.startsWith("/logs") || path.startsWith("/features")) {
    return null
  }
  if (path.startsWith("/products")) return "products"
  if (path.startsWith("/categories")) return "categories"
  if (path.startsWith("/orders")) return "orders"
  if (path.startsWith("/payments")) return "payments"
  if (path.startsWith("/coupons")) return "coupons"
  if (path.startsWith("/users")) return "users"
  if (path.startsWith("/shipments")) return "shipments"
  if (path.startsWith("/reviews")) return "reviews"
  if (path.startsWith("/assets")) return "assets"
  if (path.startsWith("/settings")) return "settings"
  return null
}

export function getFirstAllowedRoute(user) {
  for (const mod of ADMIN_MODULES) {
    if (hasModuleAccess(user, mod.key)) {
      return mod.href
    }
  }
  return "/"
}

export function formatModuleSummary(user) {
  if (!user) return "None"
  if (user.role === "superAdmin") return "Root (All)"
  if (user.role !== "admin") return "Storefront"
  if (!Array.isArray(user.assignedModules)) return `All (${ADMIN_MODULES.length})`
  if (user.assignedModules.length === 0) return "No Modules"
  if (user.assignedModules.length === ADMIN_MODULES.length) return `All (${ADMIN_MODULES.length})`
  return `${user.assignedModules.length} / ${ADMIN_MODULES.length} Modules`
}
