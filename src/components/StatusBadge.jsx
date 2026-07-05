import { Badge } from "./ui/badge"
import { humanize } from "../lib/format"

const successValues = new Set(["active", "paid", "delivered", "approved", "verified", "succeeded", "featured"])
const warningValues = new Set(["pending", "draft", "processing", "packed", "awaiting_verification", "in_transit", "out_for_delivery"])
const destructiveValues = new Set(["inactive", "blocked", "deleted", "cancelled", "failed", "rejected", "hidden", "archived", "out_of_stock"])

function variantFor(value) {
  const normalized = String(value || "").toLowerCase()
  if (successValues.has(normalized)) return "success"
  if (warningValues.has(normalized)) return "warning"
  if (destructiveValues.has(normalized)) return "destructive"
  return "muted"
}

export default function StatusBadge({ value }) {
  return <Badge variant={variantFor(value)}>{humanize(value)}</Badge>
}
