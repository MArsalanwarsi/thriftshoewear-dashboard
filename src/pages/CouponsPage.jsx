import * as React from "react"
import { useSelector } from "react-redux"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  History,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Tag,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { apiRequest } from "../lib/api"
import { formatCurrency, formatDate } from "../lib/format"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import {
  Card,
  CardContent,
} from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Badge } from "../components/ui/badge"
import { Switch } from "../components/ui/switch"
import { Textarea } from "../components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog"
import { Skeleton } from "../components/ui/skeleton"
import StatusBadge from "../components/StatusBadge"

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed Amount (PKR)" },
  { value: "free_shipping", label: "Free Shipping" },
]

const COUPON_STATUSES = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "inactive", label: "Inactive" },
  { value: "expired", label: "Expired" },
]

const toDateTimeLocal = (dateString) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const defaultCouponForm = {
  code: "",
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: 10,
  maxDiscountAmount: "",
  minOrderAmount: 0,
  startsAt: new Date().toISOString().slice(0, 16),
  endsAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
  totalLimit: "",
  perUserLimit: 1,
  status: "active",
  appliesTo: "all",
  productTypes: [],
  firstOrderOnly: false,
  newCustomerOnly: false,
  allowWithSaleItems: true,
  allowWithOtherCoupons: false,
}

