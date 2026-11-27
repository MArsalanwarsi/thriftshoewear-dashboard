"use client"

import * as React from "react"
import { useSelector } from "react-redux"
import { toast } from "sonner"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldAlert,
  Terminal,
  Trash2,
  X,
} from "lucide-react"

import { apiRequest } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const LEVEL_BADGE_MAP = {
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
}

const CATEGORY_BADGE_MAP = {
  action: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  security: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
}

const SOURCE_BADGE_MAP = {
  backend: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  dashboard: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  frontend: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
}

function formatLogLocation(entry) {
  const loc = entry?.location || {}
  const parts = [loc.city, loc.region, loc.country].filter(Boolean)
  if (parts.length > 0) return parts.join(", ")
  if (loc.source === "local-network") return "Localhost / LAN"
  return "Unknown"
}

function formatLogTime(entry) {
  const iso = entry?.occurredAt || entry?.createdAt
  if (!iso) return { date: "N/A", time: "" }
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return { date: formatDate(iso), time: "" }
  return {
    date: formatDate(iso),
    time: parsed.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  }
}

function formatSystemSummary(entry) {
  const sys = entry?.systemConfig || {}
  const client = [sys.os, sys.browser].filter((v) => v && v !== "Unknown").join(" · ")
  return client || sys.deviceType || "API Client"
}

