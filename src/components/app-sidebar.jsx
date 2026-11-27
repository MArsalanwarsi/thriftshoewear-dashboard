"use client"

import * as React from "react"
import {
  Activity,
  BadgeDollarSign,
  Image,
  LayoutDashboard,
  List,
  MessageSquareText,
  PackageCheck,
  PlusCircle,
  Receipt,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Tags,
  TicketPercent,
  Truck,
  UserCheck,
  Users,
} from "lucide-react"
import { useSelector } from "react-redux"
import Link from "next/link"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

export const navData = {
  navMain: [
    {
      platform: "Operations",
      title: "Overview",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      platform: "Operations",
      title: "Products",
      url: "/products",
      icon: ShoppingBag,
      items: [
        {
          title: "Product Catalog",
          url: "/products",
          icon: List,
        },
        {
          title: "Add Product",
          url: "/products/new",
          icon: PlusCircle,
        },
      ],
    },
    {
      platform: "Operations",
      title: "Categories",
      url: "/categories",
      icon: Tags,
    },
    {
      platform: "Operations",
      title: "Orders",
      url: "/orders",
      icon: Receipt,
    },
    {
      platform: "Operations",
      title: "Payments",
      url: "/payments",
      icon: BadgeDollarSign,
    },
    {
      platform: "Operations",
      title: "Coupons",
      url: "/coupons",
      icon: TicketPercent,
    },
    {
      platform: "Operations",
      title: "Staff & Users",
      url: "/users",
      icon: Users,
      items: [
        {
          title: "User Directory",
          url: "/users",
          icon: Users,
        },
        {
          title: "Access Requests",
          url: "/users/access-requests",
          icon: UserCheck,
        },
      ],
    },
    {
      platform: "Operations",
      title: "Shipments",
      url: "/shipments",
      icon: Truck,
    },
    {
      platform: "Operations",
      title: "Reviews",
      url: "/reviews",
      icon: MessageSquareText,
    },
    {
      platform: "Operations",
      title: "Site Assets",
      url: "/assets",
      icon: Image,
    },
    {
      platform: "Operations",
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
  superAdminNav: [
    {
      platform: "Super Admin",
      title: "Audit & Error Logs",
      url: "/logs",
      icon: Activity,
    },
    {
      platform: "Super Admin",
      title: "Feature Controls",
      url: "/features",
      icon: SlidersHorizontal,
    },
  ],
}

export function AppSidebar({ ...props }) {
  const user = useSelector((state) => state.auth?.user)
  const isSuperAdmin = user?.role === "superAdmin"

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  <PackageCheck className="size-5" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-sm font-black tracking-tight">Thrift Shoe Wear</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Admin Dashboard
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} label="Operations" />
        {isSuperAdmin && <NavMain items={navData.superAdminNav} label="Super Admin" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export default AppSidebar
