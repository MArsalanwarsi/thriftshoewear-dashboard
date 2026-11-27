"use client"

import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function MediaUsageNotice({ checking = false, usages = [], error = "" }) {
  if (checking) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin shrink-0 text-primary" />
        <span>Checking whether this image is currently used across products, categories, or site assets...</span>
      </div>
    )
  }

  if (Array.isArray(usages) && usages.length > 0) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-2 text-xs">
        <div className="flex items-start gap-2 text-destructive font-semibold">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <span>
            Deletion blocked: this image is actively used in {usages.length} {usages.length === 1 ? "place" : "places"}.
          </span>
        </div>
        <ul className="space-y-1 max-h-32 overflow-y-auto pl-1">
          {usages.map((u, idx) => (
            <li key={`${u.entity}-${u.id}-${idx}`} className="flex items-center gap-2 text-foreground">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                {u.entity || "Reference"}
              </Badge>
              <span className="truncate font-medium">{u.label || u.id}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          Remove or replace this image from the referenced items first before deleting it from Cloudflare R2.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
        <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
        <span>Could not pre-check references ({error}). Server-side usage protection remains enforced on delete.</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
      <CheckCircle2 className="size-3.5 shrink-0" />
      <span>No active references found across products, categories, site assets, users, or reviews.</span>
    </div>
  )
}

export default MediaUsageNotice