export default function LogsPage() {
  const token = useSelector((state) => state.auth?.token)
  const user = useSelector((state) => state.auth?.user)
  const isSuperAdmin = user?.role === "superAdmin"

  const [logs, setLogs] = React.useState([])
  const [summary, setSummary] = React.useState({
    total: 0,
    actions: 0,
    errors: 0,
    security: 0,
    resolved: 0,
    sources: { backend: 0, dashboard: 0, frontend: 0 },
  })
  const [meta, setMeta] = React.useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = React.useState(true)

  const [search, setSearch] = React.useState("")
  const [source, setSource] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [category, setCategory] = React.useState("all")
  const [level, setLevel] = React.useState("all")
  const [page, setPage] = React.useState(1)
  const [selectedLog, setSelectedLog] = React.useState(null)

  // Password confirmation modal state for deleting single log or clearing all logs
  const [passwordModal, setPasswordModal] = React.useState({ open: false, mode: null, targetLog: null })
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [submittingAction, setSubmittingAction] = React.useState(false)

  const fetchLogs = React.useCallback(async () => {
    if (!token || !isSuperAdmin) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await apiRequest("/logs", {
        token,
        params: {
          page,
          limit: 25,
          source: source === "all" ? undefined : source,
          status: status === "all" ? undefined : status,
          category: category === "all" ? undefined : category,
          level: level === "all" ? undefined : level,
          search: search.trim() || undefined,
        },
      })
      setLogs(res.data?.logs || [])
      setSummary(
        res.data?.summary || {
          total: 0,
          actions: 0,
          errors: 0,
          security: 0,
          resolved: 0,
          sources: { backend: 0, dashboard: 0, frontend: 0 },
        }
      )
      setMeta(res.meta || { page: 1, pages: 1, total: 0 })
    } catch (err) {
      toast.error(err.message || "Failed to load audit logs")
    } finally {
      setLoading(false)
    }
  }, [token, isSuperAdmin, page, source, status, category, level, search])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs()
    }, 200)
    return () => clearTimeout(timer)
  }, [fetchLogs])

  const handleToggleResolve = async (entry) => {
    const nextStatus = entry.status === "resolved" ? "open" : "resolved"
    try {
      const res = await apiRequest(`/logs/${entry._id}/resolve`, {
        method: "PATCH",
        token,
        body: { status: nextStatus },
      })
      const updated = res.data?.log || { ...entry, status: nextStatus }
      setLogs((prev) => prev.map((item) => (item._id === entry._id ? updated : item)))
      if (selectedLog?._id === entry._id) setSelectedLog(updated)
      toast.success(`Log marked as ${nextStatus}`)
    } catch (err) {
      toast.error(err.message || "Failed to update log status")
    }
  }

  const openPasswordPrompt = (mode, targetLog = null) => {
    setConfirmPassword("")
    setPasswordModal({ open: true, mode, targetLog })
  }

  const handleConfirmProtectedAction = async (event) => {
    event.preventDefault()
    if (!confirmPassword) {
      toast.error("Please enter your Super Admin password")
      return
    }
    setSubmittingAction(true)
    try {
      if (passwordModal.mode === "delete" && passwordModal.targetLog) {
        await apiRequest(`/logs/${passwordModal.targetLog._id}`, {
          method: "DELETE",
          token,
          body: { password: confirmPassword },
        })
        toast.success("Audit log entry deleted")
        if (selectedLog?._id === passwordModal.targetLog._id) setSelectedLog(null)
      } else if (passwordModal.mode === "clear") {
        const scope = source !== "all" ? { source } : undefined
        await apiRequest("/logs", {
          method: "DELETE",
          token,
          body: { password: confirmPassword, ...scope },
        })
        toast.success(source !== "all" ? `Cleared ${source} logs` : "Cleared all audit logs")
        setSelectedLog(null)
      }
      setPasswordModal({ open: false, mode: null, targetLog: null })
      setConfirmPassword("")
      await fetchLogs()
    } catch (err) {
      toast.error(err.message || "Password verification failed")
    } finally {
      setSubmittingAction(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" />
            Super Admin Access Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          System action logs, errors, and security audit trails are strictly restricted to Super Admin accounts.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System &amp; Error Logs</h1>
          <p className="text-sm text-muted-foreground">
            Unified telemetry across Backend API, Admin Dashboard, and Storefront Frontend.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => openPasswordPrompt("clear")}
            disabled={loading || summary.total === 0}
          >
            <Trash2 className="mr-2 size-4" />
            {source !== "all" ? `Clear ${source} Logs` : "Clear All Logs"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-bold">{summary.total}</span>
            <Terminal className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Actions Recorded</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-bold">{summary.actions}</span>
            <Activity className="size-4 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Errors Caught</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-bold text-destructive">{summary.errors}</span>
            <AlertTriangle className="size-4 text-destructive" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Security Alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-bold text-amber-600">{summary.security}</span>
            <ShieldAlert className="size-4 text-amber-600" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search action, path, source, IP, or message..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9 pr-8"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("")
                  setPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={source}
              onValueChange={(val) => {
                setSource(val)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[155px]" aria-label="Filter by source">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="backend">Backend API</SelectItem>
                <SelectItem value="dashboard">Admin Dashboard</SelectItem>
                <SelectItem value="frontend">Storefront</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={category}
              onValueChange={(val) => {
                setCategory(val)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[145px]" aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="action">Actions</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={level}
              onValueChange={(val) => {
                setLevel(val)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[165px]" aria-label="Filter by level">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Errors &amp; Warnings</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(val) => {
                setStatus(val)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[130px]" aria-label="Filter by resolution status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Source &amp; Category</TableHead>
                <TableHead>Action &amp; Route</TableHead>
                <TableHead>Location &amp; System</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">
                    No matching log entries found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((entry) => {
                  const timeMeta = formatLogTime(entry)
                  const isResolved = entry.status === "resolved"
                  return (
                    <TableRow key={entry._id} className={isResolved ? "opacity-75" : ""}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">{timeMeta.date}</div>
                        <div className="font-mono text-[10px]">{timeMeta.time}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline" className={SOURCE_BADGE_MAP[entry.source || "backend"] || ""}>
                            {entry.source || "backend"}
                          </Badge>
                          <Badge variant="outline" className={CATEGORY_BADGE_MAP[entry.category] || ""}>
                            {entry.category}
                          </Badge>
                          <Badge variant="outline" className={LEVEL_BADGE_MAP[entry.level] || ""}>
                            {entry.level}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate font-mono text-xs font-medium">{entry.action}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {entry.method ? `${entry.method} ` : ""}
                          {entry.path || entry.message}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{formatLogLocation(entry)}</div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {formatSystemSummary(entry)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{entry.actor?.displayName || entry.actor?.email || "Guest"}</div>
                        <div className="text-muted-foreground uppercase text-[10px]">{entry.actor?.role || "guest"}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono">{entry.statusCode ?? "—"}</span>
                          <Badge
                            variant="outline"
                            className={
                              isResolved
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]"
                                : "border-muted-foreground/30 text-[10px]"
                            }
                          >
                            {isResolved ? "resolved" : "open"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Inspect log ${entry.action || entry._id}`}
                            onClick={() => setSelectedLog(entry)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`${isResolved ? "Reopen" : "Resolve"} log ${entry.action || entry._id}`}
                            title={isResolved ? "Reopen log" : "Mark resolved"}
                            onClick={() => handleToggleResolve(entry)}
                          >
                            <CheckCircle2 className={`size-4 ${isResolved ? "text-emerald-600" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete log ${entry.action || entry._id}`}
                            title="Delete log entry"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openPasswordPrompt("delete", entry)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {meta.pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {meta.page} of {meta.pages} ({meta.total} entries)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">{selectedLog?.action}</DialogTitle>
            <DialogDescription>
              {(selectedLog?.source || "backend").toUpperCase()} •{" "}
              {selectedLog?.createdAt ? formatDate(selectedLog.createdAt) : ""} •{" "}
              {selectedLog?.method} {selectedLog?.path} • HTTP {selectedLog?.statusCode ?? "N/A"}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <strong className="uppercase">{selectedLog.status || "open"}</strong>
                  {selectedLog.resolvedBy?.email ? ` by ${selectedLog.resolvedBy.email}` : ""}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleResolve(selectedLog)}
                  >
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                    {selectedLog.status === "resolved" ? "Reopen" : "Mark Resolved"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openPasswordPrompt("delete", selectedLog)}
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Exact Timestamp (UTC):</span>{" "}
                  <strong className="font-mono">{selectedLog.occurredAt || selectedLog.createdAt || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>{" "}
                  <strong>{formatLogLocation(selectedLog)}</strong>
                  {selectedLog.location?.timezone ? ` (${selectedLog.location.timezone})` : ""}
                </div>
                <div>
                  <span className="text-muted-foreground">Actor:</span>{" "}
                  <strong>{selectedLog.actor?.email || selectedLog.actor?.role || "guest"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">IP Address:</span>{" "}
                  <strong className="font-mono">{selectedLog.ip || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Client System:</span>{" "}
                  <strong>
                    {[selectedLog.systemConfig?.os, selectedLog.systemConfig?.browser, selectedLog.systemConfig?.deviceType]
                      .filter(Boolean)
                      .join(" / ") || "Unknown"}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Server Config:</span>{" "}
                  <strong className="font-mono">
                    {[selectedLog.systemConfig?.nodeVersion, selectedLog.systemConfig?.platform, selectedLog.systemConfig?.serverRegion, selectedLog.systemConfig?.environment]
                      .filter(Boolean)
                      .join(" · ") || "N/A"}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Request ID:</span>{" "}
                  <strong className="font-mono">{selectedLog.systemConfig?.requestId || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>{" "}
                  <strong>{selectedLog.durationMs != null ? `${selectedLog.durationMs}ms` : "N/A"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Error Name:</span>{" "}
                  <strong>{selectedLog.errorName || "None"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Location Source:</span>{" "}
                  <strong className="font-mono">{selectedLog.location?.source || "unavailable"}</strong>
                </div>
              </div>
              {selectedLog.message && (
                <div>
                  <p className="mb-1 font-semibold">Message</p>
                  <p className="rounded-md bg-muted p-2.5 font-mono break-all">{selectedLog.message}</p>
                </div>
              )}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <p className="mb-1 font-semibold">Metadata (Redacted)</p>
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-[11px]">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.stack && (
                <div>
                  <p className="mb-1 font-semibold text-destructive">Stack Trace</p>
                  <pre className="overflow-x-auto rounded-md bg-destructive/5 border border-destructive/20 p-3 font-mono text-[11px] text-destructive">
                    {selectedLog.stack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={passwordModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordModal({ open: false, mode: null, targetLog: null })
            setConfirmPassword("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleConfirmProtectedAction}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LockKeyhole className="size-4 text-destructive" />
                {passwordModal.mode === "clear" ? "Confirm Clear Logs" : "Confirm Delete Log Entry"}
              </DialogTitle>
              <DialogDescription>
                {passwordModal.mode === "clear"
                  ? "Enter your Super Admin password to permanently clear matching audit log entries."
                  : "Enter your Super Admin password to delete this audit log entry."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="logs-password-confirm">Super Admin Password</Label>
              <Input
                id="logs-password-confirm"
                type="password"
                autoComplete="current-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submittingAction}
                onClick={() => setPasswordModal({ open: false, mode: null, targetLog: null })}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={submittingAction}>
                {submittingAction ? "Verifying..." : passwordModal.mode === "clear" ? "Clear Logs" : "Delete Log"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
