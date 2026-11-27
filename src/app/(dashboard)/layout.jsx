"use client"

import { useEffect } from "react"
import { useSelector } from "react-redux"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/layouts/DashboardLayout"
import PageLoader from "@/components/PageLoader"

export default function ProtectedDashboardLayout({ children }) {
  const router = useRouter()
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

  return <DashboardLayout>{children}</DashboardLayout>
}
