import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import {
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Loader2,
  MoreHorizontal,
  Receipt,
  RefreshCw,
  Search,
  Truck,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { apiRequest } from "../lib/api"
import { formatCurrency, formatDate, humanize } from "../lib/format"
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  COURIER_OPTIONS,
  CANCELLATION_REASONS,
} from "../config/orderConstants"
import StatusBadge from "../components/StatusBadge"

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
} from "../components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
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
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"

export default function OrdersPage() {
  const navigate = useNavigate()
  const token = useSelector((state) => state.auth?.token)

  // Data states
  const [orders, setOrders] = React.useState([])
  const [pagination, setPagination] = React.useState({ total: 0, page: 1, limit: 20, pages: 1 })
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  // Filter states
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [statusTab, setStatusTab] = React.useState("__all")
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState("__all")
  const [paymentMethodFilter, setPaymentMethodFilter] = React.useState("__all")
  const [page, setPage] = React.useState(1)

  // Dialog states for Quick Actions
  const [dispatchOrder, setDispatchOrder] = React.useState(null)
  const [dispatchCourier, setDispatchCourier] = React.useState("trax")
  const [dispatchTrackingNumber, setDispatchTrackingNumber] = React.useState("")
  const [dispatchTrackingUrl, setDispatchTrackingUrl] = React.useState("")
  const [dispatchSubmitting, setDispatchSubmitting] = React.useState(false)

  const [cancelOrderTarget, setCancelOrderTarget] = React.useState(null)
  const [cancelReason, setCancelReason] = React.useState(CANCELLATION_REASONS[0])
  const [cancelCustomReason, setCancelCustomReason] = React.useState("")
  const [cancelNotes, setCancelNotes] = React.useState("")
  const [cancelSubmitting, setCancelSubmitting] = React.useState(false)

  // Metric summaries
  const metrics = React.useMemo(() => {
    const total = pagination.total || orders.length
    const placed = orders.filter((o) => o.orderStatus === "placed").length
    const inFulfillment = orders.filter((o) => ["confirmed", "processing", "packed"].includes(o.orderStatus)).length
    const inTransit = orders.filter((o) => o.orderStatus === "shipped").length
    const delivered = orders.filter((o) => o.orderStatus === "delivered").length
    return { total, placed, inFulfillment, inTransit, delivered }
  }, [orders, pagination.total])

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch orders
  const fetchOrders = React.useCallback(async (isRefresh = false) => {
    if (!token) return
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const params = {
        page,
        limit: 20,
        sort: "-createdAt",
        includeDeleted: "true",
      }

      if (statusTab !== "__all") params.orderStatus = statusTab
      if (paymentStatusFilter !== "__all") params.paymentStatus = paymentStatusFilter
      if (paymentMethodFilter !== "__all") params.paymentMethod = paymentMethodFilter

      const res = await apiRequest("/orders", { token, params })

      const fetchedList =
        res?.data?.orders ||
        res?.data?.data?.orders ||
        res?.orders ||
        (Array.isArray(res?.data) ? res.data : [])

      const meta = res?.meta || res?.data?.meta || {
        total: fetchedList.length,
        page,
        limit: 20,
        pages: Math.ceil(fetchedList.length / 20) || 1,
      }

      // Filter client-side search across orderNumber, customer name, email, phone
      let filtered = fetchedList
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.trim().toLowerCase()
        filtered = fetchedList.filter((item) => {
          const ordNum = String(item.orderNumber || "").toLowerCase()
          const custName = String(item.customerSnapshot?.fullName || item.user?.displayName || "").toLowerCase()
          const email = String(item.customerSnapshot?.email || item.user?.email || "").toLowerCase()
          const phone = String(item.customerSnapshot?.phone || item.shippingAddress?.phone || "").toLowerCase()
          return ordNum.includes(query) || custName.includes(query) || email.includes(query) || phone.includes(query)
        })
      }

      setOrders(filtered)
      setPagination(meta)
    } catch (err) {
      toast.error(err.message || "Failed to load orders")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token, page, statusTab, paymentStatusFilter, paymentMethodFilter, debouncedSearch])

  React.useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Handle Quick Advance Status
  const handleAdvanceStatus = async (order, targetStatus) => {
    try {
      await apiRequest(`/orders/${order._id}/status`, {
        method: "PATCH",
        token,
        body: { status: targetStatus },
      })
      toast.success(`Order #${order.orderNumber} updated to ${humanize(targetStatus)}`)
      fetchOrders(true)
    } catch (err) {
      toast.error(err.message || "Failed to update order status")
    }
  }

  // Handle Dispatch / Shipped Submission
  const handleDispatchSubmit = async (e) => {
    e.preventDefault()
    if (!dispatchOrder) return
    if (!dispatchTrackingNumber.trim()) {
      toast.error("Tracking number is required to mark order as shipped")
      return
    }

    try {
      setDispatchSubmitting(true)
      await apiRequest(`/orders/${dispatchOrder._id}/status`, {
        method: "PATCH",
        token,
        body: {
          status: "shipped",
          courierName: dispatchCourier,
          trackingNumber: dispatchTrackingNumber.trim(),
          trackingUrl: dispatchTrackingUrl.trim() || undefined,
        },
      })
      toast.success(`Order #${dispatchOrder.orderNumber} marked as shipped via ${humanize(dispatchCourier)}`)
      setDispatchOrder(null)
      setDispatchTrackingNumber("")
      setDispatchTrackingUrl("")
      fetchOrders(true)
    } catch (err) {
      toast.error(err.message || "Failed to dispatch order")
    } finally {
      setDispatchSubmitting(false)
    }
  }

  // Handle Cancel Submission
  const handleCancelSubmit = async () => {
    if (!cancelOrderTarget) return
    const finalReason = cancelReason === "Other administrative reason" && cancelCustomReason.trim()
      ? cancelCustomReason.trim()
      : cancelReason

    try {
      setCancelSubmitting(true)
      await apiRequest(`/orders/${cancelOrderTarget._id}/status`, {
        method: "PATCH",
        token,
        body: {
          status: "cancelled",
          reason: finalReason,
          notes: cancelNotes.trim() || undefined,
        },
      })
      toast.success(`Order #${cancelOrderTarget.orderNumber} has been cancelled and stock released`)
      setCancelOrderTarget(null)
      setCancelCustomReason("")
      setCancelNotes("")
      fetchOrders(true)
    } catch (err) {
      toast.error(err.message || "Failed to cancel order")
    } finally {
      setCancelSubmitting(false)
    }
  }

  const hasActiveFilters =
    statusTab !== "__all" ||
    paymentStatusFilter !== "__all" ||
    paymentMethodFilter !== "__all" ||
    search !== ""

  const resetFilters = () => {
    setStatusTab("__all")
    setPaymentStatusFilter("__all")
    setPaymentMethodFilter("__all")
    setSearch("")
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders & Fulfillment</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer orders, track payments, assign couriers, and advance fulfillment stages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`mr-2 size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Card className="p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Total Orders</span>
            <Receipt className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{metrics.total}</div>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Placed / Pending</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {metrics.placed}
          </div>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">In Fulfillment</span>
            <Boxes className="size-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {metrics.inFulfillment}
          </div>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">In Transit</span>
            <Truck className="size-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {metrics.inTransit}
          </div>
        </Card>
        <Card className="col-span-2 sm:col-span-1 p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.delivered}
          </div>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Status Tabs */}
            <Tabs value={statusTab} onValueChange={(val) => { setStatusTab(val); setPage(1) }}>
              <TabsList className="h-9 w-full justify-start overflow-x-auto p-1 lg:w-auto">
                <TabsTrigger value="__all" className="text-xs">All Orders</TabsTrigger>
                <TabsTrigger value="placed" className="text-xs">Placed</TabsTrigger>
                <TabsTrigger value="confirmed" className="text-xs">Confirmed</TabsTrigger>
                <TabsTrigger value="packed" className="text-xs">Packed</TabsTrigger>
                <TabsTrigger value="shipped" className="text-xs">Shipped</TabsTrigger>
                <TabsTrigger value="delivered" className="text-xs">Delivered</TabsTrigger>
                <TabsTrigger value="cancelled" className="text-xs">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search order #, customer, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
            {/* Payment Status Filter */}
            <Select
              value={paymentStatusFilter}
              onValueChange={(val) => { setPaymentStatusFilter(val); setPage(1) }}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all" className="text-xs">All Payments</SelectItem>
                {PAYMENT_STATUSES.map((ps) => (
                  <SelectItem key={ps.value} value={ps.value} className="text-xs">
                    {ps.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Payment Method Filter */}
            <Select
              value={paymentMethodFilter}
              onValueChange={(val) => { setPaymentMethodFilter(val); setPage(1) }}
            >
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all" className="text-xs">All Methods</SelectItem>
                {PAYMENT_METHODS.map((pm) => (
                  <SelectItem key={pm.value} value={pm.value} className="text-xs">
                    {pm.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 size-3" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-36">Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Items Summary</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead className="hidden sm:table-cell">Placed Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20 mt-1" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Receipt className="size-10 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-foreground">No orders found</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {hasActiveFilters
                          ? "No orders match the current filter criteria. Try adjusting or clearing your filters."
                          : "No customer orders have been recorded yet."}
                      </p>
                      {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const customer = order.customerSnapshot || order.user || {}
                  const items = order.items || []
                  const totals = order.totals || {}
                  const status = order.orderStatus
                  const firstItem = items[0]

                  return (
                    <TableRow key={order._id} className="cursor-pointer group">
                      {/* Order Number */}
                      <TableCell className="font-mono font-semibold text-xs text-primary">
                        <Link
                          to={`/orders/${order._id}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>

                      {/* Customer Info */}
                      <TableCell>
                        <div className="text-xs font-medium text-foreground">
                          {customer.fullName || customer.displayName || "Customer"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {customer.phone || customer.email || "No contact"}
                        </div>
                      </TableCell>

                      {/* Items Summary with condition badge */}
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          {firstItem?.productImage ? (
                            <img
                              src={firstItem.productImage}
                              alt={firstItem.productName}
                              className="size-8 rounded-sm object-cover border border-border/60"
                            />
                          ) : (
                            <div className="size-8 rounded-sm bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                              {items.length}
                            </div>
                          )}
                          <div className="text-xs">
                            <span className="line-clamp-1 font-medium">{firstItem?.productName || "Items"}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {items.length} item{items.length > 1 ? "s" : ""}
                              {firstItem?.condition && ` · Grade: ${humanize(firstItem.condition)}`}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Total Amount */}
                      <TableCell className="text-xs font-semibold">
                        {formatCurrency(totals.grandTotal, totals.currency)}
                      </TableCell>

                      {/* Payment Status */}
                      <TableCell>
                        <StatusBadge value={order.payment?.status || "pending"} />
                      </TableCell>

                      {/* Fulfillment Order Status */}
                      <TableCell>
                        <StatusBadge value={status} />
                      </TableCell>

                      {/* Placed Date */}
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigate(`/orders/${order._id}`)}>
                              <Eye className="mr-2 size-3.5" />
                              View Order Details
                            </DropdownMenuItem>

                            {/* Contextual Status Progression */}
                            {status === "placed" && (
                              <DropdownMenuItem onClick={() => handleAdvanceStatus(order, "confirmed")}>
                                <CheckCircle2 className="mr-2 size-3.5 text-emerald-500" />
                                Confirm Order
                              </DropdownMenuItem>
                            )}

                            {status === "confirmed" && (
                              <>
                                <DropdownMenuItem onClick={() => handleAdvanceStatus(order, "processing")}>
                                  <Clock className="mr-2 size-3.5 text-sky-500" />
                                  Set Processing
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAdvanceStatus(order, "packed")}>
                                  <Boxes className="mr-2 size-3.5 text-indigo-500" />
                                  Set Packed
                                </DropdownMenuItem>
                              </>
                            )}

                            {status === "processing" && (
                              <DropdownMenuItem onClick={() => handleAdvanceStatus(order, "packed")}>
                                <Boxes className="mr-2 size-3.5 text-indigo-500" />
                                Set Packed
                              </DropdownMenuItem>
                            )}

                            {(status === "packed" || status === "confirmed" || status === "processing") && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setDispatchOrder(order)
                                  setDispatchTrackingNumber("")
                                  setDispatchTrackingUrl("")
                                }}
                              >
                                <Truck className="mr-2 size-3.5 text-sky-500" />
                                Mark Shipped...
                              </DropdownMenuItem>
                            )}

                            {status === "shipped" && (
                              <DropdownMenuItem onClick={() => handleAdvanceStatus(order, "delivered")}>
                                <CheckCircle2 className="mr-2 size-3.5 text-emerald-500" />
                                Mark Delivered
                              </DropdownMenuItem>
                            )}

                            {status !== "delivered" && status !== "cancelled" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setCancelOrderTarget(order)
                                    setCancelReason(CANCELLATION_REASONS[0])
                                  }}
                                >
                                  <XCircle className="mr-2 size-3.5" />
                                  Cancel Order
                                </DropdownMenuItem>
                              </>
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

      {/* Pagination Footer */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="h-8 px-2"
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Previous
            </Button>
            <span className="px-2">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 px-2"
            >
              Next
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Courier Dispatch Dialog */}
      <Dialog open={Boolean(dispatchOrder)} onOpenChange={(open) => !open && setDispatchOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dispatch Order #{dispatchOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              Assign a courier service and tracking number to fulfill and dispatch this shipment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDispatchSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courierName" className="text-xs font-semibold">
                Courier Service *
              </Label>
              <Select value={dispatchCourier} onValueChange={setDispatchCourier}>
                <SelectTrigger id="courierName" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COURIER_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingNumber" className="text-xs font-semibold">
                Tracking Number *
              </Label>
              <Input
                id="trackingNumber"
                placeholder="e.g. TRX-998877 or LEO-123456"
                value={dispatchTrackingNumber}
                onChange={(e) => setDispatchTrackingNumber(e.target.value)}
                required
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingUrl" className="text-xs font-semibold">
                Tracking URL (Optional)
              </Label>
              <Input
                id="trackingUrl"
                type="url"
                placeholder="https://track.trax.pk/..."
                value={dispatchTrackingUrl}
                onChange={(e) => setDispatchTrackingUrl(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                If omitted, the backend will auto-generate the standard tracking link for {humanize(dispatchCourier)}.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDispatchOrder(null)}
                disabled={dispatchSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={dispatchSubmitting || !dispatchTrackingNumber.trim()}>
                {dispatchSubmitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Confirm Dispatch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={Boolean(cancelOrderTarget)} onOpenChange={(open) => !open && setCancelOrderTarget(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <XCircle className="size-5" />
              Cancel Order #{cancelOrderTarget?.orderNumber}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cancelling this order will immediately restore all reserved thrift product inventory back to available stock. This operation cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cancellation Reason *</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {cancelReason === "Other administrative reason" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Specify Reason *</Label>
                <Input
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  placeholder="Enter specific cancellation reason..."
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Internal Audit Notes (Optional)</Label>
              <Textarea
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                placeholder="Additional context or customer communication notes..."
                className="text-xs resize-none"
                rows={2}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelSubmitting}>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubmit}
              disabled={cancelSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {cancelSubmitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
