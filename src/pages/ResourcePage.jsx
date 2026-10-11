import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react"
import {
  createRecord,
  deleteRecord,
  fetchResource,
  runRecordAction,
  updateRecord,
} from "../store/adminSlice"
import { RESOURCE_CONFIG, courierNames, getInitialFormValues } from "../config/resources"
import { formatCurrency, formatDate, humanize, shortId } from "../lib/format"
import { ImageUpload } from "../components/common/ImageUpload"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { Switch } from "../components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import { Textarea } from "../components/ui/textarea"
import StatusBadge from "../components/StatusBadge"

const ALL_VALUE = "__all"
const NONE_VALUE = "__none"

function valueForSelect(value) {
  return value === undefined || value === null || value === "" ? NONE_VALUE : String(value)
}

function valueFromSelect(value) {
  return value === ALL_VALUE || value === NONE_VALUE ? "" : value
}

function VariantListEditor({ variants = [], onChange, defaultCondition }) {
  const items = variants && variants.length > 0 ? variants : [
    { sku: "", size: "", color: "", condition: defaultCondition || "good", price: "", salePrice: "", stock: 1, isActive: true },
  ]

  const updateItem = (index, key, val) => {
    const updated = items.map((item, i) => (i === index ? { ...item, [key]: val } : item))
    onChange(updated)
  }

  const addVariant = () => {
    const nextNum = items.length + 1
    const baseSku = items[0]?.sku ? String(items[0].sku).replace(/-\d+$/, "") : "TSW"
    onChange([
      ...items,
      {
        sku: `${baseSku}-${nextNum}`,
        size: "",
        color: items[0]?.color || "",
        condition: defaultCondition || "good",
        price: items[0]?.price || "",
        salePrice: "",
        stock: 1,
        isActive: true,
      },
    ])
  }

  const removeVariant = (index) => {
    if (items.length <= 1) return
    onChange(items.filter((_, i) => i !== index))
  }

  const conditionOptions = ["new", "like_new", "excellent", "good", "fair"]

  return (
    <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Product Variants ({items.length})
          </h4>
          <p className="text-xs text-muted-foreground">
            Configure sizes, condition grading, individual prices, and stock
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addVariant}>
          <Plus className="mr-1 size-3" />
          Add Variant
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((v, index) => (
          <div
            key={v._id || index}
            className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 items-end border border-border/70 rounded-md p-2.5 bg-background shadow-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-medium">SKU *</Label>
              <Input
                className="h-8 text-xs font-mono uppercase"
                value={v.sku || ""}
                placeholder="SKU-01"
                onChange={(e) => updateItem(index, "sku", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Size</Label>
              <Input
                className="h-8 text-xs"
                value={v.size || ""}
                placeholder="e.g. 42 / 9US"
                onChange={(e) => updateItem(index, "size", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Condition *</Label>
              <Select
                value={v.condition || "good"}
                onValueChange={(val) => updateItem(index, "condition", val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditionOptions.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {humanize(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Price *</Label>
              <Input
                type="number"
                min="0"
                className="h-8 text-xs"
                value={v.price ?? ""}
                placeholder="0"
                onChange={(e) => updateItem(index, "price", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Sale Price</Label>
              <Input
                type="number"
                min="0"
                className="h-8 text-xs"
                value={v.salePrice ?? ""}
                placeholder="Optional"
                onChange={(e) => updateItem(index, "salePrice", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Stock *</Label>
              <Input
                type="number"
                min="0"
                className="h-8 text-xs"
                value={v.stock ?? 1}
                placeholder="1"
                onChange={(e) => updateItem(index, "stock", e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-end pb-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                disabled={items.length <= 1}
                onClick={() => removeVariant(index)}
                title="Delete variant"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FieldControl({ field, value, onChange, categories = [] }) {
  const id = `field-${field.name}`

  if (field.type === "variants") {
    return (
      <VariantListEditor
        variants={value}
        defaultCondition="good"
        onChange={onChange}
      />
    )
  }

  if (field.type === "textarea") {
    return (
      <Textarea
        id={id}
        value={value || ""}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      />
    )
  }

  if (field.type === "switch") {
    return (
      <div className="flex h-9 items-center gap-3">
        <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} />
        <span className="text-sm text-muted-foreground">{value ? "Enabled" : "Disabled"}</span>
      </div>
    )
  }

  if (field.type === "select") {
    return (
      <Select value={valueForSelect(value)} onValueChange={(next) => onChange(valueFromSelect(next))}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {!field.required && <SelectItem value={NONE_VALUE}>Not set</SelectItem>}
          {(field.options || []).map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (field.type === "category") {
    return (
      <Select value={valueForSelect(value)} onValueChange={(next) => onChange(valueFromSelect(next))}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {field.allowNone && <SelectItem value={NONE_VALUE}>No parent</SelectItem>}
          {categories.map((category) => (
            <SelectItem key={category._id} value={category._id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (field.type === "image" || field.name === "imageUrl" || field.name === "image") {
    return (
      <ImageUpload
        value={value || ""}
        onChange={onChange}
        folder="site"
        label={field.label}
      />
    )
  }

  return (
    <Input
      id={id}
      type={field.type || "text"}
      value={value || ""}
      placeholder={field.placeholder}
      min={field.type === "number" ? 0 : undefined}
      onChange={(event) => onChange(event.target.value)}
      required={field.required}
    />
  )
}

function FilterSelect({ filter, value, onChange }) {
  return (
    <Select value={value || ALL_VALUE} onValueChange={(next) => onChange(next === ALL_VALUE ? "" : next)}>
      <SelectTrigger className="w-full sm:w-44">
        <SelectValue placeholder={filter.label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>All {filter.label.toLowerCase()}</SelectItem>
        {filter.options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function RecordFormDialog({
  config,
  categories,
  form,
  mode,
  open,
  selected,
  setForm,
  onClose,
  onSubmit,
  pending,
  error,
}) {
  const fields = config.fields?.filter((field) => !(field.createOnly && mode === "edit")) || []

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? `Add ${config.singular}` : `Edit ${config.singular}`}</DialogTitle>
          <DialogDescription>
            Fields match the backend schema for {config.label.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.name}
                className={field.type === "textarea" || field.type === "variants" ? "space-y-2 md:col-span-2" : "space-y-2"}
              >
                <Label htmlFor={`field-${field.name}`}>
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </Label>
                <FieldControl
                  field={field}
                  value={form[field.name]}
                  categories={categories}
                  onChange={(value) => setForm((current) => ({ ...current, [field.name]: value }))}
                />
              </div>
            ))}
          </div>
          {selected?.isDeleted && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This record is currently soft deleted. Restore it before expecting it to appear publicly.
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ActionDialog({ actionState, categories, onClose, onSubmit, pending, error }) {
  const { action, form } = actionState || {}
  const fields = action?.fields || []

  return (
    <Dialog open={Boolean(actionState)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{action?.label}</DialogTitle>
          <DialogDescription>Confirm the backend action and provide any required fields.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit}>
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={`action-${field.name}`}>
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>
              <FieldControl
                field={{ ...field, name: `action-${field.name}` }}
                value={form[field.name]}
                categories={categories}
                onChange={(value) =>
                  actionState.setForm((current) => ({
                    ...current,
                    form: { ...current.form, [field.name]: value },
                  }))
                }
              />
            </div>
          ))}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function OrderDetailsDialog({
  order,
  open,
  onClose,
  onFulfillTransition,
  pending,
  error,
}) {
  const [courierName, setCourierName] = useState("trax")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")
  const [showShipForm, setShowShipForm] = useState(false)

  if (!order) return null

  const items = order.items || []
  const shipping = order.shippingAddress || {}
  const customer = order.customerSnapshot || order.user || {}
  const totals = order.totals || {}
  const status = order.orderStatus

  const handleShipSubmit = (e) => {
    e.preventDefault()
    onFulfillTransition(order, "shipped", { courierName, trackingNumber, trackingUrl })
    setShowShipForm(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-xl">
                Order {order.orderNumber}
              </DialogTitle>
              <DialogDescription>
                Placed on {formatDate(order.createdAt)} · Order ID: {order._id}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge value={order.orderStatus} />
              <StatusBadge value={order.payment?.status} />
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Fulfillment Stage Transitions */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fulfillment Stage Pipeline
            </span>
            <span className="text-xs text-muted-foreground">
              Current: <strong className="text-foreground capitalize">{humanize(order.orderStatus)}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(status === "placed" || status === "pending") && (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => onFulfillTransition(order, "confirmed")}
              >
                Confirm Order
              </Button>
            )}

            {(status === "confirmed" || status === "processing" || status === "packed") && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => setShowShipForm(!showShipForm)}
                >
                  Mark Shipped...
                </Button>
                {status === "confirmed" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => onFulfillTransition(order, "processing")}
                  >
                    Set Processing
                  </Button>
                )}
                {(status === "confirmed" || status === "processing") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => onFulfillTransition(order, "packed")}
                  >
                    Set Packed
                  </Button>
                )}
              </>
            )}

            {status === "shipped" && (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => onFulfillTransition(order, "delivered")}
              >
                Mark Delivered
              </Button>
            )}

            {status !== "delivered" && status !== "cancelled" && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() =>
                  onFulfillTransition(order, "cancelled", {
                    reason: "Cancelled by admin via inspection dialog",
                  })
                }
              >
                Cancel Order
              </Button>
            )}
          </div>

          {showShipForm && (
            <form onSubmit={handleShipSubmit} className="mt-3 p-3 bg-background rounded-md border space-y-3">
              <h5 className="text-xs font-semibold text-foreground">Dispatch Details (Courier & Tracking)</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Courier *</Label>
                  <Select value={courierName} onValueChange={setCourierName}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(courierNames || []).map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {humanize(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tracking Number *</Label>
                  <Input
                    className="h-8 text-xs"
                    value={trackingNumber}
                    placeholder="e.g. TRK-123456"
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tracking URL</Label>
                  <Input
                    className="h-8 text-xs"
                    type="url"
                    value={trackingUrl}
                    placeholder="https://..."
                    onChange={(e) => setTrackingUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowShipForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending || !trackingNumber}>
                  {pending && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                  Dispatch Shipment
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Ordered Product Items with Images & Variants */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Order Items ({items.length})</h4>
          <div className="space-y-2 rounded-lg border border-border p-3">
            {items.map((item, index) => (
              <div
                key={item._id || index}
                className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0 border-border/50"
              >
                <div className="flex items-center gap-3">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="size-14 rounded-md object-cover border border-border"
                    />
                  ) : (
                    <div className="size-14 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground border">
                      No img
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.productName}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>SKU: {item.sku}</span>
                      {item.size && (
                        <span>
                          · Size: <strong className="text-foreground">{item.size}</strong>
                        </span>
                      )}
                      {item.color && <span>· Color: {item.color}</span>}
                      {item.condition && (
                        <span>
                          · <StatusBadge value={item.condition} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-foreground">
                    {formatCurrency(item.finalPrice || item.regularPrice)} × {item.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Subtotal: {formatCurrency((item.finalPrice || item.regularPrice) * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
            {!items.length && (
              <p className="text-sm text-muted-foreground text-center py-4">No items found in this order.</p>
            )}
          </div>
        </div>

        {/* Customer & Shipping Address */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Customer Contact
            </h4>
            <div className="text-sm space-y-1">
              <p className="font-medium text-foreground">
                {customer.fullName || customer.displayName || "Customer"}
              </p>
              <p className="text-muted-foreground">{customer.email || "No email"}</p>
              <p className="text-muted-foreground">
                Phone: {customer.phone || shipping.phone || "Not set"}
              </p>
            </div>
            {order.customerNotes && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground">Customer Notes:</p>
                <p className="text-xs text-foreground mt-0.5">{order.customerNotes}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Shipping Destination
            </h4>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p className="font-medium text-foreground">{shipping.fullName || customer.fullName}</p>
              <p>{shipping.addressLine1}</p>
              {shipping.addressLine2 && <p>{shipping.addressLine2}</p>}
              <p>
                {[shipping.area, shipping.city, shipping.province].filter(Boolean).join(", ")}
              </p>
              <p>
                {[shipping.postalCode, shipping.country || "Pakistan"].filter(Boolean).join(", ")}
              </p>
              {shipping.landmark && (
                <p className="text-xs italic text-muted-foreground">Landmark: {shipping.landmark}</p>
              )}
            </div>
          </div>
        </div>

        {/* Courier Tracking Status */}
        {order.shipping?.trackingNumber && (
          <div className="rounded-lg border border-border p-3 bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Courier Tracking: </span>
              <strong className="capitalize">{order.shipping.courierName}</strong> — <code>{order.shipping.trackingNumber}</code>
            </div>
            {order.shipping.trackingUrl && (
              <a
                href={order.shipping.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline flex items-center gap-1"
              >
                Track on Courier Site
              </a>
            )}
          </div>
        )}

        {/* Financial Breakdown */}
        <div className="rounded-lg border border-border p-3 bg-muted/10 space-y-2 text-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Financial Breakdown
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Items Subtotal</span>
              <span>{formatCurrency(totals.subtotal, totals.currency)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping Fee</span>
              <span>{formatCurrency(totals.shippingFee || totals.shipping || 0, totals.currency)}</span>
            </div>
            {(totals.couponDiscount || totals.discount) > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Coupon Discount</span>
                <span>-{formatCurrency(totals.couponDiscount || totals.discount, totals.currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-foreground pt-1 border-t border-border">
              <span>Grand Total</span>
              <span>{formatCurrency(totals.grandTotal, totals.currency)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PaymentProofDialog({
  payment,
  open,
  onClose,
  onVerify,
  onReject,
  onMarkPaid,
  pending,
  error,
}) {
  const [rejectReason, setRejectReason] = useState("")
  const [notes, setNotes] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)

  if (!payment) return null

  const proofUrl = payment.proofs?.[0]?.url
  const txId =
    payment.mobileWallet?.transactionId ||
    payment.bankTransfer?.transactionId ||
    payment.transactionId ||
    "Not provided"

  const senderName =
    payment.mobileWallet?.senderName ||
    payment.bankTransfer?.senderAccountTitle ||
    "N/A"

  const senderPhoneOrAcc =
    payment.mobileWallet?.senderPhone ||
    payment.bankTransfer?.senderAccountNumber ||
    "N/A"

  const providerOrBank =
    payment.mobileWallet?.provider ||
    payment.bankTransfer?.senderBankName ||
    payment.bankTransfer?.bankName ||
    payment.method

  const handleVerifySubmit = () => {
    onVerify(payment, { notes: notes || "Verified by admin" })
  }

  const handleRejectSubmit = (e) => {
    e.preventDefault()
    onReject(payment, { reason: rejectReason, notes })
    setShowRejectForm(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl">
              Payment {payment.paymentNumber}
            </DialogTitle>
            <StatusBadge value={payment.status} />
          </div>
          <DialogDescription>
            Order: {payment.order?.orderNumber || shortId(payment.order)} · Date: {formatDate(payment.createdAt)}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Transaction Details Card */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border border-border p-3 bg-muted/20 text-sm">
          <div>
            <span className="text-xs text-muted-foreground block">Amount</span>
            <span className="text-base font-bold text-foreground">
              {formatCurrency(payment.amount, payment.currency)}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Method</span>
            <span className="font-semibold text-foreground uppercase">
              {humanize(payment.method)}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Verification</span>
            <StatusBadge value={payment.verification?.status || "pending"} />
          </div>
          <div className="col-span-2 sm:col-span-3 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground block">Transaction ID / Reference</span>
            <code className="text-xs font-mono font-semibold text-primary bg-background px-2 py-0.5 rounded border border-border">
              {txId}
            </code>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Sender</span>
            <span className="text-foreground">{senderName}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Account / Phone</span>
            <span className="text-foreground">{senderPhoneOrAcc}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Bank / Provider</span>
            <span className="text-foreground capitalize">{humanize(providerOrBank)}</span>
          </div>
        </div>

        {/* Customer Receipt Proof Image */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Customer Uploaded Receipt Screenshot
          </Label>
          {proofUrl ? (
            <div className="rounded-lg border border-border p-2 bg-muted/10 flex flex-col items-center">
              <img
                src={proofUrl}
                alt="Payment receipt proof"
                className="max-h-80 w-auto rounded object-contain border border-border shadow-xs"
              />
              <a
                href={proofUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 text-xs text-primary underline"
              >
                Open original receipt image in new window
              </a>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No receipt screenshot uploaded for this payment.
            </div>
          )}
        </div>

        {/* Review Notes Input */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Verification Review Notes</Label>
          <Input
            className="text-xs h-8"
            placeholder="Add internal verification note (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Rejection Form */}
        {showRejectForm && (
          <form onSubmit={handleRejectSubmit} className="p-3 bg-red-50/50 rounded-md border border-red-200 space-y-2">
            <h5 className="text-xs font-semibold text-red-800">Reject Payment Reason</h5>
            <Input
              className="text-xs h-8"
              placeholder="e.g. Invalid receipt or transaction ID not found..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowRejectForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" size="sm" disabled={pending || !rejectReason}>
                Confirm Rejection
              </Button>
            </div>
          </form>
        )}

        {/* Verification Action Controls */}
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {!showRejectForm && payment.status !== "verified" && payment.status !== "paid" && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => setShowRejectForm(true)}
              >
                Reject Payment
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {payment.status !== "paid" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => onMarkPaid(payment)}
              >
                Mark Paid
              </Button>
            )}
            {payment.status !== "verified" && (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={handleVerifySubmit}
              >
                {pending && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                Verify Payment
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ResourcePage({ resource }) {
  const config = RESOURCE_CONFIG[resource]
  const dispatch = useDispatch()
  const resourceState = useSelector((state) => state.admin.resources[resource])
  const categories = useSelector((state) => state.admin.resources.categories.items)
  const mutation = useSelector((state) => state.admin.mutation)
  const currentUser = useSelector((state) => state.auth.user)
  const [params, setParams] = useState(config.defaultParams || { page: 1, limit: 20 })
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState("create")
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({})
  const [formError, setFormError] = useState(null)
  const [actionState, setActionState] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [inspectingOrder, setInspectingOrder] = useState(null)
  const [inspectingPayment, setInspectingPayment] = useState(null)

  const pending = mutation.status === "loading"

  const handleOrderTransition = async (order, targetStatus, extraValues = {}) => {
    setActionError(null)
    try {
      await dispatch(
        runRecordAction({
          resource: "orders",
          endpoint: `/orders/${order._id}/status`,
          method: "PATCH",
          body: { status: targetStatus, ...extraValues },
        }),
      ).unwrap()
      refresh()
      setInspectingOrder((curr) =>
        curr && curr._id === order._id
          ? {
              ...curr,
              orderStatus: targetStatus,
              ...(targetStatus === "shipped"
                ? {
                    shipping: {
                      ...curr.shipping,
                      courierName: extraValues.courierName,
                      trackingNumber: extraValues.trackingNumber,
                      trackingUrl: extraValues.trackingUrl,
                    },
                  }
                : {}),
            }
          : null,
      )
    } catch (error) {
      setActionError(error.message)
    }
  }

  const handlePaymentVerify = async (payment, values = {}) => {
    setActionError(null)
    try {
      await dispatch(
        runRecordAction({
          resource: "payments",
          endpoint: `/payments/${payment._id}/verify`,
          method: "PATCH",
          body: values,
        }),
      ).unwrap()
      refresh()
      setInspectingPayment((curr) =>
        curr && curr._id === payment._id
          ? {
              ...curr,
              status: "verified",
              verification: { status: "verified", ...values },
            }
          : null,
      )
    } catch (error) {
      setActionError(error.message)
    }
  }

  const handlePaymentReject = async (payment, values = {}) => {
    setActionError(null)
    try {
      await dispatch(
        runRecordAction({
          resource: "payments",
          endpoint: `/payments/${payment._id}/reject`,
          method: "PATCH",
          body: values,
        }),
      ).unwrap()
      refresh()
      setInspectingPayment((curr) =>
        curr && curr._id === payment._id
          ? {
              ...curr,
              status: "cancelled",
              verification: { status: "rejected", ...values },
            }
          : null,
      )
    } catch (error) {
      setActionError(error.message)
    }
  }

  const handlePaymentMarkPaid = async (payment) => {
    setActionError(null)
    try {
      await dispatch(
        runRecordAction({
          resource: "payments",
          endpoint: `/payments/${payment._id}/paid`,
          method: "PATCH",
          body: {},
        }),
      ).unwrap()
      refresh()
      setInspectingPayment((curr) =>
        curr && curr._id === payment._id
          ? {
              ...curr,
              status: "paid",
            }
          : null,
      )
    } catch (error) {
      setActionError(error.message)
    }
  }

  const listParams = useMemo(() => {
    const next = { ...params }
    if (search && !config.searchDisabled) next.search = search
    return next
  }, [config.searchDisabled, params, search])

  useEffect(() => {
    dispatch(fetchResource({ resource, params: listParams }))
  }, [dispatch, listParams, resource])

  useEffect(() => {
    if (config.requiresCategories && resource !== "categories") {
      dispatch(fetchResource({ resource: "categories", params: { limit: 100, includeDeleted: "false" } }))
    }
  }, [config.requiresCategories, dispatch, resource])

  const openCreate = () => {
    setFormMode("create")
    setSelected(null)
    setForm(getInitialFormValues(config.fields || []))
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (item) => {
    setFormMode("edit")
    setSelected(item)
    setForm(getInitialFormValues(config.fields || [], item))
    setFormError(null)
    setFormOpen(true)
  }

  const refresh = () => dispatch(fetchResource({ resource, params: listParams }))

  const submitForm = async (event) => {
    event.preventDefault()
    setFormError(null)

    try {
      const payload = config.buildPayload(form, formMode, selected)
      if (formMode === "create") {
        await dispatch(createRecord({ resource, body: payload })).unwrap()
      } else {
        await dispatch(updateRecord({ resource, id: selected._id, body: payload })).unwrap()
      }
      setFormOpen(false)
      refresh()
    } catch (error) {
      setFormError(error.message)
    }
  }

  const removeRecord = async (item) => {
    try {
      await dispatch(deleteRecord({ resource, id: item._id })).unwrap()
      refresh()
    } catch (error) {
      setActionError(error.message)
    }
  }

  const restoreRecord = async (item) => {
    try {
      await dispatch(
        runRecordAction({
          resource,
          endpoint: `${config.endpoint}/${item._id}/restore`,
          body: {},
        }),
      ).unwrap()
      refresh()
    } catch (error) {
      setActionError(error.message)
    }
  }

  const runActionNow = async (item, action, values = {}) => {
    const baseBody = action.body ? action.body(item) : {}
    try {
      await dispatch(
        runRecordAction({
          resource,
          endpoint: action.endpoint(item),
          method: action.method || "PATCH",
          body: { ...baseBody, ...values },
        }),
      ).unwrap()
      setActionState(null)
      refresh()
    } catch (error) {
      setActionError(error.message)
    }
  }

  const startAction = (item, action) => {
    setActionError(null)
    if (!action.fields?.length) {
      runActionNow(item, action)
      return
    }

    setActionState({
      item,
      action,
      form: getInitialFormValues(action.fields),
      setForm: setActionState,
    })
  }

  const submitAction = (event) => {
    event.preventDefault()
    if (!actionState) return
    runActionNow(actionState.item, actionState.action, actionState.form)
  }

  const changePage = (direction) => {
    setParams((current) => ({
      ...current,
      page: Math.max(1, Number(current.page || 1) + direction),
    }))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{config.label}</CardTitle>
              <CardDescription>
                Connected to <code className="rounded bg-muted px-1 py-0.5">{config.endpoint}</code>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={refresh}>
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              {config.canCreate !== false && (
                <Button type="button" onClick={openCreate}>
                  <Plus className="size-4" />
                  Add {config.singular}
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            {!config.searchDisabled && (
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  placeholder={config.searchPlaceholder || "Search..."}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setParams((current) => ({ ...current, page: 1 }))
                  }}
                />
              </div>
            )}
            <div className="flex flex-1 flex-wrap gap-2">
              {(config.filters || []).map((filter) => (
                <FilterSelect
                  key={filter.name}
                  filter={filter}
                  value={params[filter.name] || ""}
                  onChange={(value) =>
                    setParams((current) => ({
                      ...current,
                      page: 1,
                      [filter.name]: value,
                    }))
                  }
                />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {actionError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                {config.columns.map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resourceState.status === "loading" && !resourceState.items.length && (
                <TableRow>
                  <TableCell colSpan={config.columns.length + 1} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline size-4 animate-spin" />
                    Loading {config.label.toLowerCase()}
                  </TableCell>
                </TableRow>
              )}
              {resourceState.items.map((item) => (
                <TableRow key={item._id} className={item.isDeleted ? "bg-red-50/40" : undefined}>
                  {config.columns.map((column) => {
                    if (resource === "orders" && column.key === "order") {
                      return (
                        <TableCell key={column.key} className="font-medium">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline cursor-pointer"
                            onClick={() => setInspectingOrder(item)}
                            title="Inspect order details"
                          >
                            <Eye className="size-3.5 text-muted-foreground" />
                            {column.value(item)}
                          </button>
                        </TableCell>
                      )
                    }

                    if (resource === "payments" && column.key === "proof") {
                      return (
                        <TableCell key={column.key}>
                          {item.proofs?.length ? (
                            <button
                              type="button"
                              className="cursor-pointer inline-flex items-center gap-1 font-medium"
                              onClick={() => setInspectingPayment(item)}
                              title="View uploaded receipt proof"
                            >
                              <StatusBadge value="uploaded" />
                              <ExternalLink className="size-3 text-muted-foreground" />
                            </button>
                          ) : (
                            <StatusBadge value="none" />
                          )}
                        </TableCell>
                      )
                    }

                    return (
                      <TableCell
                        key={column.key}
                        className={
                          column.key === "name" || column.key === "title"
                            ? "font-medium"
                            : undefined
                        }
                      >
                        {column.badge ? (
                          <StatusBadge value={column.value(item)} />
                        ) : (
                          column.value(item)
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {resource === "orders" && (
                          <DropdownMenuItem onClick={() => setInspectingOrder(item)}>
                            <Eye className="size-4" />
                            Inspect Details
                          </DropdownMenuItem>
                        )}
                        {resource === "payments" && (
                          <DropdownMenuItem onClick={() => setInspectingPayment(item)}>
                            <FileText className="size-4" />
                            View Proof & Verify
                          </DropdownMenuItem>
                        )}
                        {config.canEdit !== false && (
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {item.isDeleted ? (
                          <DropdownMenuItem onClick={() => restoreRecord(item)}>
                            <RotateCcw className="size-4" />
                            Restore
                          </DropdownMenuItem>
                        ) : (
                          config.canDelete !== false && (
                            <DropdownMenuItem variant="destructive" onClick={() => removeRecord(item)}>
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          )
                        )}
                        {!!config.actions?.length && <DropdownMenuSeparator />}
                        {(config.actions || [])
                          .filter((action) => !action.superAdminOnly || currentUser?.role === "superAdmin")
                          .map((action) => (
                          <DropdownMenuItem key={action.label} onClick={() => startAction(item, action)}>
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!resourceState.items.length && resourceState.status !== "loading" && (
                <TableRow>
                  <TableCell colSpan={config.columns.length + 1} className="h-32 text-center text-muted-foreground">
                    No {config.label.toLowerCase()} found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {resourceState.meta?.page || params.page || 1} of {resourceState.meta?.pages || 1}
              {resourceState.meta?.total !== undefined && ` · ${resourceState.meta.total} records`}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!resourceState.meta?.hasPrevPage}
                onClick={() => changePage(-1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!resourceState.meta?.hasNextPage}
                onClick={() => changePage(1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {config.fields && (
        <RecordFormDialog
          config={config}
          categories={categories}
          form={form}
          mode={formMode}
          open={formOpen}
          selected={selected}
          setForm={setForm}
          onClose={() => setFormOpen(false)}
          onSubmit={submitForm}
          pending={pending}
          error={formError}
        />
      )}

      <ActionDialog
        actionState={actionState}
        categories={categories}
        onClose={() => setActionState(null)}
        onSubmit={submitAction}
        pending={pending}
        error={actionError}
      />

      <OrderDetailsDialog
        order={inspectingOrder}
        open={Boolean(inspectingOrder)}
        onClose={() => setInspectingOrder(null)}
        onFulfillTransition={handleOrderTransition}
        pending={pending}
        error={actionError}
      />

      <PaymentProofDialog
        payment={inspectingPayment}
        open={Boolean(inspectingPayment)}
        onClose={() => setInspectingPayment(null)}
        onVerify={handlePaymentVerify}
        onReject={handlePaymentReject}
        onMarkPaid={handlePaymentMarkPaid}
        pending={pending}
        error={actionError}
      />
    </div>
  )
}
