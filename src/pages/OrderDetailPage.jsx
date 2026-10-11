import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  Printer,
  Receipt,
  Truck,
  User,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { apiRequest } from "../lib/api"
import { formatCurrency, formatDate, humanize } from "../lib/format"
import {
  COURIER_OPTIONS,
  CANCELLATION_REASONS,
} from "../config/orderConstants"
import StatusBadge from "../components/StatusBadge"

import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Label } from "../components/ui/label"
import { Separator } from "../components/ui/separator"
import { Skeleton } from "../components/ui/skeleton"

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = useSelector((state) => state.auth?.token)

  // Order data states
  const [order, setOrder] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [mutating, setMutating] = React.useState(false)

  // Dispatch Dialog state
  const [showDispatchDialog, setShowDispatchDialog] = React.useState(false)
  const [courierName, setCourierName] = React.useState("trax")
  const [trackingNumber, setTrackingNumber] = React.useState("")
  const [trackingUrl, setTrackingUrl] = React.useState("")

  // Cancel Dialog state
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [cancelReason, setCancelReason] = React.useState(CANCELLATION_REASONS[0])
  const [customCancelReason, setCustomCancelReason] = React.useState("")
  const [cancelNotes, setCancelNotes] = React.useState("")

  // Fetch Order Details
  const fetchOrder = React.useCallback(async () => {
    if (!token || !id) return
    try {
      setLoading(true)
      setError(null)
      const res = await apiRequest(`/orders/${id}`, { token })
      const data = res?.data?.order || res?.data || res?.order
      if (!data) throw new Error("Order not found")
      setOrder(data)
    } catch (err) {
      setError(err.message || "Failed to load order details")
      toast.error(err.message || "Order not found")
    } finally {
      setLoading(false)
    }
  }, [id, token])

  React.useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  // Status Transition Handler
  const handleTransition = async (nextStatus) => {
    try {
      setMutating(true)
      const res = await apiRequest(`/orders/${id}/status`, {
        method: "PATCH",
        token,
        body: { status: nextStatus },
      })
      const updated = res?.data?.order || res?.order
      if (updated) setOrder(updated)
      else fetchOrder()
      toast.success(`Order advanced to ${humanize(nextStatus)}`)
    } catch (err) {
      toast.error(err.message || "Status update failed")
    } finally {
      setMutating(false)
    }
  }

  // Dispatch Shipment Handler
  const handleDispatchSubmit = async (e) => {
    e.preventDefault()
    if (!trackingNumber.trim()) {
      toast.error("Tracking number is required")
      return
    }

    try {
      setMutating(true)
      const res = await apiRequest(`/orders/${id}/status`, {
        method: "PATCH",
        token,
        body: {
          status: "shipped",
          courierName,
          trackingNumber: trackingNumber.trim(),
          trackingUrl: trackingUrl.trim() || undefined,
        },
      })
      const updated = res?.data?.order || res?.order
      if (updated) setOrder(updated)
      else fetchOrder()
      setShowDispatchDialog(false)
      toast.success(`Order dispatched with ${humanize(courierName)}`)
    } catch (err) {
      toast.error(err.message || "Dispatch update failed")
    } finally {
      setMutating(false)
    }
  }

  // Cancel Order Handler
  const handleCancelSubmit = async () => {
    const reasonText = cancelReason === "Other administrative reason" && customCancelReason.trim()
      ? customCancelReason.trim()
      : cancelReason

    try {
      setMutating(true)
      const res = await apiRequest(`/orders/${id}/status`, {
        method: "PATCH",
        token,
        body: {
          status: "cancelled",
          reason: reasonText,
          notes: cancelNotes.trim() || undefined,
        },
      })
      const updated = res?.data?.order || res?.order
      if (updated) setOrder(updated)
      else fetchOrder()
      setShowCancelDialog(false)
      toast.success("Order cancelled and stock inventory restored")
    } catch (err) {
      toast.error(err.message || "Cancellation failed")
    } finally {
      setMutating(false)
    }
  }

  // Copy tracking or order number
  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 md:col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <AlertCircle className="size-12 text-destructive/80" />
        <h2 className="text-xl font-bold">Failed to load order</h2>
        <p className="text-sm text-muted-foreground">{error || "The requested order could not be located."}</p>
        <Button onClick={() => navigate("/orders")} variant="outline">
          <ArrowLeft className="mr-2 size-4" />
          Back to Orders
        </Button>
      </div>
    )
  }

  const customer = order.customerSnapshot || order.user || {}
  const shipping = order.shippingAddress || {}
  const items = order.items || []
  const totals = order.totals || {}
  const payment = order.payment || {}
  const currentStatus = order.orderStatus
  const isCancelled = currentStatus === "cancelled"

  // 5-Stage Stepper mapping
  const pipelineSteps = [
    { key: "placed", label: "Placed", icon: Receipt },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
    { key: "packed", label: "Packed", icon: Boxes },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle2 },
  ]

  const statusRanks = {
    placed: 1,
    confirmed: 2,
    processing: 2,
    packed: 3,
    shipped: 4,
    delivered: 5,
    cancelled: -1,
  }

  const currentRank = statusRanks[currentStatus] || 1

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/orders")}
            className="h-8 px-2"
          >
            <ArrowLeft className="size-3.5 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono tracking-tight">
                {order.orderNumber}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground"
                onClick={() => copyToClipboard(order.orderNumber, "Order number")}
                title="Copy order number"
              >
                <Copy className="size-3" />
              </Button>
              <StatusBadge value={currentStatus} />
              <StatusBadge value={payment.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Placed on {formatDate(order.createdAt)} · ID: <code>{order._id}</code>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-xs">
            <Printer className="mr-1.5 size-3.5" />
            Print Receipt
          </Button>
        </div>
      </div>

      {/* 5-Stage Fulfillment Progression Stepper */}
      <Card className="overflow-hidden border-border/80">
        <CardHeader className="p-4 pb-2 bg-muted/20 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fulfillment Stage Pipeline
            </CardTitle>
            <span className="text-xs font-medium">
              Current Status: <strong className="capitalize text-foreground">{humanize(currentStatus)}</strong>
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {isCancelled ? (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <XCircle className="size-6 shrink-0" />
              <div>
                <p className="font-semibold text-sm">This order was cancelled</p>
                <p className="text-xs opacity-90 mt-0.5">
                  Reason: <strong>{order.cancellation?.reason || "Cancelled by store"}</strong>
                  {order.cancellation?.notes && ` · Notes: ${order.cancellation.notes}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2 relative">
              {pipelineSteps.map((step, idx) => {
                const isPassed = currentRank > idx + 1
                const isCurrent = currentRank === idx + 1
                const Icon = step.icon

                return (
                  <div key={step.key} className="flex flex-col items-center text-center relative group">
                    {/* Connecting Bar */}
                    {idx < pipelineSteps.length - 1 && (
                      <div
                        className={`absolute top-4 left-1/2 w-full h-0.5 -z-0 transition-colors ${
                          currentRank > idx + 1 ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}

                    {/* Step Icon Node */}
                    <div
                      className={`relative z-10 flex size-8 items-center justify-center rounded-full border-2 transition-all ${
                        isPassed
                          ? "bg-primary border-primary text-primary-foreground"
                          : isCurrent
                            ? "bg-background border-primary text-primary ring-4 ring-primary/20"
                            : "bg-muted/40 border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                    </div>

                    <span
                      className={`mt-2 text-xs font-medium ${
                        isCurrent
                          ? "text-primary font-bold"
                          : isPassed
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Contextual Action Bar */}
          {!isCancelled && currentStatus !== "delivered" && (
            <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 bg-muted/10 -mx-4 -mb-4 p-4 rounded-b-lg">
              <div className="text-xs text-muted-foreground">
                Next recommended action:{" "}
                <strong className="text-foreground">
                  {currentStatus === "placed"
                    ? "Verify order and confirm for processing"
                    : currentStatus === "confirmed" || currentStatus === "processing"
                      ? "Pack items in warehouse or prepare shipment dispatch"
                      : currentStatus === "packed"
                        ? "Assign courier and input tracking number"
                        : "Verify parcel handover and mark delivered"}
                </strong>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {currentStatus === "placed" && (
                  <Button
                    size="sm"
                    disabled={mutating}
                    onClick={() => handleTransition("confirmed")}
                  >
                    {mutating && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                    Confirm Order
                  </Button>
                )}

                {currentStatus === "confirmed" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={mutating}
                      onClick={() => handleTransition("processing")}
                    >
                      Set Processing
                    </Button>
                    <Button
                      size="sm"
                      disabled={mutating}
                      onClick={() => handleTransition("packed")}
                    >
                      Mark as Packed
                    </Button>
                  </>
                )}

                {currentStatus === "processing" && (
                  <Button
                    size="sm"
                    disabled={mutating}
                    onClick={() => handleTransition("packed")}
                  >
                    Mark as Packed
                  </Button>
                )}

                {(currentStatus === "packed" || currentStatus === "confirmed" || currentStatus === "processing") && (
                  <Button
                    size="sm"
                    variant={currentStatus === "packed" ? "default" : "outline"}
                    disabled={mutating}
                    onClick={() => {
                      setTrackingNumber(order.shipping?.trackingNumber || "")
                      setTrackingUrl(order.shipping?.trackingUrl || "")
                      setCourierName(order.shipping?.courierName || "trax")
                      setShowDispatchDialog(true)
                    }}
                  >
                    <Truck className="mr-1.5 size-3.5" />
                    Dispatch Shipment...
                  </Button>
                )}

                {currentStatus === "shipped" && (
                  <Button
                    size="sm"
                    disabled={mutating}
                    onClick={() => handleTransition("delivered")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {mutating && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                    Mark Delivered
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={mutating}
                  onClick={() => setShowCancelDialog(true)}
                  className="text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <XCircle className="mr-1.5 size-3.5" />
                  Cancel Order
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Grid: Order Details & Customer/Fulfillment Snapshots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Line Items, Courier Tracking & Audit Trail */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">
                Order Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-24 text-center">Grade</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="w-16 text-center">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item._id || idx}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="size-12 rounded-md object-cover border border-border"
                            />
                          ) : (
                            <div className="size-12 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground border">
                              TSW
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {item.productName}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                              <span className="font-mono">SKU: {item.sku}</span>
                              {item.size && <span>· Size: <strong className="text-foreground">{item.size}</strong></span>}
                              {item.color && <span>· Color: {item.color}</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge value={item.condition || "good"} />
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(item.finalPrice || item.regularPrice, totals.currency)}
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-foreground">
                        {formatCurrency((item.finalPrice || item.regularPrice) * item.quantity, totals.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Courier & Tracking Details Card */}
          {order.shipping?.trackingNumber && (
            <Card className="border-sky-200 dark:border-sky-900/50 bg-sky-50/30 dark:bg-sky-950/20">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="size-4 text-sky-600 dark:text-sky-400" />
                    <CardTitle className="text-sm font-semibold">Shipment Dispatch Details</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-sky-300 text-sky-700 dark:text-sky-300 capitalize text-xs">
                    {order.shipping?.deliveryStatus || "in_transit"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2 text-xs space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-muted-foreground block">Courier:</span>
                    <strong className="text-foreground capitalize">{humanize(order.shipping.courierName)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Tracking Number:</span>
                    <div className="flex items-center gap-1">
                      <code className="font-mono font-bold">{order.shipping.trackingNumber}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5"
                        onClick={() => copyToClipboard(order.shipping.trackingNumber, "Tracking number")}
                      >
                        <Copy className="size-3" />
                      </Button>
                    </div>
                  </div>
                  {order.shipping.shippedAt && (
                    <div>
                      <span className="text-muted-foreground block">Dispatched At:</span>
                      <span>{formatDate(order.shipping.shippedAt)}</span>
                    </div>
                  )}
                </div>

                {order.shipping.trackingUrl && (
                  <div className="pt-2 border-t border-border/40">
                    <a
                      href={order.shipping.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline flex items-center gap-1 font-medium"
                    >
                      <ExternalLink className="size-3.5" />
                      Track parcel on {humanize(order.shipping.courierName)} portal
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Audit Trail & Timeline */}
          {order.timeline && order.timeline.length > 0 && (
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Order History & Audit Trail</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-muted">
                  {order.timeline.map((event, i) => (
                    <div key={event._id || i} className="flex items-start gap-3 relative z-10 text-xs">
                      <div className="size-6 rounded-full bg-background border-2 border-primary/60 flex items-center justify-center shrink-0">
                        <Clock className="size-3 text-primary" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold capitalize text-foreground">{event.status}</span>
                          <span className="text-muted-foreground text-[11px]">{formatDate(event.changedAt)}</span>
                        </div>
                        <p className="text-muted-foreground">{event.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Customer Profile, Shipping Address & Financials */}
        <div className="space-y-6">
          {/* Financial Breakdown Card */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold">Payment & Financials</CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-semibold uppercase">{humanize(payment.method || "cod")}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Payment Status:</span>
                <StatusBadge value={payment.status || "pending"} />
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal, totals.currency)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping Fee:</span>
                  <span>{formatCurrency(totals.shippingFee || 0, totals.currency)}</span>
                </div>
                {totals.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount ({order.couponSnapshot?.code || "Coupon"}):</span>
                    <span>-{formatCurrency(totals.couponDiscount, totals.currency)}</span>
                  </div>
                )}
                {totals.taxTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax:</span>
                    <span>{formatCurrency(totals.taxTotal, totals.currency)}</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between text-sm font-bold text-foreground">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(totals.grandTotal, totals.currency)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>Amount Paid:</span>
                  <span className="text-emerald-600 font-medium">{formatCurrency(totals.amountPaid || 0, totals.currency)}</span>
                </div>
                {totals.amountDue > 0 && (
                  <div className="flex justify-between text-xs text-amber-600 font-semibold">
                    <span>Amount Due (COD):</span>
                    <span>{formatCurrency(totals.amountDue, totals.currency)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Profile Card */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <User className="size-4 text-primary" />
                Customer Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2">
              <p className="font-semibold text-foreground text-sm">
                {customer.fullName || customer.displayName || "Customer"}
              </p>
              <div className="space-y-1 text-muted-foreground">
                <p>Email: {customer.email || "No email on record"}</p>
                <p>Phone: {customer.phone || shipping.phone || "Not set"}</p>
                <p>Customer Type: <strong className="capitalize text-foreground">{customer.customerType || "retail"}</strong></p>
              </div>

              {order.customerNotes && (
                <div className="mt-3 pt-2 border-t border-border/40">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Customer Order Notes:</span>
                  <p className="text-xs text-foreground italic mt-0.5 bg-muted/30 p-2 rounded-md">
                    &quot;{order.customerNotes}&quot;
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address Destination Card */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <MapPin className="size-4 text-primary" />
                Shipping Destination
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-1 text-muted-foreground">
              <p className="font-semibold text-foreground text-sm">{shipping.fullName || customer.fullName}</p>
              <p>{shipping.addressLine1}</p>
              {shipping.addressLine2 && <p>{shipping.addressLine2}</p>}
              <p>{[shipping.area, shipping.city, shipping.province].filter(Boolean).join(", ")}</p>
              <p>{[shipping.postalCode, shipping.country || "Pakistan"].filter(Boolean).join(", ")}</p>
              {shipping.phone && <p className="pt-1">Contact: <strong className="text-foreground">{shipping.phone}</strong></p>}
              {shipping.landmark && (
                <p className="text-[11px] italic pt-1 text-muted-foreground/80">
                  Landmark: {shipping.landmark}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Courier Dispatch Dialog */}
      <Dialog open={showDispatchDialog} onOpenChange={setShowDispatchDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dispatch Order #{order.orderNumber}</DialogTitle>
            <DialogDescription>
              Provide tracking details from the logistics provider to mark this order as shipped.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDispatchSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courierName" className="text-xs font-semibold">Courier Service *</Label>
              <Select value={courierName} onValueChange={setCourierName}>
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
              <Label htmlFor="trackingNumber" className="text-xs font-semibold">Tracking Number *</Label>
              <Input
                id="trackingNumber"
                placeholder="e.g. TRX-998877 or LEO-123456"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                required
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingUrl" className="text-xs font-semibold">Tracking URL (Optional)</Label>
              <Input
                id="trackingUrl"
                type="url"
                placeholder="https://track.trax.pk/..."
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowDispatchDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={mutating || !trackingNumber.trim()}>
                {mutating && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Confirm Dispatch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <XCircle className="size-5" />
              Cancel Order #{order.orderNumber}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cancelling will release reserved thrift items back to the product catalog and flag payment as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason for Cancellation *</Label>
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
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  placeholder="Explain why this order is being cancelled..."
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Internal Audit Notes</Label>
              <Textarea
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                placeholder="Additional details..."
                className="text-xs resize-none"
                rows={2}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutating}>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubmit}
              disabled={mutating}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {mutating && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
