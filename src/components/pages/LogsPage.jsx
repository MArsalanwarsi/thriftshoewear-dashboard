"use client"

import * as React from "react"
import { useSelector } from "react-redux"
import { toast } from "sonner"
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  Terminal,
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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

export default function LogsPage() {
  const token = useSelector((state) => state.auth?.token)
  const user = useSelector((state) => state.auth?.user)
  const isSuperAdmin = user?.role === "superAdmin"

  const [logs, setLogs] = React.useState([])
  const [summary, setSummary] = React.useState({ total: 0, actions: 0, errors: 0, security: 0 })
  const [meta, setMeta] = React.useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = React.useState(true)

  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState("all")
  const [level, setLevel] = React.useState("all")
  const [page, setPage] = React.useState(1)
  const [selectedLog, setSelectedLog] = React.useState(null)

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
          category: category === "all" ? undefined : category,
          level: level === "all" ? undefined : level,
          search: search.trim() || undefined,
        },
      })
      setLogs(res.data?.logs || [])
      setSummary(res.data?.summary || { total: 0, actions: 0, errors: 0, security: 0 })
      setMeta(res.meta || { page: 1, pages: 1, total: 0 })
    } catch (err) {
      toast.error(err.message || "Failed to load audit logs")
    } finally {
      setLoading(false)
    }
  }, [token, isSuperAdmin, page, category, level, search])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs()
    }, 200)
    return () => clearTimeout(timer)
  }, [fetchLogs])

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
            Real-time audit trail of every action, runtime exception, and security event across Thrift Shoe Wear.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search action, path, actor email, or message..."
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
              value={category}
              onValueChange={(val) => {
                setCategory(val)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[150px]">
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
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Action &amp; Route</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Details</TableHead>
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
                logs.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CATEGORY_BADGE_MAP[entry.category] || ""}>
                        {entry.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={LEVEL_BADGE_MAP[entry.level] || ""}>
                        {entry.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate font-mono text-xs font-medium">{entry.action}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {entry.method ? `${entry.method} ` : ""}
                        {entry.path || entry.message}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{entry.actor?.displayName || entry.actor?.email || "Guest"}</div>
                      <div className="text-muted-foreground uppercase text-[10px]">{entry.actor?.role || "guest"}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{entry.statusCode ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(entry)}>
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
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
              {selectedLog?.createdAt ? formatDate(selectedLog.createdAt) : ""} •{" "}
              {selectedLog?.method} {selectedLog?.path} • HTTP {selectedLog?.statusCode ?? "N/A"}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
                <div>
                  <span className="text-muted-foreground">Actor:</span>{" "}
                  <strong>{selectedLog.actor?.email || selectedLog.actor?.role || "guest"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">IP Address:</span>{" "}
                  <strong className="font-mono">{selectedLog.ip || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>{" "}
                  <strong>{selectedLog.durationMs != null ? `${selectedLog.durationMs}ms` : "N/A"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Error Name:</span>{" "}
                  <strong>{selectedLog.errorName || "None"}</strong>
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
    </div>
  )
}
