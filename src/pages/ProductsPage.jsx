import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { apiRequest } from "../lib/api"
import { formatCurrency, humanize } from "../lib/format"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import {
  Card,
  CardContent,
  CardHeader,
} from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog"
import { Skeleton } from "../components/ui/skeleton"

export const THRIFT_CONDITIONS = [
  { value: "new", label: "Brand New / Deadstock", color: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { value: "like_new", label: "Like New / Mint", color: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-300" },
  { value: "excellent", label: "Excellent", color: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300" },
  { value: "good", label: "Good / Gently Used", color: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300" },
  { value: "fair", label: "Fair / Pre-loved", color: "border-stone-200 bg-stone-100 text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300" },
]

export const PRODUCT_STATUSES = [
  { value: "active", label: "Active", variant: "success" },
  { value: "draft", label: "Draft", variant: "warning" },
  { value: "inactive", label: "Inactive", variant: "muted" },
  { value: "out_of_stock", label: "Out of Stock", variant: "destructive" },
  { value: "archived", label: "Archived", variant: "destructive" },
]

export default function ProductsPage() {
  const navigate = useNavigate()
  const token = useSelector((state) => state.auth?.token)

  // Data states
  const [products, setProducts] = React.useState([])
  const [categories, setCategories] = React.useState([])
  const [pagination, setPagination] = React.useState({ total: 0, page: 1, limit: 20, pages: 1 })
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  // Filter states
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState("__all")
  const [conditionFilter, setConditionFilter] = React.useState("__all")
  const [statusFilter, setStatusFilter] = React.useState("__all")
  const [productTypeFilter, setProductTypeFilter] = React.useState("__all")
  const [page, setPage] = React.useState(1)

  // Confirmation dialog state
  const [deleteTarget, setDeleteTarget] = React.useState(null)
  const [actionPending, setActionPending] = React.useState(false)

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Load categories on mount
  React.useEffect(() => {
    let active = true
    async function loadCategories() {
      try {
        const res = await apiRequest("/categories", { token, params: { limit: 100 } })
        if (active && res.data?.categories) {
          setCategories(res.data.categories)
        }
      } catch (err) {
        console.error("Failed to load categories:", err)
      }
    }
    loadCategories()
    return () => { active = false }
  }, [token])

  // Fetch products
  const fetchProducts = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const params = {
        page,
        limit: 20,
        includeDeleted: "true",
      }

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      if (categoryFilter !== "__all") params.category = categoryFilter
      if (conditionFilter !== "__all") params.condition = conditionFilter
      if (statusFilter !== "__all") params.status = statusFilter
      if (productTypeFilter !== "__all") params.productType = productTypeFilter

      const res = await apiRequest("/products", { token, params })
      const list = res.data?.products || res.products || []
      const meta = res.meta || res.data?.pagination || { total: list.length, page: 1, pages: 1, limit: 20 }

      setProducts(list)
      setPagination(meta)
    } catch (err) {
      toast.error(err.message || "Failed to load products")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token, page, debouncedSearch, categoryFilter, conditionFilter, statusFilter, productTypeFilter])

  React.useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Reset filters
  const handleResetFilters = () => {
    setSearch("")
    setDebouncedSearch("")
    setCategoryFilter("__all")
    setConditionFilter("__all")
    setStatusFilter("__all")
    setProductTypeFilter("__all")
    setPage(1)
  }

  const hasActiveFilters =
    search !== "" ||
    categoryFilter !== "__all" ||
    conditionFilter !== "__all" ||
    statusFilter !== "__all" ||
    productTypeFilter !== "__all"

  // Quick flag toggle (Featured, New Arrival, Best Seller)
  const handleToggleFlag = async (product, flagName) => {
    const nextVal = !product[flagName]
    try {
      await apiRequest(`/products/${product._id}/flags`, {
        method: "PATCH",
        token,
        body: { [flagName]: nextVal },
      })
      toast.success(`${humanize(flagName)} updated`)
      setProducts((current) =>
        current.map((p) => (p._id === product._id ? { ...p, [flagName]: nextVal } : p))
      )
    } catch (err) {
      toast.error(err.message || `Failed to update ${flagName}`)
    }
  }

  // Soft Delete Product
  const handleDeleteProduct = async () => {
    if (!deleteTarget) return
    setActionPending(true)
    try {
      await apiRequest(`/products/${deleteTarget._id}`, {
        method: "DELETE",
        token,
      })
      toast.success(`Product "${deleteTarget.name}" archived successfully`)
      setDeleteTarget(null)
      fetchProducts(true)
    } catch (err) {
      toast.error(err.message || "Failed to delete product")
    } finally {
      setActionPending(false)
    }
  }

  // Restore Soft Deleted Product
  const handleRestoreProduct = async (product) => {
    try {
      await apiRequest(`/products/${product._id}/restore`, {
        method: "PATCH",
        token,
      })
      toast.success(`Product "${product.name}" restored as draft`)
      fetchProducts(true)
    } catch (err) {
      toast.error(err.message || "Failed to restore product")
    }
  }

  const conditionMap = React.useMemo(() => {
    return new Map(THRIFT_CONDITIONS.map((c) => [c.value, c]))
  }, [])

  return (
    <div className="space-y-4">
      {/* Header and Fast Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Catalog</h2>
          <p className="text-sm text-muted-foreground">
            Manage your thrift footwear, apparel inventory, grading, and multi-variant pricing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProducts(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => navigate("/products/new")}>
            <Plus className="mr-2 size-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filter and Search Card */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products, brand, SKU..."
                className="pl-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setPage(1); }}>
                <SelectTrigger className="h-9 w-[160px] text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Condition Grade Filter */}
              <Select value={conditionFilter} onValueChange={(val) => { setConditionFilter(val); setPage(1); }}>
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="All Conditions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Conditions</SelectItem>
                  {THRIFT_CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Statuses</SelectItem>
                  {PRODUCT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="mr-1 size-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Data Table */}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[300px]">Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Thrift Grade</TableHead>
                <TableHead>Price Range</TableHead>
                <TableHead>Stock / Variants</TableHead>
                <TableHead>Highlights</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !refreshing ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-12 rounded-md" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto size-8" /></TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Tag className="size-8 text-muted-foreground/60" />
                      <p className="text-base font-semibold">No products found</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {hasActiveFilters
                          ? "Try clearing or adjusting your search filters to find products."
                          : "Your catalog is empty. Click 'Add Product' to create your first listing."}
                      </p>
                      {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2 text-xs">
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const primaryImg = product.images?.find((img) => img.isPrimary) || product.images?.[0]
                  const conditionInfo = conditionMap.get(product.condition) || { label: humanize(product.condition), color: "" }
                  const totalStock = product.stockSummary?.availableStock ?? 0
                  const variantCount = product.variants?.length || 0
                  const isArchived = product.isDeleted || product.status === "archived"

                  return (
                    <TableRow key={product._id} className={isArchived ? "bg-destructive/5 opacity-75" : undefined}>
                      {/* Product Thumbnail & Name */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {primaryImg?.url ? (
                            <img
                              src={primaryImg.url}
                              alt={primaryImg.altText || product.name}
                              className="size-12 rounded-md object-cover border border-border shadow-2xs"
                              loading="lazy"
                            />
                          ) : (
                            <div className="size-12 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-muted-foreground border">
                              TSW
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              to={`/products/${product._id}`}
                              className="font-semibold text-foreground hover:underline line-clamp-1 block"
                            >
                              {product.name}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate">
                              {product.brand || "Thrift Shoe Wear"} {product.variants?.[0]?.sku ? `· ${product.variants[0].sku}` : ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-sm">
                        <span className="font-medium text-foreground">
                          {product.category?.name || "Uncategorized"}
                        </span>
                        <p className="text-xs text-muted-foreground capitalize">
                          {product.productType || "shoes"} · {product.gender || "unisex"}
                        </p>
                      </TableCell>

                      {/* Thrift Condition */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${conditionInfo.color}`}
                        >
                          {conditionInfo.label}
                        </span>
                      </TableCell>

                      {/* Price Range */}
                      <TableCell className="text-sm font-medium">
                        {product.priceRange?.minSalePrice ? (
                          <div className="flex flex-col">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {formatCurrency(product.priceRange.minSalePrice)}
                            </span>
                            <span className="text-xs text-muted-foreground line-through">
                              {formatCurrency(product.priceRange.minPrice)}
                            </span>
                          </div>
                        ) : product.priceRange?.minPrice !== product.priceRange?.maxPrice && product.priceRange?.maxPrice ? (
                          <span>
                            {formatCurrency(product.priceRange.minPrice)} – {formatCurrency(product.priceRange.maxPrice)}
                          </span>
                        ) : (
                          <span>{formatCurrency(product.priceRange?.minPrice || 0)}</span>
                        )}
                      </TableCell>

                      {/* Stock & Variants */}
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`size-2 rounded-full ${
                              totalStock > 3
                                ? "bg-emerald-500"
                                : totalStock > 0
                                ? "bg-amber-500"
                                : "bg-destructive"
                            }`}
                          />
                          <span className="font-medium">
                            {totalStock > 0 ? `${totalStock} in stock` : "Sold Out"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {variantCount} variant{variantCount !== 1 ? "s" : ""}
                        </p>
                      </TableCell>

                      {/* Highlights / Fast Flags */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleFlag(product, "isFeatured")}
                            className={`cursor-pointer rounded-xs px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                              product.isFeatured
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            title="Toggle Featured"
                          >
                            Featured
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleFlag(product, "isNewArrival")}
                            className={`cursor-pointer rounded-xs px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                              product.isNewArrival
                                ? "bg-sky-500 text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            title="Toggle New Arrival"
                          >
                            New
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleFlag(product, "isBestSeller")}
                            className={`cursor-pointer rounded-xs px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                              product.isBestSeller
                                ? "bg-amber-500 text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            title="Toggle Best Seller"
                          >
                            Best
                          </button>
                        </div>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        <Badge
                          variant={
                            product.status === "active"
                              ? "success"
                              : product.status === "draft"
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {humanize(product.status)}
                        </Badge>
                      </TableCell>

                      {/* Actions Dropdown */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigate(`/products/${product._id}`)}>
                              <Pencil className="mr-2 size-4" />
                              Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a
                                href={`https://thriftshoewear.com/product/${product.slug}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="mr-2 size-4" />
                                View on Store
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isArchived ? (
                              <DropdownMenuItem onClick={() => handleRestoreProduct(product)}>
                                <RotateCcw className="mr-2 size-4 text-emerald-600" />
                                Restore Listing
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTarget(product)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Archive / Delete
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

          {/* Pagination Controls */}
          <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Showing page <strong className="text-foreground">{pagination.page}</strong> of{" "}
              <strong className="text-foreground">{pagination.pages || 1}</strong> · Total{" "}
              <strong className="text-foreground">{pagination.total}</strong> products
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (pagination.pages || 1) || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete / Archive Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{deleteTarget?.name}</strong>?
              This will remove the product from the public storefront and mark its status as archived. You can restore it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              disabled={actionPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Archive Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
