"use client"

import * as React from "react"
import Link from "next/link"
import { useSelector } from "react-redux"
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Layers,
  MoreHorizontal,
  Power,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { apiRequest } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import StatusBadge from "@/components/StatusBadge"
import { AccessStatusBadge, RoleBadge } from "@/components/UserBadges"
import { ApproveAccessModal } from "@/components/ApproveAccessModal"
import { RejectAccessModal } from "@/components/RejectAccessModal"
import { EditRoleModal } from "@/components/EditRoleModal"
import { AssignModulesModal } from "@/components/AssignModulesModal"
import { UserDetailModal } from "@/components/UserDetailModal"
import { formatModuleSummary } from "@/config/modules"
import { Badge } from "@/components/ui/badge"

export default function UsersPage() {
  const token = useSelector((state) => state.auth?.token)
  const currentUser = useSelector((state) => state.auth?.user)
  const isSuperAdmin = currentUser?.role === "superAdmin"

  // Data states
  const [users, setUsers] = React.useState([])
  const [pagination, setPagination] = React.useState({ total: 0, page: 1, limit: 20, pages: 1 })
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  // Filters
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("__all")
  const [statusFilter, setStatusFilter] = React.useState("__all")
  const [accessFilter, setAccessFilter] = React.useState("__all")
  const [page, setPage] = React.useState(1)

  // Modals & Action Target
  const [detailUser, setDetailUser] = React.useState(null)
  const [roleUser, setRoleUser] = React.useState(null)
  const [modulesUser, setModulesUser] = React.useState(null)
  const [approveUser, setApproveUser] = React.useState(null)
  const [rejectUser, setRejectUser] = React.useState(null)
  const [permanentDeleteUser, setPermanentDeleteUser] = React.useState(null)
  const [actionLoading, setActionLoading] = React.useState(false)

  // Debounce search input (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch users from backend
  const fetchUsers = React.useCallback(
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
        if (roleFilter !== "__all") params.role = roleFilter
        if (statusFilter !== "__all") params.status = statusFilter
        if (accessFilter !== "__all") params.dashboardAccessStatus = accessFilter

        const res = await apiRequest("/users", { token, params })
        const userList = res.data?.users || res.users || []
        const meta = res.meta || res.pagination || {
          total: userList.length,
          page,
          limit: 20,
          pages: Math.ceil(userList.length / 20) || 1,
        }

        setUsers(userList)
        setPagination(meta)
      } catch (err) {
        toast.error(err.message || "Failed to load users")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token, page, debouncedSearch, roleFilter, statusFilter, accessFilter]
  )

  React.useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) fetchUsers()
    })
    return () => {
      active = false
    }
  }, [fetchUsers])

  // Quick action: Approve dashboard access
  const handleApproveConfirm = async ({ role, reviewNotes, assignedModules }) => {
    if (!approveUser) return
    setActionLoading(true)
    try {
      await apiRequest(`/users/${approveUser._id}/approve-dashboard-access`, {
        method: "PATCH",
        token,
        body: {
          role,
          reviewNotes,
          ...(role === "admin" && assignedModules !== undefined ? { assignedModules } : {}),
        },
      })
      toast.success(`Dashboard access approved for ${approveUser.displayName || approveUser.email}`)
      setApproveUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.message || "Failed to approve dashboard access")
    } finally {
      setActionLoading(false)
    }
  }

  // Quick action: Reject dashboard access
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
      fetchUsers()
    } catch (err) {
      toast.error(err.message || "Failed to reject dashboard access")
    } finally {
      setActionLoading(false)
    }
  }

  // Quick action: Change role
  const handleRoleConfirm = async ({ role: newRole, assignedModules }) => {
    if (!roleUser) return
    setActionLoading(true)
    try {
      await apiRequest(`/users/${roleUser._id}`, {
        method: "PATCH",
        token,
        body: {
          role: newRole,
          assignedModules: newRole === "admin" ? assignedModules : null,
        },
      })
      toast.success(`Role updated to ${newRole} for ${roleUser.displayName || roleUser.email}`)
      setRoleUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.message || "Failed to update user role")
    } finally {
      setActionLoading(false)
    }
  }

  // Quick action: Assign modules to an admin
  const handleAssignModulesConfirm = async (assignedModules) => {
    if (!modulesUser) return
    setActionLoading(true)
    try {
      await apiRequest(`/users/${modulesUser._id}`, {
        method: "PATCH",
        token,
        body: { assignedModules },
      })
      toast.success(
        `Updated module permissions for ${modulesUser.displayName || modulesUser.email}`
      )
      setModulesUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.message || "Failed to assign modules")
    } finally {
      setActionLoading(false)
    }
  }

  const activeSuperAdminCount = React.useMemo(
    () =>
      users.filter((u) => u.role === "superAdmin" && u.status === "active" && !u.isDeleted).length,
    [users]
  )

  const isSoleActiveSuperAdmin = (user) =>
    user?.role === "superAdmin" &&
    user?.status === "active" &&
    !user?.isDeleted &&
    activeSuperAdminCount <= 1

  // Quick action: Activate / Inactivate / Block
  const handleStatusChange = async (user, nextStatus) => {
    if (!isSuperAdmin && user.role !== "customer") {
      toast.error("Super Admin privileges required to change staff account status")
      return
    }
    if (nextStatus !== "active" && isSoleActiveSuperAdmin(user)) {
      toast.error("At least one active Super Admin account must remain active")
      return
    }
    try {
      await apiRequest(`/users/${user._id}`, {
        method: "PATCH",
        token,
        body: { status: nextStatus },
      })
      toast.success(`Account status set to ${nextStatus} for ${user.displayName || user.email}`)
      fetchUsers()
    } catch (err) {
      toast.error(err.message || "Failed to update account status")
    }
  }

  // Quick action: Soft Delete / Restore
  const handleToggleDelete = async (user) => {
    if (!isSuperAdmin) {
      toast.error("Super Admin privileges required to deactivate accounts")
      return
    }
    const isDeleting = !user.isDeleted && user.status !== "deleted"
    if (isDeleting && isSoleActiveSuperAdmin(user)) {
      toast.error("Cannot deactivate the last active Super Admin account")
      return
    }
    try {
      if (isDeleting) {
        await apiRequest(`/users/${user._id}`, { method: "DELETE", token })
        toast.success(`Account deactivated for ${user.displayName || user.email}`)
      } else {
        await apiRequest(`/users/${user._id}/restore`, { method: "PATCH", token })
        toast.success(`Account restored for ${user.displayName || user.email}`)
      }
      fetchUsers()
    } catch (err) {
      toast.error(err.message || "Failed to update account status")
    }
  }

  // Permanent deletion of entire user record (Super Admin only)
  const handlePermanentDeleteConfirm = async () => {
    if (!permanentDeleteUser) return
    setActionLoading(true)
    try {
      await apiRequest(`/users/${permanentDeleteUser._id}?permanent=true`, {
        method: "DELETE",
        token,
      })
      toast.success(`Permanently deleted user ${permanentDeleteUser.displayName || permanentDeleteUser.email}`)
      setPermanentDeleteUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.message || "Failed to permanently delete user")
    } finally {
      setActionLoading(false)
    }
  }

  // Compute stats
  const staffCount = React.useMemo(
    () => users.filter((u) => u.role === "admin" || u.role === "superAdmin").length,
    [users]
  )
  const pendingCount = React.useMemo(
    () => users.filter((u) => u.dashboardAccess?.status === "pending").length,
    [users]
  )
  const activeCount = React.useMemo(
    () => users.filter((u) => u.status === "active").length,
    [users]
  )

  return (
    <div className="space-y-6">
      {/* Page Title & Navigation Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff & User Directory</h1>
          <p className="text-sm text-muted-foreground">
            Manage store customers, administrative staff, and system access authorizations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsers(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link href="/users/access-requests">
              <UserCheck className="mr-2 size-4" />
              Access Requests
              {pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              Total Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black">{pagination.total || users.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              Staff Members
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-blue-600">{staffCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              Active Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
          </CardContent>
        </Card>

        <Card className={`shadow-xs ${pendingCount > 0 ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20" : ""}`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All Roles</SelectItem>
                <SelectItem value="superAdmin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>

            <Select value={accessFilter} onValueChange={(v) => { setAccessFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Dashboard Access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All Access States</SelectItem>
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="none">No Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User Data Table */}
      <Card className="shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Modules</TableHead>
              <TableHead>Dashboard Access</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[70px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="size-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium">No users match your criteria</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch("")
                        setRoleFilter("__all")
                        setStatusFilter("__all")
                        setAccessFilter("__all")
                      }}
                    >
                      Reset Filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const name =
                  user.displayName ||
                  `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                  "Unnamed User"
                const initials =
                  name
                    .split(" ")
                    .filter(Boolean)
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "US"

                const isPending = user.dashboardAccess?.status === "pending"

                return (
                  <TableRow key={user._id} className={user.isDeleted ? "opacity-60 bg-muted/20" : ""}>
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
                          <span className="text-[11px] text-muted-foreground uppercase font-medium">
                            {user.customerType || "retail"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                        <span className="truncate max-w-[200px]">{user.email}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Copy email for ${user.email}`}
                          className="size-6 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            navigator.clipboard.writeText(user.email)
                            toast.success("Email copied")
                          }}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>

                    <TableCell>
                      {user.role === "admin" ? (
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[11px] font-mono"
                            title={
                              Array.isArray(user.assignedModules)
                                ? user.assignedModules.join(", ") || "None"
                                : "All Operations Modules"
                            }
                          >
                            {formatModuleSummary(user)}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {formatModuleSummary(user)}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <AccessStatusBadge status={user.dashboardAccess?.status} />
                    </TableCell>

                    <TableCell>
                      <StatusBadge value={user.isDeleted ? "deleted" : user.status} />
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Open actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setDetailUser(user)}>
                            <Eye className="mr-2 size-4" /> View Profile
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {isPending && isSuperAdmin && (
                            <>
                              <DropdownMenuItem
                                onClick={() => setApproveUser(user)}
                                className="text-emerald-600 focus:text-emerald-700 font-medium"
                              >
                                <CheckCircle2 className="mr-2 size-4" /> Approve Access
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setRejectUser(user)}
                                className="text-destructive focus:text-destructive font-medium"
                              >
                                <XCircle className="mr-2 size-4" /> Reject Access
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}

                          <DropdownMenuItem
                            onClick={() => {
                              if (!isSuperAdmin) {
                                toast.error("Super Admin privileges required to change roles")
                                return
                              }
                              setRoleUser(user)
                            }}
                          >
                            <Shield className="mr-2 size-4" /> Change Role
                          </DropdownMenuItem>

                          {isSuperAdmin && user.role === "admin" && !user.isDeleted && (
                            <DropdownMenuItem onClick={() => setModulesUser(user)}>
                              <Layers className="mr-2 size-4" /> Assign Modules
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {isSuperAdmin && !user.isDeleted && (
                            <>
                              {user.status !== "active" && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(user, "active")}
                                  className="text-emerald-600 focus:text-emerald-700"
                                >
                                  <Power className="mr-2 size-4" /> Set Active
                                </DropdownMenuItem>
                              )}
                              {user.status !== "inactive" && (
                                <DropdownMenuItem
                                  disabled={isSoleActiveSuperAdmin(user)}
                                  onClick={() => handleStatusChange(user, "inactive")}
                                >
                                  <Power className="mr-2 size-4" /> Set Inactive
                                </DropdownMenuItem>
                              )}
                              {user.status !== "blocked" && (
                                <DropdownMenuItem
                                  disabled={isSoleActiveSuperAdmin(user)}
                                  onClick={() => handleStatusChange(user, "blocked")}
                                  className="text-amber-600 focus:text-amber-700"
                                >
                                  <Ban className="mr-2 size-4" /> Block User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                            </>
                          )}

                          <DropdownMenuItem
                            disabled={!user.isDeleted && isSoleActiveSuperAdmin(user)}
                            onClick={() => handleToggleDelete(user)}
                            className={user.isDeleted ? "text-emerald-600" : "text-destructive"}
                          >
                            <Trash2 className="mr-2 size-4" />
                            {user.isDeleted ? "Restore User" : "Deactivate User"}
                          </DropdownMenuItem>

                          {isSuperAdmin && !isSoleActiveSuperAdmin(user) && (
                            <DropdownMenuItem
                              onClick={() => setPermanentDeleteUser(user)}
                              className="text-destructive font-medium focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" /> Delete Entire User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            Showing <strong>{users.length}</strong> of <strong>{pagination.total}</strong> accounts
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

      <EditRoleModal
        key={`role-${roleUser?._id || "none"}`}
        user={roleUser}
        open={Boolean(roleUser)}
        onOpenChange={(open) => !open && setRoleUser(null)}
        onConfirm={handleRoleConfirm}
        loading={actionLoading}
        isSuperAdmin={isSuperAdmin}
      />

      <AssignModulesModal
        key={`modules-${modulesUser?._id || "none"}`}
        user={modulesUser}
        open={Boolean(modulesUser)}
        onOpenChange={(open) => !open && setModulesUser(null)}
        onConfirm={handleAssignModulesConfirm}
        loading={actionLoading}
        isSuperAdmin={isSuperAdmin}
      />

      <ApproveAccessModal
        key={`approve-${approveUser?._id || "none"}`}
        user={approveUser}
        open={Boolean(approveUser)}
        onOpenChange={(open) => !open && setApproveUser(null)}
        onConfirm={handleApproveConfirm}
        loading={actionLoading}
        isSuperAdmin={isSuperAdmin}
      />

      <RejectAccessModal
        key={`reject-${rejectUser?._id || "none"}`}
        user={rejectUser}
        open={Boolean(rejectUser)}
        onOpenChange={(open) => !open && setRejectUser(null)}
        onConfirm={handleRejectConfirm}
        loading={actionLoading}
        isSuperAdmin={isSuperAdmin}
      />

      <AlertDialog
        open={Boolean(permanentDeleteUser)}
        onOpenChange={(open) => !open && setPermanentDeleteUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entire User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{permanentDeleteUser?.displayName || permanentDeleteUser?.email}</strong>{" "}
              along with their cart and wishlist data from MongoDB. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={handlePermanentDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
