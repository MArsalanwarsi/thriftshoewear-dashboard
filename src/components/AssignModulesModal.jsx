"use client"

import * as React from "react"
import { Layers, Loader2, ShieldAlert } from "lucide-react"

import { ADMIN_MODULES, ALL_MODULE_KEYS } from "@/config/modules"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export function ModuleSelectorGrid({
  value,
  onChange,
  disabled = false,
  compact = false,
}) {
  const isFullAccess = !Array.isArray(value)
  const selectedSet = React.useMemo(
    () => new Set(Array.isArray(value) ? value : ALL_MODULE_KEYS),
    [value]
  )

  const handleModeToggle = (checked) => {
    if (disabled) return
    onChange?.(checked ? null : [...selectedSet])
  }

  const handleToggleModule = (moduleKey, checked) => {
    if (disabled) return
    const next = new Set(Array.isArray(value) ? value : ALL_MODULE_KEYS)
    if (checked) {
      next.add(moduleKey)
    } else {
      next.delete(moduleKey)
    }
    onChange?.(Array.from(next))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-2.5">
        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={isFullAccess}
            onChange={(e) => handleModeToggle(e.target.checked)}
            disabled={disabled}
            className="size-4 accent-primary rounded border-input cursor-pointer shrink-0"
          />
          <span>Grant All Operations Modules (Unrestricted Admin)</span>
        </label>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            disabled={disabled}
            onClick={() => onChange?.([...ALL_MODULE_KEYS])}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            disabled={disabled}
            onClick={() => onChange?.([])}
          >
            Clear
          </Button>
        </div>
      </div>

      <div
        className={`grid gap-2 ${
          compact ? "grid-cols-1 sm:grid-cols-2 max-h-56 overflow-y-auto pr-1" : "grid-cols-1 sm:grid-cols-2"
        }`}
      >
        {ADMIN_MODULES.map((mod) => {
          const checked = selectedSet.has(mod.key)
          return (
            <label
              key={mod.key}
              className={`flex items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors cursor-pointer ${
                checked ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-muted/30"
              } ${isFullAccess || disabled ? "opacity-75" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => handleToggleModule(mod.key, e.target.checked)}
                disabled={disabled}
                className="mt-0.5 size-4 accent-primary rounded border-input cursor-pointer shrink-0"
              />
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">{mod.label}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                    {mod.key}
                  </Badge>
                </div>
                {!compact && (
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {mod.description}
                  </p>
                )}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

export function AssignModulesModal({
  user,
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  isSuperAdmin = false,
}) {
  const [assignedModules, setAssignedModules] = React.useState(
    Array.isArray(user?.assignedModules) ? user.assignedModules : null
  )

  if (!user) return null

  const userName =
    user.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email

  const selectedCount = Array.isArray(assignedModules)
    ? assignedModules.length
    : ADMIN_MODULES.length

  const handleSubmit = (e) => {
    e.preventDefault()
    onConfirm?.(assignedModules)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              Assign Dashboard Modules
            </DialogTitle>
            <DialogDescription>
              Control which dashboard modules <strong>{userName}</strong> can access. Super Admin tools (Audit Logs, Feature Controls, Access Approvals) always remain restricted to Super Admins.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-xs">
              <div>
                <span className="font-semibold text-foreground">{userName}</span>{" "}
                <span className="text-muted-foreground">({user.email})</span>
              </div>
              <Badge variant="secondary" className="font-mono">
                {Array.isArray(assignedModules)
                  ? `${selectedCount} / ${ADMIN_MODULES.length} Selected`
                  : `All (${ADMIN_MODULES.length}) Default`}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Allowed Dashboard Modules</Label>
              <ModuleSelectorGrid
                value={assignedModules}
                onChange={setAssignedModules}
                disabled={loading || !isSuperAdmin}
              />
            </div>

            {!isSuperAdmin && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                <ShieldAlert className="size-4 shrink-0" />
                <span>Only Super Admins can assign or modify admin modules.</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isSuperAdmin}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Module Permissions
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AssignModulesModal