export default function CouponsPage() {
  const token = useSelector((state) => state.auth?.token)

  // Data states
  const [coupons, setCoupons] = React.useState([])
  const [pagination, setPagination] = React.useState({ total: 0, page: 1, limit: 20, pages: 1 })
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  // Filters
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("__all")
  const [typeFilter, setTypeFilter] = React.useState("__all")
  const [includeDeleted, setIncludeDeleted] = React.useState(false)
  const [page, setPage] = React.useState(1)

  // Form modal
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingCoupon, setEditingCoupon] = React.useState(null)
  const [formData, setFormData] = React.useState(defaultCouponForm)
  const [formErrors, setFormErrors] = React.useState({})
  const [submitting, setSubmitting] = React.useState(false)

  // Usages drawer / modal
  const [usagesCoupon, setUsagesCoupon] = React.useState(null)
  const [usagesList, setUsagesList] = React.useState([])
  const [usagesLoading, setUsagesLoading] = React.useState(false)

  // Delete modal
  const [deleteTarget, setDeleteTarget] = React.useState(null)
  const [actionPending, setActionPending] = React.useState(false)

  // Copied code feedback
  const [copiedCode, setCopiedCode] = React.useState("")

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch Coupons
  const fetchCoupons = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const params = {
        page,
        limit: 20,
        includeDeleted: includeDeleted ? "true" : undefined,
      }
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      if (statusFilter !== "__all") params.status = statusFilter
      if (typeFilter !== "__all") params.discountType = typeFilter

      const res = await apiRequest("/coupons", { token, params })
      const list = res.data?.coupons || []
      const meta = res.meta || { total: list.length, page: 1, pages: 1, limit: 20 }

      setCoupons(list)
      setPagination(meta)
    } catch (err) {
      toast.error(err.message || "Failed to load coupons")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token, page, debouncedSearch, statusFilter, typeFilter, includeDeleted])

  React.useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  // Copy code handler
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Coupon code ${code} copied to clipboard!`)
    setTimeout(() => setCopiedCode(""), 2000)
  }

  // Quick Status Toggle
  const handleToggleStatus = async (coupon) => {
    const nextStatus = coupon.status === "active" ? "inactive" : "active"
    try {
      await apiRequest(`/coupons/${coupon._id}`, {
        method: "PATCH",
        token,
        body: { status: nextStatus },
      })
      toast.success(`Coupon "${coupon.code}" set to ${nextStatus}`)
      setCoupons((prev) =>
        prev.map((c) => (c._id === coupon._id ? { ...c, status: nextStatus } : c))
      )
    } catch (err) {
      toast.error(err.message || "Failed to update coupon status")
    }
  }

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingCoupon(null)
    setFormData(defaultCouponForm)
    setFormErrors({})
    setDialogOpen(true)
  }

  // Open Edit Dialog
  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code || "",
      title: coupon.title || "",
      description: coupon.description || "",
      discountType: coupon.discountType || "percentage",
      discountValue: coupon.discountValue ?? 0,
      maxDiscountAmount: coupon.maxDiscountAmount ?? "",
      minOrderAmount: coupon.minOrderAmount ?? 0,
      startsAt: toDateTimeLocal(coupon.validity?.startsAt),
      endsAt: toDateTimeLocal(coupon.validity?.endsAt),
      totalLimit: coupon.usageLimit?.totalLimit ?? "",
      perUserLimit: coupon.usageLimit?.perUserLimit ?? 1,
      status: coupon.status || "draft",
      appliesTo: coupon.applicability?.appliesTo || "all",
      productTypes: coupon.applicability?.productTypes || [],
      firstOrderOnly: Boolean(coupon.conditions?.firstOrderOnly),
      newCustomerOnly: Boolean(coupon.conditions?.newCustomerOnly),
      allowWithSaleItems: coupon.conditions?.allowWithSaleItems !== false,
      allowWithOtherCoupons: Boolean(coupon.conditions?.allowWithOtherCoupons),
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  // Validate Form
  const validateForm = () => {
    const errors = {}
    if (!formData.code.trim()) errors.code = "Coupon code is required"
    else if (!/^[A-Z0-9_-]+$/.test(formData.code.trim().toUpperCase())) {
      errors.code = "Only letters, numbers, hyphens, and underscores are allowed"
    } else if (formData.code.trim().length < 3) {
      errors.code = "Code must be at least 3 characters"
    }

    if (!formData.title.trim()) errors.title = "Coupon title is required"

    if (formData.discountType === "percentage") {
      const val = Number(formData.discountValue)
      if (Number.isNaN(val) || val <= 0 || val > 100) {
        errors.discountValue = "Percentage discount must be between 1 and 100"
      }
    } else if (formData.discountType === "fixed") {
      const val = Number(formData.discountValue)
      if (Number.isNaN(val) || val <= 0) {
        errors.discountValue = "Fixed discount amount must be greater than 0"
      }
    }

    if (!formData.startsAt) errors.startsAt = "Start date is required"
    if (!formData.endsAt) errors.endsAt = "End date is required"
    if (formData.startsAt && formData.endsAt) {
      if (new Date(formData.endsAt) <= new Date(formData.startsAt)) {
        errors.endsAt = "End date must be after start date"
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Save Coupon (Create / Update)
  const handleSaveCoupon = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        discountType: formData.discountType,
        discountValue:
          formData.discountType === "free_shipping" ? 0 : Number(formData.discountValue),
        maxDiscountAmount:
          formData.discountType === "percentage" && formData.maxDiscountAmount !== ""
            ? Number(formData.maxDiscountAmount)
            : null,
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        validity: {
          startsAt: new Date(formData.startsAt).toISOString(),
          endsAt: new Date(formData.endsAt).toISOString(),
        },
        usageLimit: {
          totalLimit: formData.totalLimit !== "" ? Number(formData.totalLimit) : null,
          perUserLimit: Number(formData.perUserLimit) || 1,
        },
        status: formData.status,
        applicability: {
          appliesTo: formData.appliesTo,
          productTypes: formData.appliesTo === "specific_product_types" ? formData.productTypes : [],
        },
        conditions: {
          firstOrderOnly: formData.firstOrderOnly,
          newCustomerOnly: formData.newCustomerOnly,
          allowWithSaleItems: formData.allowWithSaleItems,
          allowWithOtherCoupons: formData.allowWithOtherCoupons,
        },
      }

      if (editingCoupon) {
        await apiRequest(`/coupons/${editingCoupon._id}`, {
          method: "PATCH",
          token,
          body: payload,
        })
        toast.success(`Coupon "${payload.code}" updated successfully`)
      } else {
        await apiRequest("/coupons", {
          method: "POST",
          token,
          body: payload,
        })
        toast.success(`Coupon "${payload.code}" created successfully`)
      }

      setDialogOpen(false)
      fetchCoupons(true)
    } catch (err) {
      toast.error(err.message || "Failed to save coupon")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Coupon
  const handleDeleteCoupon = async () => {
    if (!deleteTarget) return
    setActionPending(true)
    try {
      await apiRequest(`/coupons/${deleteTarget._id}`, {
        method: "DELETE",
        token,
      })
      toast.success(`Coupon "${deleteTarget.code}" archived successfully`)
      setDeleteTarget(null)
      fetchCoupons(true)
    } catch (err) {
      toast.error(err.message || "Failed to archive coupon")
    } finally {
      setActionPending(false)
    }
  }

  // Restore Coupon
  const handleRestoreCoupon = async (coupon) => {
    try {
      await apiRequest(`/coupons/${coupon._id}/restore`, {
        method: "PATCH",
        token,
      })
      toast.success(`Coupon "${coupon.code}" restored to draft status`)
      fetchCoupons(true)
    } catch (err) {
      toast.error(err.message || "Failed to restore coupon")
    }
  }

  // View Redemptions
  const handleViewUsages = async (coupon) => {
    setUsagesCoupon(coupon)
    setUsagesLoading(true)
    try {
      const res = await apiRequest("/coupons/usages", {
        token,
        params: { coupon: coupon._id, limit: 50 },
      })
      setUsagesList(res.data?.usages || [])
    } catch (err) {
      toast.error(err.message || "Failed to load coupon redemption history")
      setUsagesList([])
    } finally {
      setUsagesLoading(false)
    }
  }

  // Computed summary metrics
  const stats = React.useMemo(() => {
    const total = pagination.total || coupons.length
    const activeCount = coupons.filter((c) => c.status === "active" && !c.isDeleted).length
    const totalDiscounts = coupons.reduce(
      (sum, c) => sum + (c.usageStats?.totalDiscountGiven || 0),
      0
    )
    const totalUsed = coupons.reduce((sum, c) => sum + (c.usageStats?.totalUsed || 0), 0)
    return { total, activeCount, totalDiscounts, totalUsed }
  }, [coupons, pagination])

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Coupons & Discounts</h2>
          <p className="text-sm text-muted-foreground">
            Configure promotional discount codes, validity windows, and checkout redemption limits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCoupons(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="mr-2 size-4" />
            Create Coupon
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <TicketPercent className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Coupons</p>
              <h3 className="text-xl font-bold">{stats.total}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <Check className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Campaigns</p>
              <h3 className="text-xl font-bold">{stats.activeCount}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-500/10 p-2.5 text-sky-600 dark:text-sky-400">
              <History className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Times Redeemed</p>
              <h3 className="text-xl font-bold">{stats.totalUsed}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <Tag className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Discounts Given</p>
              <h3 className="text-xl font-bold">{formatCurrency(stats.totalDiscounts)}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search code or title..."
                  className="pl-8 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger className="w-[140px] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Statuses</SelectItem>
                  {COUPON_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setPage(1); }}>
                <SelectTrigger className="w-[150px] text-sm">
                  <SelectValue placeholder="Discount Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Discount Types</SelectItem>
                  {DISCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="include-deleted-coupons"
                  checked={includeDeleted}
                  onCheckedChange={(val) => { setIncludeDeleted(val); setPage(1); }}
                />
                <Label htmlFor="include-deleted-coupons" className="text-xs text-muted-foreground cursor-pointer">
                  Show Archived
                </Label>
              </div>

              {(search || statusFilter !== "__all" || typeFilter !== "__all" || includeDeleted) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setStatusFilter("__all")
                    setTypeFilter("__all")
                    setIncludeDeleted(false)
                    setPage(1)
                  }}
                  className="text-xs"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Coupon</TableHead>
                <TableHead>Discount Value</TableHead>
                <TableHead>Validity Period</TableHead>
                <TableHead>Usage / Limit</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-5 w-32 mb-1" /><Skeleton className="h-3 w-44" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <TicketPercent className="size-8 stroke-[1.5]" />
                      <p className="text-sm font-medium">No coupons found</p>
                      <p className="text-xs">Create your first coupon discount campaign to get started.</p>
                      <Button size="sm" variant="outline" onClick={handleOpenCreate} className="mt-2">
                        <Plus className="mr-1.5 size-3.5" />
                        Create Coupon
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => {
                  const now = new Date()
                  const startsAt = new Date(coupon.validity?.startsAt)
                  const endsAt = new Date(coupon.validity?.endsAt)
                  const isExpired = endsAt < now
                  const isUpcoming = startsAt > now
                  const isExpiringSoon = !isExpired && endsAt - now < 3 * 86400000

                  return (
                    <TableRow key={coupon._id} className={coupon.isDeleted ? "opacity-60 bg-muted/20" : ""}>
                      {/* Code & Title */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded border bg-muted/60">
                              {coupon.code}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-muted-foreground hover:text-foreground"
                              onClick={() => handleCopyCode(coupon.code)}
                              title="Copy code"
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="size-3 text-emerald-500" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs font-medium text-foreground line-clamp-1">{coupon.title}</p>
                          {coupon.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{coupon.description}</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Discount Details */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {coupon.discountType === "percentage" && (
                              <Badge variant="outline" className="font-semibold text-emerald-600 border-emerald-300 dark:border-emerald-800">
                                {coupon.discountValue}% Off
                              </Badge>
                            )}
                            {coupon.discountType === "fixed" && (
                              <Badge variant="outline" className="font-semibold text-sky-600 border-sky-300 dark:border-sky-800">
                                {formatCurrency(coupon.discountValue)} Off
                              </Badge>
                            )}
                            {coupon.discountType === "free_shipping" && (
                              <Badge variant="outline" className="font-semibold text-amber-600 border-amber-300 dark:border-amber-800">
                                Free Shipping
                              </Badge>
                            )}
                          </div>
                          {coupon.discountType === "percentage" && coupon.maxDiscountAmount && (
                            <p className="text-[11px] text-muted-foreground">
                              Capped at {formatCurrency(coupon.maxDiscountAmount)}
                            </p>
                          )}
                          {coupon.minOrderAmount > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              Min order: {formatCurrency(coupon.minOrderAmount)}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Validity Period */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-xs">
                            <span className="text-muted-foreground">From: </span>
                            {formatDate(coupon.validity?.startsAt)}
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Until: </span>
                            {formatDate(coupon.validity?.endsAt)}
                          </div>
                          <div>
                            {isExpired ? (
                              <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Expired</Badge>
                            ) : isUpcoming ? (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-sky-600 border-sky-300">Upcoming</Badge>
                            ) : isExpiringSoon ? (
                              <Badge variant="warning" className="text-[10px] py-0 px-1.5">Expiring Soon</Badge>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>

                      {/* Usage / Limit */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-xs font-medium">
                            {coupon.usageStats?.totalUsed || 0}
                            <span className="text-muted-foreground font-normal">
                              {" "}/ {coupon.usageLimit?.totalLimit ?? "Unlimited"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {coupon.usageLimit?.perUserLimit || 1} per customer
                          </p>
                          {coupon.usageStats?.totalDiscountGiven > 0 && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                              Saved: {formatCurrency(coupon.usageStats.totalDiscountGiven)}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Status & Quick Toggle */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          {coupon.isDeleted ? (
                            <Badge variant="destructive">Archived</Badge>
                          ) : (
                            <>
                              <StatusBadge value={coupon.status} />
                              <Switch
                                size="sm"
                                checked={coupon.status === "active"}
                                onCheckedChange={() => handleToggleStatus(coupon)}
                                disabled={isExpired}
                                title={isExpired ? "Cannot activate expired coupon" : "Toggle active"}
                              />
                            </>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Coupon Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenEdit(coupon)}>
                              <Pencil className="mr-2 size-4" />
                              Edit Rules
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewUsages(coupon)}>
                              <History className="mr-2 size-4" />
                              Redemption Logs
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopyCode(coupon.code)}>
                              <Copy className="mr-2 size-4" />
                              Copy Code
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {coupon.isDeleted ? (
                              <DropdownMenuItem
                                onClick={() => handleRestoreCoupon(coupon)}
                                className="text-emerald-600 dark:text-emerald-400"
                              >
                                <RotateCcw className="mr-2 size-4" />
                                Restore Coupon
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(coupon)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Archive Coupon
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
          <p>
            Showing {coupons.length} of {pagination.total} coupons
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              <ChevronLeft className="mr-1 size-3.5" />
              Previous
            </Button>
            <span className="font-medium">
              Page {page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages || loading}
              onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
            >
              Next
              <ChevronRight className="ml-1 size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : "Create New Coupon"}
            </DialogTitle>
            <DialogDescription>
              Configure discount rules, order conditions, expiration schedules, and redemption caps.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCoupon} className="space-y-4 py-2">
            {/* Section 1: General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="coupon-code">Coupon Code *</Label>
                <Input
                  id="coupon-code"
                  placeholder="e.g. THRIFT50"
                  className="font-mono uppercase"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
                {formErrors.code && <p className="text-xs text-destructive">{formErrors.code}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-title">Campaign Title *</Label>
                <Input
                  id="coupon-title"
                  placeholder="e.g. Summer Kickoff 50% Off"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                {formErrors.title && <p className="text-xs text-destructive">{formErrors.title}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="coupon-desc">Description (Optional)</Label>
              <Textarea
                id="coupon-desc"
                placeholder="Internal or customer-facing description of promotional terms..."
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Section 2: Discount Rules */}
            <div className="rounded-lg border p-3.5 space-y-3 bg-muted/20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Discount Mechanics
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Discount Type *</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(val) => setFormData({ ...formData, discountType: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCOUNT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.discountType !== "free_shipping" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="discount-val">
                      {formData.discountType === "percentage" ? "Percentage (% off) *" : "Fixed Value (PKR) *"}
                    </Label>
                    <Input
                      id="discount-val"
                      type="number"
                      min={0}
                      max={formData.discountType === "percentage" ? 100 : undefined}
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    />
                    {formErrors.discountValue && (
                      <p className="text-xs text-destructive">{formErrors.discountValue}</p>
                    )}
                  </div>
                )}

                {formData.discountType === "percentage" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="max-discount">Max Discount Cap (PKR)</Label>
                    <Input
                      id="max-discount"
                      type="number"
                      placeholder="e.g. 2500 (blank = no cap)"
                      value={formData.maxDiscountAmount}
                      onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="min-order">Min Order Amount (PKR)</Label>
                  <Input
                    id="min-order"
                    type="number"
                    min={0}
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Validity Schedule */}
            <div className="rounded-lg border p-3.5 space-y-3 bg-muted/20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Validity Window
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date">Start Date & Time *</Label>
                  <Input
                    id="start-date"
                    type="datetime-local"
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                  />
                  {formErrors.startsAt && <p className="text-xs text-destructive">{formErrors.startsAt}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-date">End Date & Time *</Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={formData.endsAt}
                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                  />
                  {formErrors.endsAt && <p className="text-xs text-destructive">{formErrors.endsAt}</p>}
                </div>
              </div>
            </div>

            {/* Section 4: Limits & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="total-limit">Total Usage Limit</Label>
                <Input
                  id="total-limit"
                  type="number"
                  min={1}
                  placeholder="Blank for unlimited"
                  value={formData.totalLimit}
                  onChange={(e) => setFormData({ ...formData, totalLimit: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="per-user">Per-User Limit *</Label>
                <Input
                  id="per-user"
                  type="number"
                  min={1}
                  value={formData.perUserLimit}
                  onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Initial Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section 5: Conditions */}
            <div className="rounded-lg border p-3.5 space-y-2 bg-muted/20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Order Conditions & Stacking
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={formData.allowWithSaleItems}
                    onCheckedChange={(checked) => setFormData({ ...formData, allowWithSaleItems: checked })}
                  />
                  <span>Allow on sale items</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={formData.firstOrderOnly}
                    onCheckedChange={(checked) => setFormData({ ...formData, firstOrderOnly: checked })}
                  />
                  <span>First-time order only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={formData.newCustomerOnly}
                    onCheckedChange={(checked) => setFormData({ ...formData, newCustomerOnly: checked })}
                  />
                  <span>New customers only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={formData.allowWithOtherCoupons}
                    onCheckedChange={(checked) => setFormData({ ...formData, allowWithOtherCoupons: checked })}
                  />
                  <span>Allow coupon stacking</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {editingCoupon ? "Save Changes" : "Create Coupon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Redemption Logs Dialog */}
      <Dialog open={Boolean(usagesCoupon)} onOpenChange={(open) => !open && setUsagesCoupon(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Redemption History: {usagesCoupon?.code}</DialogTitle>
            <DialogDescription>
              Orders and customer redemptions for campaign &quot;{usagesCoupon?.title}&quot;.
            </DialogDescription>
          </DialogHeader>

          {usagesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : usagesList.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No redemptions recorded for this coupon code yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Discount Given</TableHead>
                  <TableHead className="text-right">Redeemed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usagesList.map((usage) => (
                  <TableRow key={usage._id}>
                    <TableCell>
                      <div className="text-xs font-medium">
                        {usage.user?.displayName || `${usage.user?.firstName || ""} ${usage.user?.lastName || ""}`.trim() || "Customer"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{usage.user?.email}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {usage.order?.orderNumber || "Direct Checkout"}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-emerald-600">
                      {formatCurrency(usage.discountAmount)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {formatDate(usage.usedAt || usage.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete / Archive Alert Dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Coupon &quot;{deleteTarget?.code}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Archiving this coupon will deactivate it immediately. Existing order histories will remain preserved, and you can restore it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCoupon}
              disabled={actionPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Archive Coupon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
