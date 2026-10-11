import * as React from "react"
import {
  Banknote,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileQuestion,
  Flame,
  Landmark,
  Layers,
  Loader2,
  RotateCw,
  Smartphone,
  Wallet,
  XCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import { useSelector } from "react-redux"
import { apiRequest } from "../lib/api"
import { ImageUpload } from "./common/ImageUpload"
import { formatCurrency, formatDate } from "../lib/format"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import StatusBadge from "./StatusBadge"
import { cn } from "../lib/utils"

const METHOD_CONFIG = {
  bank_transfer: {
    label: "Bank Transfer",
    icon: Landmark,
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300",
  },
  easypaisa: {
    label: "EasyPaisa",
    icon: Smartphone,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  jazzcash: {
    label: "JazzCash",
    icon: Flame,
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300",
  },
  sadapay: {
    label: "SadaPay",
    icon: CreditCard,
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/40 dark:text-cyan-300",
  },
  cod: {
    label: "Cash on Delivery",
    icon: Banknote,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300",
  },
  advance_cod: {
    label: "Advance COD",
    icon: Layers,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300",
  },
  card: {
    label: "Credit / Debit Card",
    icon: CreditCard,
    className:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-300",
  },
  wallet: {
    label: "Thrift Wallet",
    icon: Wallet,
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  },
  manual: {
    label: "Manual Payment",
    icon: Landmark,
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  },
}

export function PaymentMethodBadge({ method, className }) {
  const config = METHOD_CONFIG[method] || {
    label: method || "Unknown",
    icon: Landmark,
    className: "border-border bg-muted text-muted-foreground",
  }
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn("inline-flex items-center gap-1.5 font-medium px-2 py-0.5", config.className, className)}
    >
      <Icon className="size-3 shrink-0" />
      <span>{config.label}</span>
    </Badge>
  )
}

const REJECTION_REASONS = [
  "Transaction ID / Reference not found in account statement",
  "Receipt screenshot is blurred, unreadable, or cropped",
  "Transferred amount does not match payable total",
  "Duplicate receipt submission or already verified",
  "Funds sent to incorrect receiver account",
  "Other / Suspicious transaction proof",
]

