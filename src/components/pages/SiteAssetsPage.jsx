"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  HardDrive,
  Image as ImageIcon,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"

import ResourcePage from "@/components/pages/ResourcePage"
import { MediaUsageNotice } from "@/components/common/MediaUsageNotice"
import { compressImageBeforeUpload } from "@/lib/imageCompression"
import {
  deleteMedia,
  fetchMedia,
  fetchMediaUsage,
  fetchStorageStats,
  uploadMultiple,
  uploadSingle,
} from "@/lib/uploadApi"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const FOLDER_FILTERS = [
  { id: "all", label: "All R2 Objects" },
  { id: "site", label: "Site Assets" },
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
  { id: "profiles", label: "Avatars" },
  { id: "payments", label: "Receipts" },
  { id: "uploads", label: "Uploads" },
]

const UPLOAD_FOLDERS = [
  { id: "site", label: "site (Site Assets)" },
  { id: "products", label: "products" },
  { id: "categories", label: "categories" },
  { id: "uploads", label: "uploads" },
]

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes <= 0) return "0 B"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function formatDate(dateStr) {
  if (!dateStr) return "Recent"
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return "Recent"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function SiteAssetsPage() {
  const [activeTab, setActiveTab] = React.useState("r2")

  const [media, setMedia] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [storageStats, setStorageStats] = React.useState(null)
  const [search, setSearch] = React.useState("")
  const [folder, setFolder] = React.useState("all")
  const [page, setPage] = React.useState(1)
  const [pagination, setPagination] = React.useState({ page: 1, limit: 24, total: 0, pages: 1 })
  const [copiedKey, setCopiedKey] = React.useState("")

  // Upload state
  const [uploadFolder, setUploadFolder] = React.useState("site")
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const fileInputRef = React.useRef(null)

  // Protected delete state
  const [deletingItem, setDeletingItem] = React.useState(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [usageChecking, setUsageChecking] = React.useState(false)
  const [deletingUsages, setDeletingUsages] = React.useState([])
  const [usageError, setUsageError] = React.useState("")

  const loadLibrary = React.useCallback(
    async (pageToLoad = 1) => {
      setLoading(true)
      try {
        const [mediaRes, statsRes] = await Promise.all([
          fetchMedia({
            page: pageToLoad,
            limit: 24,
            search,
            folder: folder === "all" ? "" : folder,
            sync: true,
          }),
          fetchStorageStats().catch(() => null),
        ])
        setMedia(mediaRes.media || [])
        setPagination(
          mediaRes.pagination || {
            page: pageToLoad,
            limit: 24,
            total: (mediaRes.media || []).length,
            pages: 1,
          }
        )
        setPage(pageToLoad)
        if (statsRes?.storage) {
          setStorageStats(statsRes.storage)
        }
      } catch (err) {
        toast.error(err.message || "Failed to load Cloudflare R2 media")
      } finally {
        setLoading(false)
      }
    },
    [search, folder]
  )

  React.useEffect(() => {
    if (activeTab !== "r2") return undefined
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) loadLibrary(1)
    })
    return () => {
      cancelled = true
    }
  }, [activeTab, loadLibrary])

  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return
    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (fileList.length === 0) {
      toast.error("Please choose valid image files (JPEG, PNG, WebP, AVIF, GIF)")
      return
    }

    setUploading(true)
    setUploadProgress(10)
    try {
      const optimizedFiles = await Promise.all(fileList.map((f) => compressImageBeforeUpload(f)))
      let uploaded = []
      if (optimizedFiles.length === 1) {
        const res = await uploadSingle(optimizedFiles[0], (pct) => setUploadProgress(pct), {
          folder: uploadFolder,
        })
        uploaded = [res]
      } else {
        const res = await uploadMultiple(optimizedFiles, (pct) => setUploadProgress(pct), {
          folder: uploadFolder,
        })
        uploaded = res.files || []
      }

      toast.success(
        `Uploaded ${uploaded.length} image${uploaded.length > 1 ? "s" : ""} to R2 (${uploadFolder}/)`
      )
      setUploadProgress(100)
      await loadLibrary(1)
    } catch (err) {
      toast.error(err.message || "Failed to upload image(s)")
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleCopyUrl = async (item) => {
    if (!item?.url) return
    try {
      await navigator.clipboard.writeText(item.url)
      setCopiedKey(item.key || item.url)
      toast.success("R2 image URL copied")
      setTimeout(() => setCopiedKey(""), 1800)
    } catch {
      toast.error("Failed to copy URL")
    }
  }

  const handleOpenDelete = async (item) => {
    setDeletingItem(item)
    setDeletingUsages([])
    setUsageError("")
    setUsageChecking(true)
    try {
      const res = await fetchMediaUsage(item.key || item.url)
      setDeletingUsages(res.usages || [])
    } catch (err) {
      setUsageError(err.message || "Unable to verify references")
    } finally {
      setUsageChecking(false)
    }
  }

  const closeDeleteDialog = () => {
    setDeletingItem(null)
    setDeletingUsages([])
    setUsageError("")
    setUsageChecking(false)
  }

  const handleConfirmDelete = async () => {
    if (!deletingItem || deletingUsages.length > 0) return
    setIsDeleting(true)
    try {
      await deleteMedia(deletingItem.key || deletingItem.url)
      toast.success("Image permanently deleted from Cloudflare R2")
      closeDeleteDialog()
      await loadLibrary(page)
    } catch (err) {
      if (Array.isArray(err.usages) && err.usages.length > 0) {
        setDeletingUsages(err.usages)
      }
      toast.error(err.message || "Failed to delete image")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Page Header & Tab Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Site Assets</h1>
          <p className="text-sm text-muted-foreground">
            Browse every image stored in Cloudflare R2, upload new assets, pick them across products &amp; categories, and manage storefront banner placements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {storageStats && (
            <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs font-medium">
              <HardDrive className="size-3.5 text-primary" />
              {storageStats.formattedSize || "0 B"} ({storageStats.fileCount || 0} tracked)
            </Badge>
          )}
          <div
            role="tablist"
            aria-label="Site asset views"
            className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "r2"}
              onClick={() => setActiveTab("r2")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                activeTab === "r2"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="size-3.5" />
              R2 Media Library
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "placements"}
              onClick={() => setActiveTab("placements")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                activeTab === "placements"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="size-3.5" />
              Storefront Placements
            </button>
          </div>
        </div>
      </div>

      {activeTab === "placements" ? (
        <ResourcePage resource="assets" />
      ) : (
        <div className="space-y-5 min-w-0">
          {/* Upload to R2 Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Upload Images to Cloudflare R2</CardTitle>
                  <CardDescription className="text-xs">
                    Uploaded assets are automatically compressed to WebP and immediately selectable when adding Products or Categories.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">Folder:</span>
                  <Select value={uploadFolder} onValueChange={setUploadFolder} disabled={uploading}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UPLOAD_FOLDERS.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  if (e.dataTransfer.files?.length > 0) {
                    handleUploadFiles(e.dataTransfer.files)
                  }
                }}
                className={`rounded-lg border-2 border-dashed p-5 flex flex-col items-center justify-center text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border/80 hover:border-primary/60 bg-muted/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUploadFiles(e.target.files)}
                />

                {uploading ? (
                  <div className="w-full max-w-sm space-y-2 py-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                        Compressing &amp; Uploading to R2...
                      </span>
                      <span className="font-mono font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                    <UploadCloud className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Drag and drop images here, or</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs px-3 font-medium"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse Files
                    </Button>
                    <span className="text-[11px] text-muted-foreground">
                      (Auto-compresses to WebP)
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Search & Folder Filters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between min-w-0">
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search R2 objects by filename, key, or URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadLibrary(1)
                }}
                className="pl-8 pr-8 h-9 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <div className="flex items-center rounded-md border bg-muted/40 p-0.5 text-xs shrink-0">
                {FOLDER_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFolder(f.id)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                      folder === f.id
                        ? "bg-background text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                onClick={() => loadLibrary(page)}
                disabled={loading}
                title="Refresh R2 Bucket"
              >
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* R2 Image Grid */}
          {loading ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="rounded-lg border p-2 space-y-2">
                  <Skeleton className="aspect-square w-full rounded-md" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : media.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-14 text-center space-y-2">
                <ImageIcon className="size-10 text-muted-foreground/40" />
                <p className="text-sm font-medium">No images found in Cloudflare R2</p>
                <p className="text-xs text-muted-foreground max-w-md">
                  {search || folder !== "all"
                    ? "Try clearing your search or switching to All R2 Objects."
                    : "Upload your first image above to store it in Cloudflare R2."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 min-w-0">
              {media.map((item, idx) => {
                const displayName = item.originalName || item.key?.split("/").pop() || "Image"
                const displaySize = formatBytes(item.size)
                const displayFormat = (item.format || "img").toUpperCase()
                const displayDate = formatDate(item.createdAt)
                const isCopied = copiedKey === (item.key || item.url)

                return (
                  <div
                    key={item._id || item.key || idx}
                    className="group flex flex-col rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-foreground/30 min-w-0"
                  >
                    <div className="relative aspect-square w-full bg-muted/40 overflow-hidden">
                      <img
                        src={item.url}
                        alt={displayName}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />

                      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                        {item.folder && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-background/85 backdrop-blur-xs font-medium"
                          >
                            {item.folder}
                          </Badge>
                        )}
                      </div>

                      <div className="absolute bottom-2 left-2">
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 bg-background/85 backdrop-blur-xs font-mono font-semibold"
                        >
                          {displayFormat}
                        </Badge>
                      </div>

                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(item)}
                          title="Copy R2 URL"
                          className="rounded-md p-1.5 bg-background/90 text-foreground hover:bg-background shadow-xs cursor-pointer"
                        >
                          {isCopied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(item)}
                          title="Verify usage & delete from R2"
                          className="rounded-md p-1.5 bg-background/90 text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-xs cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 space-y-1 border-t bg-card min-w-0">
                      <p className="text-xs font-medium text-foreground truncate" title={item.key || displayName}>
                        {displayName}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{displaySize}</span>
                        <span>{displayDate}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{media.length}</strong> of{" "}
              <strong className="text-foreground">{pagination.total || media.length}</strong> R2 images
            </span>
            {pagination.pages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={page <= 1 || loading}
                  onClick={() => loadLibrary(page - 1)}
                >
                  <ChevronLeft className="size-3.5 mr-1" /> Prev
                </Button>
                <span className="font-mono text-xs px-1.5">
                  {page} / {pagination.pages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={page >= pagination.pages || loading}
                  onClick={() => loadLibrary(page + 1)}
                >
                  Next <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Protected Deletion Dialog */}
      <AlertDialog
        open={Boolean(deletingItem)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isDeleting) closeDeleteDialog()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              Delete Image from Cloudflare R2?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-xs text-muted-foreground">
                <p>
                  File:{" "}
                  <strong className="text-foreground break-all">
                    {deletingItem?.key || deletingItem?.originalName}
                  </strong>
                </p>
                <MediaUsageNotice
                  checking={usageChecking}
                  usages={deletingUsages}
                  error={usageError}
                />
                <p>
                  Only unused images can be permanently deleted from Cloudflare R2.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDelete()
              }}
              disabled={isDeleting || usageChecking || deletingUsages.length > 0}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SiteAssetsPage
