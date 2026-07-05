import { NavLink, Outlet, useLocation } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import {
  BadgeDollarSign,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Image,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  PackageCheck,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tags,
  TicketPercent,
  Truck,
  Users,
} from "lucide-react"
import { useState } from "react"
import { logout } from "../store/authSlice"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Separator } from "./ui/separator"
import { cn } from "../lib/utils"

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: ShoppingBag },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/orders", label: "Orders", icon: Receipt },
  { to: "/users", label: "Customers", icon: Users },
  { to: "/coupons", label: "Coupons", icon: TicketPercent },
  { to: "/payments", label: "Payments", icon: BadgeDollarSign },
  { to: "/shipments", label: "Shipments", icon: Truck },
  { to: "/reviews", label: "Reviews", icon: MessageSquareText },
  { to: "/assets", label: "Assets", icon: Image },
  { to: "/settings", label: "Settings", icon: Settings },
]

const pageTitles = {
  "/": "Overview",
  "/products": "Products",
  "/categories": "Categories",
  "/orders": "Orders",
  "/users": "Customers",
  "/coupons": "Coupons",
  "/payments": "Payments",
  "/shipments": "Shipments",
  "/reviews": "Reviews",
  "/assets": "Site Assets",
  "/settings": "Settings",
}

function initials(user) {
  const source = user?.displayName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Admin"
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function NavItem({ item, collapsed }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          collapsed && "justify-center px-2",
          isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        )
      }
      title={collapsed ? item.label : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

export default function AppShell() {
  const dispatch = useDispatch()
  const location = useLocation()
  const user = useSelector((state) => state.auth.user)
  const [collapsed, setCollapsed] = useState(false)
  const title = pageTitles[location.pathname] || "Dashboard"

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-card transition-all lg:flex lg:flex-col",
          collapsed ? "w-20" : "w-72",
        )}
      >
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <PackageCheck className="size-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Thrift Shoe Wear</p>
              <p className="truncate text-xs text-muted-foreground">Admin dashboard</p>
            </div>
          )}
        </div>
        <Separator />
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} />
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            {!collapsed && <span>Collapse</span>}
          </Button>
        </div>
      </aside>

      <div className={cn("min-h-screen transition-all", collapsed ? "lg:pl-20" : "lg:pl-72")}>
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground lg:hidden">
                <Boxes className="size-4" />
                Dashboard
              </div>
              <h1 className="truncate text-xl font-semibold tracking-normal">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                <ShieldCheck className="size-4 text-emerald-600" />
                {user?.role}
              </div>
              <Avatar>
                <AvatarImage src={user?.avatar?.url} alt={user?.displayName || "Admin"} />
                <AvatarFallback>{initials(user)}</AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" size="sm" onClick={() => dispatch(logout())}>
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-border p-2 lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground",
                      isActive && "bg-primary text-primary-foreground",
                    )
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
