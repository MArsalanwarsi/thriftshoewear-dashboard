"use client"

import { useEffect } from "react"
import { useSelector } from "react-redux"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LockKeyhole } from "lucide-react"
import DashboardLayout from "@/layouts/DashboardLayout"
import PageLoader from "@/components/PageLoader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ADMIN_MODULES,
  getFirstAllowedRoute,
  getModuleForPathname,
  hasModuleAccess,
} from "@/config/modules"

export default function ProtectedDashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, user, hydrated } = useSelector((state) => state.auth)
  const isAdmin = user?.role === "admin" || user?.role === "superAdmin"

  useEffect(() => {
    if (!hydrated) return
    if (!token) {
      router.replace("/login")
      return
    }
    if (user && !isAdmin) {
      router.replace("/login")
    }
  }, [hydrated, token, user, isAdmin, router])

  if (!hydrated) return <PageLoader />
  if (!token) return <PageLoader />
  if (!user) return <PageLoader />
  if (!isAdmin) return <PageLoader />

  const requiredModule = getModuleForPathname(pathname)
  if (requiredModule && !hasModuleAccess(user, requiredModule)) {
    const modMeta = ADMIN_MODULES.find((m) => m.key === requiredModule)
    const hasAnyModule = ADMIN_MODULES.some((m) => hasModuleAccess(user, m.key))
    const fallbackHref = getFirstAllowedRoute(user)

    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <Card className="max-w-md w-full border-destructive/30">
            <CardContent className="pt-6 text-center space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <LockKeyhole className="size-6" />
              </div>
              <h2 className="text-lg font-bold">Module Access Restricted</h2>
              <p className="text-sm text-muted-foreground">
                Access to the <strong>{modMeta?.label || requiredModule}</strong> module has not been assigned to your admin account. Contact a Super Admin to update your module permissions.
              </p>
              {hasAnyModule && (
                <Button asChild size="sm">
                  <Link href={fallbackHref}>Go to Allowed Module</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
