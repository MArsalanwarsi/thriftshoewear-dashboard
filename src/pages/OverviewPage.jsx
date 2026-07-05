import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { BadgeDollarSign, Boxes, Loader2, ShoppingBag, Users } from "lucide-react"
import { fetchDashboard } from "../store/adminSlice"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import StatusBadge from "../components/StatusBadge"
import { formatCurrency } from "../lib/format"

const stats = [
  { key: "products", label: "Products", icon: ShoppingBag },
  { key: "activeProducts", label: "Active products", icon: Boxes },
  { key: "orders", label: "Orders", icon: BadgeDollarSign },
  { key: "users", label: "Customers", icon: Users },
]

export default function OverviewPage() {
  const dispatch = useDispatch()
  const { data, status, error } = useSelector((state) => state.admin.dashboard)

  useEffect(() => {
    dispatch(fetchDashboard())
  }, [dispatch])

  if (status === "loading" && !data) {
    return (
      <div className="flex h-72 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading dashboard
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.key}>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{data?.counts?.[stat.key] ?? 0}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Calculated from non-cancelled backend orders.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-md border border-border p-4">
              <p className="text-sm text-muted-foreground">Gross revenue</p>
              <p className="text-2xl font-semibold">{formatCurrency(data?.revenue?.revenue)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border p-4">
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-lg font-semibold">{formatCurrency(data?.revenue?.paid)}</p>
              </div>
              <div className="rounded-md border border-border p-4">
                <p className="text-sm text-muted-foreground">Due</p>
                <p className="text-lg font-semibold">{formatCurrency(data?.revenue?.due)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular products</CardTitle>
            <CardDescription>Sorted by backend view and sales statistics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.popularProducts || []).map((product) => (
                  <TableRow key={product._id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.salesStats?.viewCount || 0}</TableCell>
                    <TableCell>{product.salesStats?.soldCount || 0}</TableCell>
                    <TableCell>
                      <StatusBadge value={product.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.popularProducts?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No product analytics yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
