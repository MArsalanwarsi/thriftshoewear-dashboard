"use client"

import * as React from "react"
import { useSelector } from "react-redux"
import { toast } from "sonner"
import {
  CheckCircle2,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react"

import { apiRequest } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

export const FEATURE_CATALOG = [
  {
    key: "cart",
    label: "Shopping Cart",
    description: "Controls adding items, cart updates, and the storefront bag drawer.",
  },
  {
    key: "wishlist",
    label: "Wishlist",
    description: "Controls saving/removing 1-of-1 wishlist pieces and the wishlist drawer tab.",
  },
  {
    key: "checkout",
    label: "Checkout & Orders",
    description: "Controls placing new orders and submitting checkout forms on the storefront.",
  },
  {
    key: "sales",
    label: "Sales & Discounts",
    description: "Controls sale pricing, strike-through discounts, and the Sale navigation feed.",
  },
  {
    key: "coupons",
    label: "Coupons & Promo Codes",
    description: "Controls applying promotional codes in the cart/checkout and public offers.",
  },
  {
    key: "reviews",
    label: "Product Reviews",
    description: "Controls viewing/submitting customer product ratings and reviews.",
  },
  {
    key: "orderTracking",
    label: "Order Tracking",
    description: "Controls public shipment tracking lookup via tracking numbers.",
  },
  {
    key: "registration",
    label: "User Registration",
    description: "Controls opening new customer accounts across web and API endpoints.",
  },
  {
    key: "newsletter",
    label: "Newsletter",
    description: "Controls drop alert & newsletter signup widgets on the storefront.",
  },
  {
    key: "search",
    label: "Catalog Search",
    description: "Controls full-text product search in the storefront header and shop filters.",
  },
]

export default function FeaturesPage() {
  const token = useSelector((state) => state.auth?.token)
  const user = useSelector((state) => state.auth?.user)
  const isSuperAdmin = user?.role === "superAdmin"

  const [features, setFeatures] = React.useState({})
  const [updatedAt, setUpdatedAt] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  const [pendingToggle, setPendingToggle] = React.useState(null)
  const [password, setPassword] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [authError, setAuthError] = React.useState("")

  const fetchFeatures = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiRequest("/site/features", { token })
      setFeatures(res.data?.features || {})
      setUpdatedAt(res.data?.updatedAt || null)
    } catch (err) {
      toast.error(err.message || "Failed to load feature controls")
    } finally {
      setLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    fetchFeatures()
  }, [fetchFeatures])

  const openVerificationModal = (item) => {
    const current = features[item.key] !== false
    setPendingToggle({
      key: item.key,
      label: item.label,
      nextActive: !current,
    })
    setPassword("")
    setAuthError("")
  }

  const handleConfirmToggle = async (event) => {
    event.preventDefault()
    if (!pendingToggle) return
    if (!password.trim()) {
      setAuthError("Super admin password is required to unlock feature changes.")
      return
    }

    setSubmitting(true)
    setAuthError("")
    try {
      const res = await apiRequest("/site/features", {
        method: "PATCH",
        token,
        body: {
          password,
          key: pendingToggle.key,
          active: pendingToggle.nextActive,
        },
      })
      setFeatures(res.data?.features || {})
      setUpdatedAt(res.data?.updatedAt || new Date().toISOString())
      toast.success(
        `${pendingToggle.label} set to ${pendingToggle.nextActive ? "Active" : "Inactive"}.`,
      )
      setPendingToggle(null)
      setPassword("")
    } catch (err) {
      setAuthError(err.message || "Verification failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" />
            Super Admin Access Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Storefront capability switches are strictly restricted to Super Admin accounts.
        </CardContent>
      </Card>
    )
  }

  const activeCount = FEATURE_CATALOG.filter((item) => features[item.key] !== false).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="size-5" />
            Feature Controls
          </h1>
          <p className="text-sm text-muted-foreground">
            Activate or deactivate live capabilities across Storefront &amp; Backend. Every change requires Super Admin password confirmation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <LockKeyhole className="size-3.5 text-primary" />
            Password-Locked ({activeCount}/{FEATURE_CATALOG.length} Active)
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchFeatures} disabled={loading}>
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {updatedAt && (
        <p className="text-xs text-muted-foreground">
          Last configuration update: <strong>{formatDate(updatedAt)}</strong>
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
              </Card>
            ))
          : FEATURE_CATALOG.map((item) => {
              const isActive = features[item.key] !== false
              return (
                <Card
                  key={item.key}
                  className={`transition-colors ${!isActive ? "border-amber-500/40 bg-amber-500/5" : ""}`}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{item.label}</CardTitle>
                        <Badge
                          variant="outline"
                          className={
                            isActive
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          }
                        >
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs leading-relaxed">
                        {item.description}
                      </CardDescription>
                    </div>
                    <Switch
                      aria-label={`Toggle ${item.label}`}
                      checked={isActive}
                      onCheckedChange={() => openVerificationModal(item)}
                    />
                  </CardHeader>
                </Card>
              )
            })}
      </div>

      <Dialog
        open={Boolean(pendingToggle)}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setPendingToggle(null)
            setPassword("")
            setAuthError("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Confirm Super Admin Password
            </DialogTitle>
            <DialogDescription>
              Re-enter your current Super Admin password to set{" "}
              <strong>{pendingToggle?.label}</strong> to{" "}
              <strong>{pendingToggle?.nextActive ? "Active" : "Inactive"}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmToggle} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="superadmin-password-confirm">Super Admin Password</Label>
              <Input
                id="superadmin-password-confirm"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password to unlock toggle..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>

            {authError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {authError}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setPendingToggle(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                <CheckCircle2 className="mr-2 size-4" />
                {submitting
                  ? "Verifying..."
                  : `Confirm ${pendingToggle?.nextActive ? "Activate" : "Deactivate"}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
