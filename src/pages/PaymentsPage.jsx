import * as React from "react"
import { useSelector } from "react-redux"
import {
  AlertCircle,
  BadgeDollarSign,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  FileText,
  MoreHorizontal,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { apiRequest } from "../lib/api"
import { formatCurrency, formatDate, shortId } from "../lib/format"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Input } from "../components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Skeleton } from "../components/ui/skeleton"
import StatusBadge from "../components/StatusBadge"
import { PaymentMethodBadge, PaymentProofModal } from "../components/PaymentProofModal"

export default function PaymentsPage() {
  const token = useSelector((state) => state.auth?.token)

  // Data states
  const [payments, setPayments] = React.useState([])
  const [pagination, setPagination] = React.useState({ total: 0, page: 1, limit: 20, pages: 1 })
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  // Filters
  const [statusTab, setStatusTab] = React.useState("all")
  const [methodFilter, setMethodFilter] = React.useState("__all")
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [page, setPage] = React.useState(1)

  // Inspector modal & mutation state
  const [inspectingPayment, setInspectingPayment] = React.useState(null)
  const [actionPending, setActionPending] = React.useState(false)

  // Search debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch payments from GET /api/v1/payments
  const fetchPayments = React.useCallback(
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

        if (statusTab !== "all") {
          if (statusTab === "awaiting_verification") {
            params.status = "awaiting_verification"
          } else if (statusTab === "verified") {
            params.status = "verified"
          } else if (statusTab === "paid") {
            params.status = "paid"
          } else if (statusTab === "failed") {
            params.status = "failed"
          } else if (statusTab === "cod_pending") {
            params.method = "cod"
            params.status = "pending"
          }
        }

        if (methodFilter !== "__all") {
          params.method = methodFilter
        }

        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim()
        }

        const res = await apiRequest("/payments", { token, params })
        const list = res.data?.payments || res.data || []
        const meta = res.meta || {
          total: list.length,
          page,
          limit: 20,
          pages: Math.max(1, Math.ceil(list.length / 20)),
        }

        setPayments(list)
        setPagination(meta)
      } catch (err) {
        toast.error(err.message || "Failed to load payments")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [debouncedSearch, methodFilter, page, statusTab, token]
  )

  React.useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Approve & Mark Paid action
  const handleApprove = async (payment, { note }) => {
    setActionPending(true)
    try {
      await apiRequest(`/payments/${payment._id}/paid`, {
        method: "PATCH",
        token,
        body: { verificationStatus: "verified", note },
      })
      toast.success(`Payment ${payment.paymentNumber} marked as paid`)
      setInspectingPayment(null)
      fetchPayments(true)
    } catch (err) {
      toast.error(err.message || "Failed to approve payment")
    } finally {
      setActionPending(false)
    }
  }

  // Reject action
  const handleReject = async (payment, { reason, notes }) => {
    setActionPending(true)
    try {
      await apiRequest(`/payments/${payment._id}/reject`, {
        method: "PATCH",
        token,
        body: { reason, notes },
      })
      toast.success(`Payment ${payment.paymentNumber} rejected`)
      setInspectingPayment(null)
      fetchPayments(true)
    } catch (err) {
      toast.error(err.message || "Failed to reject payment")
    } finally {
      setActionPending(false)
    }
  }

  // Verify Only action
  const handleVerifyOnly = async (payment, { note }) => {
    setActionPending(true)
    try {
      await apiRequest(`/payments/${payment._id}/verify`, {
        method: "PATCH",
        token,
        body: { notes: note },
      })
      toast.success(`Payment ${payment.paymentNumber} verified`)
      setInspectingPayment(null)
      fetchPayments(true)
    } catch (err) {
      toast.error(err.message || "Failed to verify payment")
    } finally {
      setActionPending(false)
    }
  }

  // Aggregate KPI Metrics
  const metrics = React.useMemo(() => {
    const totalVolume = payments
      .filter((p) => p.status === "paid")
      .reduce((acc, p) => acc + (p.amount || 0), 0)

    const awaitingVerificationCount = payments.filter(
      (p) => p.status === "awaiting_verification" || p.verification?.status === "pending"
    ).length

    const verifiedCount = payments.filter((p) => p.status === "verified").length
    const failedCount = payments.filter((p) => p.status === "failed").length

    return { totalVolume, awaitingVerificationCount, verifiedCount, failedCount }
  }, [payments])

  const copyToClipboard = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Paid Volume</span>
            <BadgeDollarSign className="size-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold mt-1 text-foreground">
            {formatCurrency(metrics.totalVolume, "PKR")}
          </p>
        </Card>

        <Card className="p-3.5 border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Awaiting Verification
            </span>
            <Clock className="size-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold mt-1 text-amber-900 dark:text-amber-200">
            {metrics.awaitingVerificationCount}
          </p>
        </Card>

        <Card className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Verified Transfers</span>
            <CheckCircle2 className="size-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold mt-1 text-foreground">{metrics.verifiedCount}</p>
        </Card>

        <Card className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Failed / Rejected</span>
            <AlertCircle className="size-4 text-destructive" />
          </div>
          <p className="text-xl font-bold mt-1 text-foreground">{metrics.failedCount}</p>
        </Card>
      </div>

      {/* Main Table Container */}
      <Card>
        <CardHeader className="gap-3 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Payments & Transactions</CardTitle>
              <CardDescription className="text-xs">
                Inspect manual bank transfers, mobile wallet receipts, and COD settlements.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchPayments(true)}
              disabled={refreshing || loading}
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Filter Bar & Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
            <Tabs
              value={statusTab}
              onValueChange={(val) => {
                setStatusTab(val)
                setPage(1)
              }}
              className="w-full md:w-auto"
            >
              <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-9">
                <TabsTrigger value="all" className="text-xs">
                  All
                </TabsTrigger>
                <TabsTrigger value="awaiting_verification" className="text-xs">
                  Awaiting ({metrics.awaitingVerificationCount})
                </TabsTrigger>
                <TabsTrigger value="verified" className="text-xs">
                  Verified
                </TabsTrigger>
                <TabsTrigger value="paid" className="text-xs">
                  Paid
                </TabsTrigger>
                <TabsTrigger value="failed" className="text-xs">
                  Failed
                </TabsTrigger>
                <TabsTrigger value="cod_pending" className="text-xs">
                  COD
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-9 text-xs"
                  placeholder="Search payment, order, TID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select
                value={methodFilter}
                onValueChange={(val) => {
                  setMethodFilter(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all" className="text-xs">
                    All Methods
                  </SelectItem>
                  <SelectItem value="bank_transfer" className="text-xs">
                    Bank Transfer
                  </SelectItem>
                  <SelectItem value="easypaisa" className="text-xs">
                    EasyPaisa
                  </SelectItem>
                  <SelectItem value="jazzcash" className="text-xs">
                    JazzCash
                  </SelectItem>
                  <SelectItem value="sadapay" className="text-xs">
                    SadaPay
                  </SelectItem>
                  <SelectItem value="cod" className="text-xs">
                    Cash on Delivery
                  </SelectItem>
                  <SelectItem value="card" className="text-xs">
                    Card Gateway
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Payment #</TableHead>
                <TableHead className="w-[130px]">Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Receipt</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !payments.length && (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-6 w-16 rounded-full mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="size-7 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))
              )}

              {!loading && !payments.length && (
                <TableRow>
                  <TableCell colSpan={9} className="h-36 text-center text-muted-foreground text-sm">
                    No payment transactions found matching the selected filters.
                  </TableCell>
                </TableRow>
              )}

              {payments.map((p) => {
                const hasProof = Boolean(p.proofs?.length)
                const txId =
                  p.mobileWallet?.transactionId ||
                  p.bankTransfer?.transactionId ||
                  p.transactionId

                return (
                  <TableRow key={p._id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      <button
                        type="button"
                        className="hover:underline text-primary text-left cursor-pointer"
                        onClick={() => setInspectingPayment(p)}
                        title="Inspect payment details"
                      >
                        {p.paymentNumber}
                      </button>
                      <span className="block text-[10px] text-muted-foreground font-sans">
                        {formatDate(p.createdAt)}
                      </span>
                    </TableCell>

                    <TableCell className="font-mono text-xs">
                      {p.order?.orderNumber || shortId(p.order)}
                    </TableCell>

                    <TableCell className="text-xs">
                      <span className="font-medium text-foreground block">
                        {p.user?.displayName ||
                          `${p.user?.firstName || ""} ${p.user?.lastName || ""}`.trim() ||
                          "Customer"}
                      </span>
                      <span className="text-[11px] text-muted-foreground block truncate max-w-[160px]">
                        {p.user?.email || p.user?.primaryPhone || "No contact"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <PaymentMethodBadge method={p.method} />
                    </TableCell>

                    <TableCell className="text-right font-semibold text-xs text-foreground">
                      {formatCurrency(p.amount, p.currency)}
                    </TableCell>

                    <TableCell className="text-center">
                      {hasProof ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                          onClick={() => setInspectingPayment(p)}
                          title="View proof receipt screenshot"
                        >
                          <FileText className="size-3" />
                          <span>Proof ({p.proofs.length})</span>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <StatusBadge value={p.verification?.status || "pending"} />
                    </TableCell>

                    <TableCell>
                      <StatusBadge value={p.status} />
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuLabel>Payment Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setInspectingPayment(p)}>
                            <Eye className="size-3.5 mr-2" />
                            Inspect Proof & Details
                          </DropdownMenuItem>

                          {txId && (
                            <DropdownMenuItem onClick={() => copyToClipboard(txId, "Transaction ID")}>
                              <Copy className="size-3.5 mr-2" />
                              Copy Transaction ID
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {p.status !== "paid" && (
                            <DropdownMenuItem
                              onClick={() => handleApprove(p, { note: "Direct approval" })}
                            >
                              <CheckCircle2 className="size-3.5 mr-2 text-emerald-600" />
                              Approve & Mark Paid
                            </DropdownMenuItem>
                          )}

                          {p.status !== "failed" && p.status !== "paid" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setInspectingPayment(p)}
                            >
                              <XCircle className="size-3.5 mr-2" />
                              Reject Payment...
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border text-xs text-muted-foreground">
            <p>
              Page {pagination.page} of {pagination.pages} · {pagination.total} total records
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5 mr-1" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proof Inspector Dialog */}
      <PaymentProofModal
        payment={inspectingPayment}
        open={Boolean(inspectingPayment)}
        onClose={() => setInspectingPayment(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onVerifyOnly={handleVerifyOnly}
        pending={actionPending}
      />
    </div>
  )
}