export function PaymentProofModal({
  payment,
  open,
  onClose,
  onApprove,
  onReject,
  onVerifyOnly,
  onProofUpdated,
  pending = false,
}) {
  const token = useSelector((state) => state.auth?.token)
  const [attachingProof, setAttachingProof] = React.useState(false)
  // Zoom & transform state
  const [zoom, setZoom] = React.useState(100)
  const [rotation, setRotation] = React.useState(0)
  const [selectedProofIndex, setSelectedProofIndex] = React.useState(0)

  // Rejection prompt state
  const [showRejectDialog, setShowRejectDialog] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState(REJECTION_REASONS[0])
  const [customRejectReason, setCustomRejectReason] = React.useState("")
  const [rejectNote, setRejectNote] = React.useState("")

  // Approval prompt state
  const [showApproveDialog, setShowApproveDialog] = React.useState(false)
  const [approvalNote, setApprovalNote] = React.useState("")

  // Reset transforms whenever modal opens for a new payment
  React.useEffect(() => {
    if (open) {
      setZoom(100)
      setRotation(0)
      setSelectedProofIndex(0)
    }
  }, [open, payment?._id])

  if (!payment) return null

  const proofs = payment.proofs || []
  const currentProof = proofs[selectedProofIndex] || proofs[0]
  const proofUrl = currentProof?.url

  const txId =
    payment.mobileWallet?.transactionId ||
    payment.bankTransfer?.transactionId ||
    payment.transactionId ||
    currentProof?.transactionId ||
    "N/A"

  const senderName =
    payment.mobileWallet?.senderName ||
    payment.bankTransfer?.senderAccountTitle ||
    payment.user?.displayName ||
    "N/A"

  const senderPhoneOrAcc =
    payment.mobileWallet?.senderPhone ||
    payment.bankTransfer?.senderAccountNumber ||
    payment.user?.primaryPhone ||
    "N/A"

  const receiverTitle =
    payment.mobileWallet?.receiverAccountTitle ||
    payment.bankTransfer?.accountTitle ||
    "Thrift Shoe Wear"

  const receiverAcc =
    payment.mobileWallet?.receiverAccountNumber ||
    payment.bankTransfer?.accountNumber ||
    payment.bankTransfer?.iban ||
    "Official Store Account"

  const copyToClipboard = (text, label) => {
    if (!text || text === "N/A") return
    navigator.clipboard?.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleZoomIn = () => setZoom((z) => Math.min(300, z + 25))
  const handleZoomOut = () => setZoom((z) => Math.max(50, z - 25))
  const handleResetZoom = () => {
    setZoom(100)
    setRotation(0)
  }
  const handleRotate = () => setRotation((r) => (r + 90) % 360)

  const handleConfirmReject = () => {
    const finalReason =
      rejectReason === "Other / Suspicious transaction proof" && customRejectReason.trim()
        ? customRejectReason.trim()
        : rejectReason

    onReject(payment, { reason: finalReason, notes: rejectNote })
    setShowRejectDialog(false)
  }

  const handleConfirmApprove = () => {
    onApprove(payment, { note: approvalNote })
    setShowApproveDialog(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-4 pb-3 border-b bg-muted/20">
            <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>Payment {payment.paymentNumber}</span>
                  <PaymentMethodBadge method={payment.method} />
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Order:{" "}
                  <strong className="text-foreground font-mono">
                    {payment.order?.orderNumber || payment.order}
                  </strong>{" "}
                  · Created: {formatDate(payment.createdAt)}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value={payment.status} />
                <StatusBadge value={payment.verification?.status || "pending"} />
              </div>
            </div>
          </DialogHeader>

          {/* Body: Two-Column Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
            {/* Left Column: Zoomable Receipt Proof Viewer (7 cols) */}
            <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-border bg-muted/10 p-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Receipt Proof Viewer
                  </span>
                  {proofs.length > 1 && (
                    <span className="text-xs text-muted-foreground font-mono">
                      ({selectedProofIndex + 1}/{proofs.length})
                    </span>
                  )}
                </div>

                {proofUrl && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={handleZoomOut}
                      disabled={zoom <= 50}
                      title="Zoom Out"
                    >
                      <ZoomOut className="size-3.5" />
                    </Button>
                    <span className="text-xs font-mono font-medium px-1.5 text-muted-foreground">
                      {zoom}%
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={handleZoomIn}
                      disabled={zoom >= 300}
                      title="Zoom In"
                    >
                      <ZoomIn className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={handleRotate}
                      title="Rotate 90° Clockwise"
                    >
                      <RotateCw className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={handleResetZoom}
                      title="Reset View"
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex size-7 items-center justify-center rounded-md border border-input bg-background hover:bg-accent text-foreground text-xs"
                      title="Open full image in new tab"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Viewport */}
              <div className="flex-1 min-h-[380px] max-h-[500px] overflow-auto flex items-center justify-center rounded-lg border border-border/80 bg-background/50 my-3 p-2 relative">
                {proofUrl ? (
                  <div
                    className="transition-transform duration-150 ease-out flex items-center justify-center"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transformOrigin: "center center",
                    }}
                  >
                    <img
                      src={proofUrl}
                      alt={`Payment proof ${selectedProofIndex + 1}`}
                      className="max-w-full max-h-[460px] object-contain rounded shadow-xs select-none"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 text-muted-foreground w-full max-w-sm">
                    <FileQuestion className="size-10 stroke-1 text-muted-foreground/70" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">No Receipt Screenshot Uploaded</p>
                      <p className="text-xs">
                        Customer placed this order without uploading a receipt. Attach the transfer screenshot below to persist it to Cloudflare R2.
                      </p>
                    </div>
                    <div className="w-full text-left pt-1">
                      <ImageUpload
                        folder="payments"
                        label="Attach Receipt"
                        onChange={async (uploadedUrl) => {
                          if (!uploadedUrl) return
                          try {
                            await apiRequest(`/payments/${payment._id}/proofs`, {
                              method: "POST",
                              token,
                              body: { url: uploadedUrl },
                            })
                            toast.success("Payment receipt uploaded and attached successfully")
                            onProofUpdated?.()
                          } catch (err) {
                            toast.error(err.message || "Failed to attach receipt")
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Multiple proofs thumbnails carousel */}
              {proofs.length > 1 && (
                <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                  {proofs.map((p, idx) => (
                    <button
                      key={p._id || idx}
                      type="button"
                      onClick={() => setSelectedProofIndex(idx)}
                      className={`relative size-12 rounded border overflow-hidden shrink-0 transition-all ${
                        selectedProofIndex === idx
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={p.url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Attach Additional Receipt Option */}
              {proofs.length > 0 && (
                <div className="pt-1">
                  {!attachingProof ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-7.5"
                      onClick={() => setAttachingProof(true)}
                    >
                      + Attach Additional Receipt
                    </Button>
                  ) : (
                    <div className="p-3 border rounded-lg bg-muted/20 space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Upload Additional Receipt</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] px-1.5"
                          onClick={() => setAttachingProof(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                      <ImageUpload
                        folder="payments"
                        onChange={async (uploadedUrl) => {
                          if (!uploadedUrl) return
                          try {
                            await apiRequest(`/payments/${payment._id}/proofs`, {
                              method: "POST",
                              token,
                              body: { url: uploadedUrl },
                            })
                            toast.success("Additional receipt attached successfully")
                            setAttachingProof(false)
                            onProofUpdated?.()
                          } catch (err) {
                            toast.error(err.message || "Failed to attach receipt")
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Transaction & Verification Metadata (5 cols) */}
            <div className="lg:col-span-5 flex flex-col p-4 space-y-4">
              {/* Financial Summary */}
              <div className="rounded-lg border border-border p-3.5 bg-muted/20 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Financial Settlement
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-foreground">
                    {formatCurrency(payment.amount, payment.currency)}
                  </span>
                  <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-background border text-muted-foreground">
                    {payment.currency || "PKR"}
                  </span>
                </div>
                {payment.paymentFee > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span>Processing Fee:</span>
                    <span>{formatCurrency(payment.paymentFee, payment.currency)}</span>
                  </div>
                )}
              </div>

              {/* Transaction ID & References */}
              <div className="space-y-2 rounded-lg border border-border p-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Transaction Reference
                </span>
                <div className="flex items-center justify-between gap-2 p-2 rounded bg-muted/30 border border-border/60">
                  <code className="text-xs font-mono font-bold text-primary truncate">
                    {txId}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground"
                    onClick={() => copyToClipboard(txId, "Transaction ID")}
                    title="Copy Transaction ID"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Sender & Receiver Account Information */}
              <div className="space-y-2.5 rounded-lg border border-border p-3.5 text-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Account Details
                </span>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    <span className="block font-medium text-foreground">Sender Title</span>
                    <span className="truncate block">{senderName}</span>
                  </div>
                  <div>
                    <span className="block font-medium text-foreground">Account / Phone</span>
                    <span className="font-mono truncate block">{senderPhoneOrAcc}</span>
                  </div>
                  {payment.bankTransfer?.senderBankName && (
                    <div className="col-span-2">
                      <span className="block font-medium text-foreground">Sender Bank</span>
                      <span>{payment.bankTransfer.senderBankName}</span>
                    </div>
                  )}
                  <div className="col-span-2 pt-2 border-t border-border/50">
                    <span className="block font-medium text-foreground">Receiver Account</span>
                    <span>
                      {receiverTitle} — <code>{receiverAcc}</code>
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Notes */}
              {payment.customerNotes && (
                <div className="rounded-lg border border-border p-3 bg-muted/10 space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Customer Notes:</span>
                  <p className="text-xs text-foreground italic">&quot;{payment.customerNotes}&quot;</p>
                </div>
              )}

              {/* Verification Audit Trail */}
              {payment.verification?.rejectionReason && (
                <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-950 dark:bg-red-950/20 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-400">
                    <XCircle className="size-3.5" />
                    <span>Rejection Reason</span>
                  </div>
                  <p className="text-red-600 dark:text-red-300">
                    {payment.verification.rejectionReason}
                  </p>
                  {payment.verification.rejectedBy && (
                    <p className="text-[10px] text-muted-foreground pt-1">
                      Rejected by {payment.verification.rejectedBy.displayName || "Admin"} on{" "}
                      {formatDate(payment.verification.rejectedAt)}
                    </p>
                  )}
                </div>
              )}

              {payment.verification?.verifiedBy && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    <span>Verified By Staff</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Verified by {payment.verification.verifiedBy.displayName || "Admin"} on{" "}
                    {formatDate(payment.verification.verifiedAt)}
                  </p>
                  {payment.verification.adminNotes && (
                    <p className="text-xs text-foreground pt-1">
                      Note: {payment.verification.adminNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="p-3.5 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {payment.status !== "failed" && payment.status !== "paid" && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="size-3.5 mr-1.5" />
                  Reject Payment
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>

              {payment.status !== "verified" && payment.status !== "paid" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => onVerifyOnly(payment, { note: "Verified proof" })}
                >
                  {pending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                  Verify Only
                </Button>
              )}

              {payment.status !== "paid" && (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => setShowApproveDialog(true)}
                >
                  {pending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                  <CheckCircle2 className="size-3.5 mr-1.5" />
                  Approve & Mark Paid
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Reject Payment */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
              <XCircle className="size-5" />
              Reject Payment Proof
            </AlertDialogTitle>
            <AlertDialogDescription>
              Rejecting payment <strong>{payment.paymentNumber}</strong> will mark it as failed and
              notify operations. A valid rejection reason is required.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Rejection Reason *</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {rejectReason === "Other / Suspicious transaction proof" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Specify Custom Reason *</Label>
                <Input
                  className="text-xs"
                  placeholder="Detail the discrepancy..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Internal Review Notes (Optional)</Label>
              <Textarea
                className="text-xs"
                placeholder="Additional notes for order history..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                pending ||
                (rejectReason === "Other / Suspicious transaction proof" &&
                  !customRejectReason.trim())
              }
              onClick={handleConfirmReject}
            >
              {pending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Confirm Rejection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog: Approve & Mark Paid */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
              Approve Payment & Mark Paid
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will mark payment <strong>{payment.paymentNumber}</strong> for{" "}
              <strong>{formatCurrency(payment.amount, payment.currency)}</strong> as settled and
              synchronize order <strong>{payment.order?.orderNumber || payment.order}</strong> to paid.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-medium">Verification Note (Optional)</Label>
            <Input
              className="text-xs"
              placeholder="e.g. Bank statement confirmed TXN"
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={handleConfirmApprove}>
              {pending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Confirm Settlement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default PaymentProofModal
