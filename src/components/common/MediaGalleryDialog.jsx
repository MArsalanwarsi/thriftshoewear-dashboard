import * as React from "react"
import { toast } from "sonner"
import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Square,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  fetchMedia,
  deleteMedia,
  uploadMultiple,
  uploadSingle,
} from "@/lib/uploadApi"

const FOLDERS = [
  { id: "all", label: "All Folders" },
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
  { id: "site", label: "Site Assets" },
  { id: "payments", label: "Payments" },
]

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function formatDate(dateStr) {
  if (!dateStr) return "Recent"
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return "Recent"
  }
}

export function MediaGalleryDialog({
  open,
  onOpenChange,
  onSelect,
  multiple = false,
  initialFolder = "all",
  title = "Cloudflare R2 Media Library",
}) {
  const [media, setMedia] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [selectedItems, setSelectedItems] = React.useState([])
  const [search, setSearch] = React.useState("")
  const [folder, setFolder] = React.useState(initialFolder)
  const [page, setPage] = React.useState(1)
  const [pagination, setPagination] = React.useState({ page: 1, limit: 20, total: 0, pages: 1 })

  // Uploading state inside the gallery modal
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const fileInputRef = React.useRef(null)

  // Deletion prompt state
  const [deletingItem, setDeletingItem] = React.useState(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Load media when dialog opens or filters change
  const loadMedia = React.useCallback(
    async (pageToLoad = 1) => {
      setLoading(true)
      try {
        const res = await fetchMedia({
          page: pageToLoad,
          limit: 20,
          search,
          folder: folder === "all" ? "" : folder,
        })
        setMedia(res.media || [])
        setPagination(res.pagination || { page: pageToLoad, limit: 20, total: (res.media || []).length, pages: 1 })
        setPage(pageToLoad)
      } catch (err) {
        toast.error(err.message || "Failed to load media library")
      } finally {
        setLoading(false)
      }
    },
    [search, folder]
  )

  React.useEffect(() => {
    if (open) {
      loadMedia(1)
      setSelectedItems([])
    }
  }, [open, loadMedia])

  // Handle image selection
  const toggleSelect = (item) => {
    if (multiple) {
      setSelectedItems((prev) => {
        const exists = prev.some((x) => (x.key && x.key === item.key) || x.url === item.url)
        if (exists) {
          return prev.filter((x) => (x.key ? x.key !== item.key : x.url !== item.url))
        } else {
          return [...prev, item]
        }
      })
    } else {
      setSelectedItems([item])
    }
  }

  const isItemSelected = (item) => {
    return selectedItems.some((x) => (x.key && x.key === item.key) || x.url === item.url)
  }

  // Handle final Insert / Select
  const handleConfirmSelection = () => {
    if (selectedItems.length === 0) return
    if (multiple) {
      onSelect?.(selectedItems)
    } else {
      onSelect?.(selectedItems[0])
    }
    onOpenChange?.(false)
  }

  // Handle File Upload directly inside gallery
  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return
    const fileList = Array.from(files)
    setUploading(true)
    setUploadProgress(10)

    try {
      const targetFolder = folder === "all" ? "products" : folder
      let uploadedResults = []

      if (fileList.length === 1) {
        const res = await uploadSingle(fileList[0], (pct) => setUploadProgress(pct), {
          folder: targetFolder,
        })
        uploadedResults = [res]
      } else {
        const res = await uploadMultiple(fileList, (pct) => setUploadProgress(pct), {
          folder: targetFolder,
        })
        uploadedResults = res.files || []
      }

      toast.success(
        `Successfully uploaded ${uploadedResults.length} image${uploadedResults.length > 1 ? "s" : ""} to Cloudflare R2`
      )
      setUploadProgress(100)
      await loadMedia(1)

      // Auto-select newly uploaded items
      if (multiple) {
        setSelectedItems((prev) => [...prev, ...uploadedResults])
      } else if (uploadedResults.length > 0) {
        setSelectedItems([uploadedResults[0]])
      }
    } catch (err) {
      toast.error(err.message || "Upload failed")
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const onDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const onDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const onDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files)
    }
  }

  // Handle permanent deletion from Cloudflare R2
  const handleExecuteDelete = async () => {
    if (!deletingItem) return
    setIsDeleting(true)
    try {
      const targetKey = deletingItem.key || deletingItem.url
      await deleteMedia(targetKey)
      toast.success("Image permanently deleted from Cloudflare R2")
      setMedia((prev) => prev.filter((x) => (x.key ? x.key !== deletingItem.key : x.url !== deletingItem.url)))
      setSelectedItems((prev) =>
        prev.filter((x) => (x.key ? x.key !== deletingItem.key : x.url !== deletingItem.url))
      )
      setDeletingItem(null)
    } catch (err) {
      toast.error(err.message || "Failed to delete image")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-5 gap-3">
          <DialogHeader className="pb-1 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <ImageIcon className="size-5 text-primary" />
                  {title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Browse, search, upload, and select WebP optimized assets stored in Cloudflare R2.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Upload Drop Zone & Progress Indicator */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-lg p-3 transition-colors text-center flex flex-col items-center justify-center gap-1.5 ${
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
              <div className="w-full max-w-xs space-y-2 py-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                    Compressing & Uploading to R2...
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
                <span className="text-muted-foreground">
                  Drag and drop images here, or
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs px-2.5 font-medium"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
                <span className="text-[11px] text-muted-foreground/80">
                  (Auto-compresses to WebP)
                </span>
              </div>
            )}
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search images by name or key..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadMedia(1)
                }}
                className="pl-8 h-8 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("")
                  }}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
              <div className="flex items-center rounded-md border bg-muted/40 p-0.5 text-xs">
                {FOLDERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFolder(f.id)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      folder === f.id
                        ? "bg-background font-semibold text-foreground shadow-xs"
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
                className="size-8 shrink-0"
                onClick={() => loadMedia(1)}
                title="Refresh Media Library"
              >
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Media Grid */}
          <div className="flex-1 min-h-[300px] max-h-[420px] overflow-y-auto rounded-lg border border-border bg-background/50 p-3">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground py-16">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Fetching media from Cloudflare R2...</span>
              </div>
            ) : media.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground py-16 text-center">
                <ImageIcon className="size-10 stroke-1 opacity-60" />
                <p className="text-sm font-medium text-foreground">No media files found</p>
                <p className="text-xs max-w-sm">
                  {search
                    ? `No matches for "${search}". Try clearing search keywords.`
                    : "Upload images using the drag-and-drop zone above to store them in R2."}
                </p>
                {search && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs mt-1"
                    onClick={() => {
                      setSearch("")
                    }}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {media.map((item, idx) => {
                  const selected = isItemSelected(item)
                  const displayName = item.originalName || item.key?.split("/").pop() || "Image"
                  const displaySize = formatBytes(item.size)
                  const displayFormat = (item.format || "webp").toUpperCase()
                  const displayDate = formatDate(item.createdAt)

                  return (
                    <div
                      key={item._id || item.key || idx}
                      onClick={() => toggleSelect(item)}
                      className={`group relative flex flex-col rounded-lg border overflow-hidden cursor-pointer transition-all ${
                        selected
                          ? "border-primary ring-2 ring-primary/30 shadow-xs bg-primary/5"
                          : "border-border hover:border-foreground/30 bg-card"
                      }`}
                    >
                      {/* Image Preview Container */}
                      <div className="relative aspect-square w-full bg-muted/40 overflow-hidden">
                        <img
                          src={item.url}
                          alt={displayName}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />

                        {/* Selection check icon */}
                        <div
                          className={`absolute top-1.5 left-1.5 rounded-md p-1 transition-opacity ${
                            selected
                              ? "bg-primary text-primary-foreground opacity-100"
                              : "bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {multiple ? (
                            selected ? (
                              <CheckSquare className="size-3.5 fill-current" />
                            ) : (
                              <Square className="size-3.5" />
                            )
                          ) : (
                            <Check className="size-3.5" />
                          )}
                        </div>

                        {/* Format badge */}
                        <div className="absolute bottom-1.5 left-1.5">
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 bg-background/80 backdrop-blur-xs font-mono font-semibold"
                          >
                            {displayFormat}
                          </Badge>
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingItem(item)
                          }}
                          className="absolute top-1.5 right-1.5 rounded-md p-1 bg-background/85 text-destructive hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-xs"
                          title="Permanently delete from Cloudflare R2"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      {/* Metadata Details */}
                      <div className="p-2 space-y-0.5 text-left border-t bg-card/90">
                        <p
                          className="text-xs font-medium text-foreground truncate"
                          title={displayName}
                        >
                          {displayName}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{displaySize}</span>
                          <span>{displayDate}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pagination & Footer actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-border text-xs">
            {/* Pagination Controls */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>
                Total: <strong className="text-foreground">{pagination.total || media.length}</strong> items
              </span>
              {pagination.pages > 1 && (
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-6"
                    disabled={page <= 1 || loading}
                    onClick={() => loadMedia(page - 1)}
                  >
                    <ChevronLeft className="size-3" />
                  </Button>
                  <span className="text-[11px] px-1 font-mono">
                    {page} / {pagination.pages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-6"
                    disabled={page >= pagination.pages || loading}
                    onClick={() => loadMedia(page + 1)}
                  >
                    <ChevronRight className="size-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Selection actions */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedItems.length > 0 ? (
                  <strong className="text-primary font-semibold">
                    {selectedItems.length} selected
                  </strong>
                ) : (
                  "None selected"
                )}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onOpenChange?.(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs font-semibold"
                disabled={selectedItems.length === 0}
                onClick={handleConfirmSelection}
              >
                {multiple
                  ? `Insert ${selectedItems.length > 0 ? `(${selectedItems.length})` : ""}`
                  : "Select Image"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Alert Dialog for Permanent R2 Deletion */}
      <AlertDialog
        open={Boolean(deletingItem)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isDeleting) setDeletingItem(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              Permanently Delete Image from Cloudflare R2?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs">
              <p>
                Are you sure you want to delete{" "}
                <strong className="text-foreground">
                  {deletingItem?.originalName || deletingItem?.key}
                </strong>
                ?
              </p>
              <p className="text-muted-foreground">
                This image will be permanently expunged from the Cloudflare R2 bucket. Any products or pages referencing this URL will no longer be able to display it.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault()
                handleExecuteDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Deleting from R2...
                </>
              ) : (
                "Delete Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default MediaGalleryDialog
