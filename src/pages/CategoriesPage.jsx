import * as React from "react"
import { useSelector } from "react-redux"
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Tags,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { apiRequest } from "../lib/api"
import { humanize } from "../lib/format"
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
} from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Badge } from "../components/ui/badge"
import { Switch } from "../components/ui/switch"
import { Textarea } from "../components/ui/textarea"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
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

const CATEGORY_TYPES = ["shoes", "bags", "jewelry", "accessories", "clothing", "other"]
const GENDERS = ["men", "women", "unisex", "kids", "none"]

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const defaultCategoryForm = {
  name: "",
  slug: "",
  description: "",
  parentCategory: "__none",
  type: "shoes",
  gender: "none",
  imageUrl: "",
  sortOrder: 0,
  isActive: true,
  isFeatured: false,
  metaTitle: "",
  metaDescription: "",
  keywords: "",
}

export default function CategoriesPage() {
  const token = useSelector((state) => state.auth?.token)

  // Data states
  const [categories, setCategories] = React.useState([])
  const [rootCategories, setRootCategories] = React.useState([])
  const [pagination, setPagination] = React.useState({ total: 0, page: 1, limit: 20, pages: 1 })
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  // Filter states
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("__all")
  const [genderFilter, setGenderFilter] = React.useState("__all")
  const [statusFilter, setStatusFilter] = React.useState("__all")
  const [includeDeleted, setIncludeDeleted] = React.useState(false)
  const [page, setPage] = React.useState(1)

  // Dialog & Form states
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState(null)
  const [formData, setFormData] = React.useState(defaultCategoryForm)
  const [formErrors, setFormErrors] = React.useState({})
  const [submitting, setSubmitting] = React.useState(false)

  // Soft Delete / Conflict Dialog states
  const [deleteTarget, setDeleteTarget] = React.useState(null)
  const [conflictTarget, setConflictTarget] = React.useState(null)
  const [actionPending, setActionPending] = React.useState(false)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch Categories
  const fetchCategories = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const params = {
        page,
        limit: 20,
        includeDeleted: includeDeleted ? "true" : undefined,
      }
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      if (typeFilter !== "__all") params.type = typeFilter
      if (genderFilter !== "__all") params.gender = genderFilter
      if (statusFilter === "active") params.isActive = "true"
      if (statusFilter === "inactive") params.isActive = "false"

      const res = await apiRequest("/categories", { token, params })
      const list = res.data?.categories || []
      const meta = res.meta || { total: list.length, page: 1, pages: 1, limit: 20 }

      setCategories(list)
      setPagination(meta)

      // Cache potential parent categories (items without parent)
      const roots = list.filter((c) => !c.parentCategory && !c.isDeleted)
      setRootCategories(roots)
    } catch (err) {
      toast.error(err.message || "Failed to load categories")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token, page, debouncedSearch, typeFilter, genderFilter, statusFilter, includeDeleted])

  React.useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Quick Toggle Active State
  const handleToggleActive = async (cat) => {
    const nextVal = !cat.isActive
    try {
      await apiRequest(`/categories/${cat._id}`, {
        method: "PATCH",
        token,
        body: { isActive: nextVal },
      })
      toast.success(`Category "${cat.name}" is now ${nextVal ? "active" : "inactive"}`)
      setCategories((prev) =>
        prev.map((c) => (c._id === cat._id ? { ...c, isActive: nextVal } : c))
      )
    } catch (err) {
      toast.error(err.message || "Failed to update category status")
    }
  }

  // Quick Toggle Featured State
  const handleToggleFeatured = async (cat) => {
    const nextVal = !cat.isFeatured
    try {
      await apiRequest(`/categories/${cat._id}`, {
        method: "PATCH",
        token,
        body: { isFeatured: nextVal },
      })
      toast.success(`Category "${cat.name}" featured state updated`)
      setCategories((prev) =>
        prev.map((c) => (c._id === cat._id ? { ...c, isFeatured: nextVal } : c))
      )
    } catch (err) {
      toast.error(err.message || "Failed to update featured state")
    }
  }

  // Open Create Dialog
  const handleOpenCreate = (parentCat = null) => {
    setEditingCategory(null)
    setFormData({
      ...defaultCategoryForm,
      parentCategory: parentCat ? parentCat._id : "__none",
      type: parentCat ? parentCat.type : "shoes",
      gender: parentCat ? parentCat.gender : "none",
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  // Open Edit Dialog
  const handleOpenEdit = (cat) => {
    setEditingCategory(cat)
    setFormData({
      name: cat.name || "",
      slug: cat.slug || "",
      description: cat.description || "",
      parentCategory: cat.parentCategory?._id || cat.parentCategory || "__none",
      type: cat.type || "shoes",
      gender: cat.gender || "none",
      imageUrl: cat.image?.url || "",
      sortOrder: cat.sortOrder ?? 0,
      isActive: cat.isActive !== false,
      isFeatured: Boolean(cat.isFeatured),
      metaTitle: cat.seo?.metaTitle || "",
      metaDescription: cat.seo?.metaDescription || "",
      keywords: Array.isArray(cat.seo?.keywords) ? cat.seo.keywords.join(", ") : "",
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  // Auto update slug when name changes in create mode
  const handleNameChange = (e) => {
    const val = e.target.value
    if (!editingCategory) {
      setFormData((prev) => ({
        ...prev,
        name: val,
        slug: slugify(val),
      }))
    } else {
      setFormData((prev) => ({ ...prev, name: val }))
    }
  }

  // Validate form
  const validateForm = () => {
    const errors = {}
    if (!formData.name.trim()) errors.name = "Category name is required"
    else if (formData.name.trim().length < 2) errors.name = "Name must be at least 2 characters"

    if (!formData.type) errors.type = "Category type is required"

    if (editingCategory && formData.parentCategory === editingCategory._id) {
      errors.parentCategory = "Category cannot be its own parent"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Save Category
  const handleSaveCategory = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() ? slugify(formData.slug) : slugify(formData.name),
        description: formData.description.trim() || null,
        parentCategory: formData.parentCategory === "__none" ? null : formData.parentCategory,
        type: formData.type,
        gender: formData.gender,
        image: {
          url: formData.imageUrl.trim() || null,
        },
        sortOrder: Number(formData.sortOrder) || 0,
        isActive: Boolean(formData.isActive),
        isFeatured: Boolean(formData.isFeatured),
        seo: {
          metaTitle: formData.metaTitle.trim() || undefined,
          metaDescription: formData.metaDescription.trim() || undefined,
          keywords: formData.keywords
            ? formData.keywords.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        },
      }

      if (editingCategory) {
        await apiRequest(`/categories/${editingCategory._id}`, {
          method: "PATCH",
          token,
          body: payload,
        })
        toast.success(`Category "${payload.name}" updated successfully`)
      } else {
        await apiRequest("/categories", {
          method: "POST",
          token,
          body: payload,
        })
        toast.success(`Category "${payload.name}" created successfully`)
      }

      setDialogOpen(false)
      fetchCategories(true)
    } catch (err) {
      toast.error(err.message || "Failed to save category")
    } finally {
      setSubmitting(false)
    }
  }

  // Standard Delete Category
  const handleDeleteCategory = async () => {
    if (!deleteTarget) return
    setActionPending(true)
    try {
      await apiRequest(`/categories/${deleteTarget._id}`, {
        method: "DELETE",
        token,
      })
      toast.success(`Category "${deleteTarget.name}" archived successfully`)
      setDeleteTarget(null)
      fetchCategories(true)
    } catch (err) {
      // Check for 409 conflict: Category has linked products
      if (err.message && err.message.toLowerCase().includes("category has products")) {
        const target = deleteTarget
        setDeleteTarget(null)
        setConflictTarget(target)
      } else {
        toast.error(err.message || "Failed to archive category")
      }
    } finally {
      setActionPending(false)
    }
  }

  // Force Delete Category (?force=true)
  const handleForceDeleteCategory = async () => {
    if (!conflictTarget) return
    setActionPending(true)
    try {
      await apiRequest(`/categories/${conflictTarget._id}`, {
        method: "DELETE",
        token,
        params: { force: "true" },
      })
      toast.success(`Category "${conflictTarget.name}" force-archived successfully`)
      setConflictTarget(null)
      fetchCategories(true)
    } catch (err) {
      toast.error(err.message || "Failed to force archive category")
    } finally {
      setActionPending(false)
    }
  }

  // Restore Category
  const handleRestoreCategory = async (cat) => {
    try {
      await apiRequest(`/categories/${cat._id}/restore`, {
        method: "PATCH",
        token,
      })
      toast.success(`Category "${cat.name}" restored successfully`)
      fetchCategories(true)
    } catch (err) {
      toast.error(err.message || "Failed to restore category")
    }
  }

  // Computed summary metrics
  const stats = React.useMemo(() => {
    const total = pagination.total || categories.length
    const roots = categories.filter((c) => !c.parentCategory && !c.isDeleted).length
    const subcats = categories.filter((c) => c.parentCategory && !c.isDeleted).length
    const featured = categories.filter((c) => c.isFeatured && !c.isDeleted).length
    return { total, roots, subcats, featured }
  }, [categories, pagination])

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Category Taxonomy</h2>
          <p className="text-sm text-muted-foreground">
            Manage storefront product hierarchy, navigation trees, gender categorization, and SEO metadata.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCategories(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => handleOpenCreate()}>
            <Plus className="mr-2 size-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Tags className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Categories</p>
              <h3 className="text-xl font-bold">{stats.total}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-500/10 p-2.5 text-sky-600 dark:text-sky-400">
              <FolderTree className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Root Categories</p>
              <h3 className="text-xl font-bold">{stats.roots}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/10 p-2.5 text-indigo-600 dark:text-indigo-400">
              <Layers className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subcategories</p>
              <h3 className="text-xl font-bold">{stats.subcats}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Featured</p>
              <h3 className="text-xl font-bold">{stats.featured}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, slug, description..."
                  className="pl-8 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setPage(1); }}>
                <SelectTrigger className="w-[140px] text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Types</SelectItem>
                  {CATEGORY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={genderFilter} onValueChange={(val) => { setGenderFilter(val); setPage(1); }}>
                <SelectTrigger className="w-[140px] text-sm">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Genders</SelectItem>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>{humanize(g)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger className="w-[130px] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="include-deleted-categories"
                  checked={includeDeleted}
                  onCheckedChange={(val) => { setIncludeDeleted(val); setPage(1); }}
                />
                <Label htmlFor="include-deleted-categories" className="text-xs text-muted-foreground cursor-pointer">
                  Show Archived
                </Label>
              </div>

              {(search || typeFilter !== "__all" || genderFilter !== "__all" || statusFilter !== "__all" || includeDeleted) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setTypeFilter("__all")
                    setGenderFilter("__all")
                    setStatusFilter("__all")
                    setIncludeDeleted(false)
                    setPage(1)
                  }}
                  className="text-xs"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[260px]">Category</TableHead>
                <TableHead>Hierarchy / Parent</TableHead>
                <TableHead>Type & Gender</TableHead>
                <TableHead className="text-center">Order</TableHead>
                <TableHead className="text-center">Featured</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-5 w-36 mb-1" /><Skeleton className="h-3 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <FolderTree className="size-8 stroke-[1.5]" />
                      <p className="text-sm font-medium">No categories found</p>
                      <p className="text-xs">Create your primary product categories to organize your thrift catalog.</p>
                      <Button size="sm" variant="outline" onClick={() => handleOpenCreate()} className="mt-2">
                        <Plus className="mr-1.5 size-3.5" />
                        Add Category
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => {
                  return (
                    <TableRow key={cat._id} className={cat.isDeleted ? "opacity-60 bg-muted/20" : ""}>
                      {/* Name, Thumbnail & Slug */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-md border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                            {cat.image?.url ? (
                              <img
                                src={cat.image.url}
                                alt={cat.name}
                                className="size-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = "none" }}
                              />
                            ) : (
                              <Tag className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-foreground line-clamp-1">{cat.name}</p>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              /{cat.slug}
                            </span>
                            {cat.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{cat.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Parent Hierarchy */}
                      <TableCell>
                        {cat.parentCategory ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">└ Under:</span>
                            <Badge variant="outline" className="text-xs font-medium">
                              {cat.parentCategory?.name || "Parent Category"}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            Root Category
                          </Badge>
                        )}
                      </TableCell>

                      {/* Classification */}
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline" className="text-[11px]">
                            {humanize(cat.type)}
                          </Badge>
                          <Badge variant="outline" className="text-[11px] text-muted-foreground">
                            {humanize(cat.gender)}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Sort Order */}
                      <TableCell className="text-center font-mono text-xs">
                        {cat.sortOrder ?? 0}
                      </TableCell>

                      {/* Featured Toggle */}
                      <TableCell className="text-center">
                        <Switch
                          size="sm"
                          checked={Boolean(cat.isFeatured)}
                          onCheckedChange={() => handleToggleFeatured(cat)}
                          disabled={cat.isDeleted}
                        />
                      </TableCell>

                      {/* Active Status */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {cat.isDeleted ? (
                            <Badge variant="destructive">Archived</Badge>
                          ) : (
                            <Switch
                              size="sm"
                              checked={Boolean(cat.isActive)}
                              onCheckedChange={() => handleToggleActive(cat)}
                            />
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Category Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenEdit(cat)}>
                              <Pencil className="mr-2 size-4" />
                              Edit Category
                            </DropdownMenuItem>
                            {!cat.parentCategory && (
                              <DropdownMenuItem onClick={() => handleOpenCreate(cat)}>
                                <Plus className="mr-2 size-4" />
                                Add Subcategory
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {cat.isDeleted ? (
                              <DropdownMenuItem
                                onClick={() => handleRestoreCategory(cat)}
                                className="text-emerald-600 dark:text-emerald-400"
                              >
                                <RotateCcw className="mr-2 size-4" />
                                Restore Category
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(cat)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Archive Category
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
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
          <p>
            Showing {categories.length} of {pagination.total} categories
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              <ChevronLeft className="mr-1 size-3.5" />
              Previous
            </Button>
            <span className="font-medium">
              Page {page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages || loading}
              onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
            >
              Next
              <ChevronRight className="ml-1 size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? `Edit Category: ${editingCategory.name}` : "Create Category"}
            </DialogTitle>
            <DialogDescription>
              Configure taxonomy attributes, parent hierarchy, media banner, and SEO discoverability.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCategory} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Category Name *</Label>
                <Input
                  id="cat-name"
                  placeholder="e.g. Vintage Sneakers"
                  value={formData.name}
                  onChange={handleNameChange}
                />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-slug">URL Slug *</Label>
                <Input
                  id="cat-slug"
                  placeholder="e.g. vintage-sneakers"
                  className="font-mono text-xs"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Parent Category</Label>
                <Select
                  value={formData.parentCategory}
                  onValueChange={(val) => setFormData({ ...formData, parentCategory: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (Root Category)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None (Root Category)</SelectItem>
                    {rootCategories
                      .filter((c) => !editingCategory || c._id !== editingCategory._id)
                      .map((c) => (
                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {formErrors.parentCategory && (
                  <p className="text-xs text-destructive">{formErrors.parentCategory}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) => setFormData({ ...formData, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.type && <p className="text-xs text-destructive">{formErrors.type}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(val) => setFormData({ ...formData, gender: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>{humanize(g)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-image">Image / Icon URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cat-image"
                  placeholder="https://..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
                {formData.imageUrl && (
                  <div className="size-9 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="size-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = "none" }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                placeholder="Category summary for navigation headers and SEO cards..."
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="cat-order">Sort Priority Order</Label>
                <Input
                  id="cat-order"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <Switch
                  id="cat-is-active"
                  checked={formData.isActive}
                  onCheckedChange={(val) => setFormData({ ...formData, isActive: val })}
                />
                <Label htmlFor="cat-is-active" className="text-xs cursor-pointer">
                  Active in Catalog
                </Label>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <Switch
                  id="cat-is-featured"
                  checked={formData.isFeatured}
                  onCheckedChange={(val) => setFormData({ ...formData, isFeatured: val })}
                />
                <Label htmlFor="cat-is-featured" className="text-xs cursor-pointer">
                  Featured on Home
                </Label>
              </div>
            </div>

            {/* SEO Attributes */}
            <div className="rounded-lg border p-3 space-y-2.5 bg-muted/20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Search Engine Optimization (SEO)
              </h4>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="cat-meta-title" className="text-xs">Meta Title</Label>
                  <Input
                    id="cat-meta-title"
                    className="text-xs"
                    placeholder="e.g. Vintage Sneakers & Retro Trainers | Thrift Shoe Wear"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cat-meta-desc" className="text-xs">Meta Description</Label>
                  <Input
                    id="cat-meta-desc"
                    className="text-xs"
                    placeholder="Brief description for Google search previews..."
                    value={formData.metaDescription}
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cat-keywords" className="text-xs">Keywords (Comma separated)</Label>
                  <Input
                    id="cat-keywords"
                    className="text-xs"
                    placeholder="vintage sneakers, retro footwear, pre-loved shoes"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {editingCategory ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Standard Delete Alert Dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Category &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this category? It will no longer appear in customer navigation menus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={actionPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Archive Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 409 Conflict: Category Has Products Force-Delete Dialog */}
      <AlertDialog open={Boolean(conflictTarget)} onOpenChange={(open) => !open && setConflictTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="size-5" />
              <AlertDialogTitle>Category Has Assigned Products</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2 pt-2 text-foreground">
              <p>
                Category <strong>&quot;{conflictTarget?.name}&quot;</strong> cannot be archived normally because one or more active catalog products are currently assigned to it.
              </p>
              <p className="text-xs text-muted-foreground">
                You can reassign those products first, or proceed with a <strong>Force Archive</strong>. If force archived, the category will be deactivated while products remain in the database.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceDeleteCategory}
              disabled={actionPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Force Archive Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
