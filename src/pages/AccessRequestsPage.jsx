import * as React from "react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { apiRequest } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccessStatusBadge, RoleBadge } from "@/components/UserBadges"
import { ApproveAccessModal } from "@/components/ApproveAccessModal"
import { RejectAccessModal } from "@/components/RejectAccessModal"
import { UserDetailModal } from "@/components/UserDetailModal"

export default function AccessRequestsPage() {
  const token = useSelector((state) => state.auth?.token)
  const currentUser = useSelector((state) => state.auth?.user)
  const isSuperAdmin = currentUser?.role === "superAdmin"

  // Data states
  const [requests, setRequests] = React.useState([])
  const [pagination, setPagination] = React.useState({ total: 0, page: 1, limit: 20, pages: 1 })
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  // Filters
  const [tab, setTab] = React.useState("pending") // "pending" | "approved" | "rejected" | "all"
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [page, setPage] = React.useState(1)

  // Modals & Action Target
  const [detailUser, setDetailUser] = React.useState(null)
  const [approveUser, setApproveUser] = React.useState(null)
  const [rejectUser, setRejectUser] = React.useState(null)
  const [actionLoading, setActionLoading] = React.useState(false)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch access requests
  const fetchRequests = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      try {
        const params = {
          page,
          limit: 20,
          includeDeleted: "true",
          sort: "-createdAt",
        }

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim()

        // Tab to status mapping
        if (tab !== "all") {
          params.dashboardAccessStatus = tab
        }

        const res = await apiRequest("/users", { token, params })
        let userList = res.data?.users || res.users || []

        // If 'all' tab selected, filter down to users who have an access record
        if (tab === "all") {
          userList = userList.filter((u) => u.dashboardAccess?.status && u.dashboardAccess.status !== "none")
        }

        const meta = res.meta || res.pagination || {
          total: userList.length,
          page,
          limit: 20,
          pages: Math.ceil(userList.length / 20) || 1,
        }

        setRequests(userList)
        setPagination(meta)
      } catch (err) {
        toast.error(err.message || "Failed to load access requests")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token, page, debouncedSearch, tab]
  )

  React.useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Action: Approve
  const handleApproveConfirm = async ({ role, reviewNotes }) => {
    if (!approveUser) return
    setActionLoading(true)
    try {
      await apiRequest(`/users/${approveUser._id}/approve-dashboard-access`, {
        method: "PATCH",
        token,
        body: { role, reviewNotes },
      })
      toast.success(`Dashboard access approved for ${approveUser.displayName || approveUser.email}`)
      setApproveUser(null)
      fetchRequests()
    } catch (err) {
      toast.error(err.message || "Failed to approve dashboard access")
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Reject
  const handleRejectConfirm = async ({ reviewNotes }) => {
    if (!rejectUser) return
    setActionLoading(true)
    try {
      await apiRequest(`/users/${rejectUser._id}/reject-dashboard-access`, {
        method: "PATCH",
        token,
        body: { reviewNotes },
      })
      toast.success(`Dashboard access rejected for ${rejectUser.displayName || rejectUser.email}`)
      setRejectUser(null)
      fetchRequests()
    } catch (err) {
      toast.error(err.message || "Failed to reject dashboard access")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* SuperAdmin Authorization Notice Banner */}
      {!isSuperAdmin ? (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-sm text-amber-900 dark:text-amber-200 shadow-xs">
          <ShieldAlert className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <span className="font-semibold">Read-Only Mode: </span>
            You are logged in as an <strong>Admin</strong>. Reviewing and approving staff onboarding
            requests requires <strong>Super Admin</strong> authorization. Action triggers are
            disabled.
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-900 dark:text-emerald-200 shadow-xs">
          <Shield className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <span className="font-semibold">Super Admin Privileges Active: </span>
            You have full authority to approve staff permissions and configure initial role assignments.
          </div>
        </div>
      )}

      {/* Header & Back Link */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="size-8">
              <Link to="/users">
                <ArrowLeft className="size-4" />
                <span className="sr-only">Back to Directory</span>
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Access Requests</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            Review applicant identities, assign operational roles, and activate staff credentials.
          </p>
        </div>
        <div className="flex items-center gap-2 ml-10 sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRequests(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link to="/users">
              <Users className="mr-2 size-4" />
              All Users
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(val) => { setTab(val); setPage(1); }} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="pending" className="text-xs">
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">
              Rejected
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">
              All Requests
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search applicant name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Requests Data Table */}
      <Card className="shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Applicant</TableHead>
              <TableHead>Requested Role</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Review Notes</TableHead>
              <TableHead className="text-right w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserCheck className="size-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium">
                      No {tab !== "all" ? tab : ""} access requests found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      New requests submitted via the staff onboarding form will appear here.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((user) => {
                const name =
                  user.displayName ||
                  `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                  "Staff Applicant"
                const initials =
                  name
                    .split(" ")
                    .filter(Boolean)
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "AP"

                const accessStatus = user.dashboardAccess?.status || "pending"
                const isPending = accessStatus === "pending"

                return (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 border">
                          <AvatarImage src={user.avatar?.url} alt={name} />
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid leading-tight">
                          <span className="font-medium text-foreground truncate max-w-[180px]">
                            {name}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <RoleBadge role={user.dashboardAccess?.requestedRole || "admin"} />
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(user.dashboardAccess?.requestedAt || user.createdAt)}
                    </TableCell>

                    <TableCell>
                      <AccessStatusBadge status={accessStatus} />
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {user.dashboardAccess?.reviewNotes ? (
                        <span className="italic">"{user.dashboardAccess.reviewNotes}"</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="View Details"
                          onClick={() => setDetailUser(user)}
                        >
                          <Eye className="size-4" />
                        </Button>

                        {isPending && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                              disabled={!isSuperAdmin}
                              onClick={() => {
                                if (!isSuperAdmin) {
                                  toast.error("Super Admin privileges required to approve")
                                  return
                                }
                                setApproveUser(user)
                              }}
                            >
                              <CheckCircle2 className="size-3.5 mr-1" />
                              Approve
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
                              disabled={!isSuperAdmin}
                              onClick={() => {
                                if (!isSuperAdmin) {
                                  toast.error("Super Admin privileges required to reject")
                                  return
                                }
                                setRejectUser(user)
                              }}
                            >
                              <XCircle className="size-3.5 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <div>
            Showing <strong>{requests.length}</strong> of <strong>{pagination.total}</strong> requests
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span>
              Page {pagination.page || page} of {pagination.pages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
              disabled={page >= (pagination.pages || 1) || loading}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <UserDetailModal
        user={detailUser}
        open={Boolean(detailUser)}
        onOpenChange={(open) => !open && setDetailUser(null)}
      />

      <ApproveAccessModal
        user={approveUser}
        open={Boolean(approveUser)}
        onOpenChange={(open) => !open && setApproveUser(null)}
        onConfirm={handleApproveConfirm}
        loading={actionLoading}
        isSuperAdmin={isSuperAdmin}
      />

      <RejectAccessModal
        user={rejectUser}
        open={Boolean(rejectUser)}
        onOpenChange={(open) => !open && setRejectUser(null)}
        onConfirm={handleRejectConfirm}
        loading={actionLoading}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  )
}
