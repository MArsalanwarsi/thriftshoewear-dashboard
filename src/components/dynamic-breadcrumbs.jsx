"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"

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
  logs: "Audit Logs",
  features: "Feature Controls",
  overview: "Overview",
}

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
  logs: "Log",
}

function formatSegmentLabel(segment, prevSegment) {
  if (ROUTE_LABELS[segment]) {
    return ROUTE_LABELS[segment]
  }

  if (/^[a-fA-F0-9]{24}$/.test(segment)) {
    const singular = prevSegment ? RESOURCE_SINGULARS[prevSegment] || "Item" : "Item"
    return `${singular} #${segment.slice(-6).toUpperCase()}`
  }

  if (/^\d+$/.test(segment)) {
    return `#${segment}`
  }

  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function DynamicBreadcrumbs({ className, customItems }) {
  const pathname = usePathname() || "/"

  if (customItems && Array.isArray(customItems) && customItems.length > 0) {
    return (
      <Breadcrumb className={className} data-slot="dynamic-breadcrumbs">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Dashboard</Link>
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
                      <Link href={item.href}>{item.label}</Link>
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

  const pathnames = pathname.split("/").filter(Boolean)

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
        <BreadcrumbItem className={cn(pathnames.length > 1 && "hidden sm:inline-flex")}>
          <BreadcrumbLink asChild>
            <Link href="/">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pathnames.map((segment, index) => {
          const isLast = index === pathnames.length - 1
          const url = `/${pathnames.slice(0, index + 1).join("/")}`
          const prevSegment = index > 0 ? pathnames[index - 1] : null
          const label = formatSegmentLabel(segment, prevSegment)

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
                    <Link href={url}>{label}</Link>
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
