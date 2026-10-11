import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"

// Mapping for known route segment identifiers to humanized labels
const ROUTE_LABELS = {
  products: "Products",
  new: "New Product",
  edit: "Edit Product",
  categories: "Categories",
  orders: "Orders",
  users: "Customers",
  "access-requests": "Access Requests",
  coupons: "Coupons",
  payments: "Payments",
  shipments: "Shipments",
  reviews: "Reviews",
  assets: "Site Assets",
  settings: "Settings",
  overview: "Overview",
}

// Singular names for parent collections when formatting dynamic IDs
const RESOURCE_SINGULARS = {
  products: "Product",
  categories: "Category",
  orders: "Order",
  users: "Customer",
  coupons: "Coupon",
  payments: "Payment",
  shipments: "Shipment",
  reviews: "Review",
  assets: "Asset",
}

/**
 * Formats a single path segment into a clean user-facing breadcrumb label.
 * @param {string} segment - The raw URL path segment.
 * @param {string|null} prevSegment - The parent segment in the route path.
 * @returns {string} Humanized label.
 */
function formatSegmentLabel(segment, prevSegment) {
  // 1. Exact dictionary match
  if (ROUTE_LABELS[segment]) {
    return ROUTE_LABELS[segment]
  }

  // 2. MongoDB ObjectId (24 hex characters)
  if (/^[a-fA-F0-9]{24}$/.test(segment)) {
    const singular = prevSegment ? RESOURCE_SINGULARS[prevSegment] || "Item" : "Item"
    return `${singular} #${segment.slice(-6).toUpperCase()}`
  }

  // 3. Numeric ID (sequential or order numbers)
  if (/^\d+$/.test(segment)) {
    return `#${segment}`
  }

  // 4. Kebab-case or snake_case conversion: "access-requests" -> "Access Requests"
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * DynamicBreadcrumbs renders dynamic breadcrumb navigation driven by useLocation().
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS classes for the nav container.
 * @param {Array<{label: string, href?: string}>} [props.customItems] - Optional explicit breadcrumb items.
 */
export function DynamicBreadcrumbs({ className, customItems }) {
  const location = useLocation()

  // Support explicit breadcrumb items if passed by parent views
  if (customItems && Array.isArray(customItems) && customItems.length > 0) {
    return (
      <Breadcrumb className={className} data-slot="dynamic-breadcrumbs">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {customItems.map((item, index) => {
            const isLast = index === customItems.length - 1
            return (
              <React.Fragment key={item.href || index}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast || !item.href ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={item.href}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  // Parse path segments from the current pathname
  const pathnames = location.pathname.split("/").filter(Boolean)

  // Root dashboard route ("/")
  if (pathnames.length === 0) {
    return (
      <Breadcrumb className={className} data-slot="dynamic-breadcrumbs">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb className={className} data-slot="dynamic-breadcrumbs">
      <BreadcrumbList>
        {/* Root crumb: Dashboard (hidden on mobile if deeper path exists to save space) */}
        <BreadcrumbItem className={cn(pathnames.length > 1 && "hidden sm:inline-flex")}>
          <BreadcrumbLink asChild>
            <Link to="/">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Dynamic route segments */}
        {pathnames.map((segment, index) => {
          const isLast = index === pathnames.length - 1
          const url = `/${pathnames.slice(0, index + 1).join("/")}`
          const prevSegment = index > 0 ? pathnames[index - 1] : null
          const label = formatSegmentLabel(segment, prevSegment)

          // On mobile, hide intermediate segments if path depth is 3 or greater
          const isIntermediate = !isLast && index > 0
          const itemClasses = isIntermediate ? "hidden md:inline-flex" : undefined

          return (
            <React.Fragment key={url}>
              <BreadcrumbSeparator className={isIntermediate ? "hidden md:inline-flex" : undefined} />
              <BreadcrumbItem className={itemClasses}>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={url}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default DynamicBreadcrumbs
