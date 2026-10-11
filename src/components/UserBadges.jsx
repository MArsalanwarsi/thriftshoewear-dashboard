import * as React from "react"
import { CheckCircle2, Clock, Minus, ShieldAlert, ShieldCheck, User, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

/**
 * RoleBadge renders a stylized role tag with icon.
 */
export function RoleBadge({ role }) {
  const normalized = String(role || "customer").toLowerCase()

  if (normalized === "superadmin") {
    return (
      <Badge
        variant="outline"
        className="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/50 dark:text-purple-300 font-semibold gap-1"
      >
        <ShieldAlert className="size-3 text-purple-600 dark:text-purple-400" />
        Super Admin
      </Badge>
    )
  }

  if (normalized === "admin") {
    return (
      <Badge
        variant="outline"
        className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300 font-medium gap-1"
      >
        <ShieldCheck className="size-3 text-blue-600 dark:text-blue-400" />
        Admin
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 gap-1"
    >
      <User className="size-3 text-slate-500" />
      Customer
    </Badge>
  )
}

/**
 * AccessStatusBadge renders dashboard access request progression.
 */
export function AccessStatusBadge({ status }) {
  const normalized = String(status || "none").toLowerCase()

  switch (normalized) {
    case "pending":
      return (
        <Badge variant="warning" className="gap-1 font-medium">
          <Clock className="size-3" />
          Pending Review
        </Badge>
      )
    case "approved":
      return (
        <Badge variant="success" className="gap-1 font-medium">
          <CheckCircle2 className="size-3" />
          Approved
        </Badge>
      )
    case "rejected":
      return (
        <Badge variant="destructive" className="gap-1 font-medium">
          <XCircle className="size-3" />
          Rejected
        </Badge>
      )
    default:
      return (
        <Badge variant="muted" className="gap-1 text-muted-foreground">
          <Minus className="size-3" />
          None
        </Badge>
      )
  }
}
