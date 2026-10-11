/**
 * Order & Fulfillment Configuration Constants
 */

export const ORDER_STATUSES = [
  { value: "placed", label: "Placed", variant: "warning", step: 1 },
  { value: "confirmed", label: "Confirmed", variant: "warning", step: 2 },
  { value: "processing", label: "Processing", variant: "warning", step: 2 },
  { value: "packed", label: "Packed", variant: "warning", step: 3 },
  { value: "shipped", label: "Shipped", variant: "warning", step: 4 },
  { value: "delivered", label: "Delivered", variant: "success", step: 5 },
  { value: "cancelled", label: "Cancelled", variant: "destructive", step: -1 },
]

export const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending", variant: "warning" },
  { value: "awaiting_verification", label: "Awaiting Verification", variant: "warning" },
  { value: "verified", label: "Verified", variant: "success" },
  { value: "paid", label: "Paid", variant: "success" },
  { value: "failed", label: "Failed", variant: "destructive" },
  { value: "cancelled", label: "Cancelled", variant: "destructive" },
]

export const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery (COD)" },
  { value: "advance_cod", label: "Advance COD" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "sadapay", label: "SadaPay" },
  { value: "card", label: "Credit/Debit Card" },
  { value: "wallet", label: "Digital Wallet" },
  { value: "manual", label: "Manual" },
]

export const COURIER_OPTIONS = [
  { value: "trax", label: "Trax Logistics" },
  { value: "leopards", label: "Leopards Courier" },
  { value: "tcs", label: "TCS Express" },
  { value: "postex", label: "PostEx" },
  { value: "mnp", label: "M&P Express" },
  { value: "blue_ex", label: "Blue-Ex" },
  { value: "bykea", label: "Bykea Delivery" },
  { value: "self_delivery", label: "Self / Store Rider" },
  { value: "other", label: "Other Courier" },
]

export const ALLOWED_TRANSITIONS = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["processing", "packed", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
}

export const CANCELLATION_REASONS = [
  "Customer requested cancellation",
  "Out of stock / Damaged thrift item",
  "Suspected fraudulent order",
  "Customer unresponsive to confirmation call",
  "Delivery address invalid / outside coverage",
  "Duplicate order placed",
  "Other administrative reason",
]
