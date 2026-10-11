import * as React from "react"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Plus,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { MediaGalleryDialog } from "./MediaGalleryDialog"
import { uploadMultiple, deleteMedia } from "@/lib/uploadApi"

export function ImageGalleryUpload({
  images = [],
  onChange,
  folder = "products",
  maxFiles = 12,
  disabled = false,
}) {
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const [galleryOpen, setGalleryOpen] = React.useState(false)

  // Cloud deletion prompt
  const [deletingImage, setDeletingImage] = React.useState(null)
  const [deleting, setDeleting] = React.useState(false)

  const fileInputRef = React.useRef(null)

  // Ensure safe array
  const imageList = Array.isArray(images) ? images : []

  // Ensure exactly one image has isPrimary if list is non-empty
  const normalizeImages = (list) => {
    if (list.length === 0) return []
    const hasPrimary = list.some((img) => img.isPrimary)
    if (!hasPrimary) {
      return list.map((img, i) => ({ ...img, isPrimary: i === 0 }))
    }
    return list
  }

  // Handle files upload
  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return
    const fileList = Array.from(files)

    const remainingSlots = maxFiles - imageList.length
    if (remainingSlots <= 0) {
      return toast.error(`Maximum capacity reached (${maxFiles} images)`)
    }

    const filesToUpload = fileList.slice(0, remainingSlots)
    if (fileList.length > remainingSlots) {
      toast.warning(`Only ${remainingSlots} slots available. Uploading first ${remainingSlots} images.`)
    }

    // Validate mime
    for (const f of filesToUpload) {
      if (!f.type.startsWith("image/")) {
        return toast.error(`File "${f.name}" is not a recognized image type`)
      }
      if (f.size > 10 * 1024 * 1024) {
        return toast.error(`File "${f.name}" exceeds 10MB limit`)
      }
    }

    setUploading(true)
    setProgress(10)

    try {
      const res = await uploadMultiple(filesToUpload, (pct) => setProgress(pct), { folder })
      const uploadedFiles = res.files || []

      const newImages = uploadedFiles.map((file, idx) => ({
        url: file.url,
        key: file.key,
        altText: file.originalName || `Product photo ${imageList.length + idx + 1}`,
        isPrimary: imageList.length === 0 && idx === 0,
        size: file.size,
        format: file.format,
      }))

      const updated = normalizeImages([...imageList, ...newImages])
      onChange?.(updated)
      toast.success(
        `Added ${newImages.length} image${newImages.length > 1 ? "s" : ""} to product gallery`
      )
    } catch (err) {
      toast.error(err.message || "Failed to upload images")
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Handle Drag & Drop
  const onDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
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
    if (disabled) return
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files)
    }
  }

  // Primary toggle
  const setPrimary = (index) => {
    const updated = imageList.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }))
    onChange?.(updated)
  }

  // Reorder: Move Left
  const moveLeft = (index) => {
    if (index <= 0) return
    const updated = [...imageList]
    const [moved] = updated.splice(index, 1)
    updated.splice(index - 1, 0, moved)
    onChange?.(normalizeImages(updated))
  }

  // Reorder: Move Right
  const moveRight = (index) => {
    if (index >= imageList.length - 1) return
    const updated = [...imageList]
    const [moved] = updated.splice(index, 1)
    updated.splice(index + 1, 0, moved)
    onChange?.(normalizeImages(updated))
  }

  // Alt text change
  const handleAltChange = (index, val) => {
    const updated = imageList.map((img, i) => (i === index ? { ...img, altText: val } : img))
    onChange?.(updated)
  }

  // Detach photo from gallery without cloud deletion
  const detachImage = (index) => {
    const updated = imageList.filter((_, i) => i !== index)
    onChange?.(normalizeImages(updated))
  }

  // Cloud deletion
  const executeCloudDelete = async () => {
    if (!deletingImage) return
    setDeleting(true)
    try {
      await deleteMedia(deletingImage.key || deletingImage.url)
      toast.success("Image permanently removed from Cloudflare R2")
      const updated = imageList.filter((img) => img.url !== deletingImage.url)
      onChange?.(normalizeImages(updated))
      setDeletingImage(null)
    } catch (err) {
      toast.error(err.message || "Failed to delete from cloud")
    } finally {
      setDeleting(false)
    }
  }

  // Handle selection from Media Library
  const handleMediaSelect = (selected) => {
    const selectedArray = Array.isArray(selected) ? selected : [selected]
    if (selectedArray.length === 0) return

    const newItems = []
    selectedArray.forEach((item) => {
      const url = item.url || item
      if (!url) return
      // Prevent duplicates
      if (imageList.some((img) => img.url === url)) return

      newItems.push({
        url,
        key: item.key || undefined,
        altText: item.originalName || "Product photo",
        isPrimary: imageList.length === 0 && newItems.length === 0,
        size: item.size,
        format: item.format,
      })
    })

    if (newItems.length > 0) {
      const updated = normalizeImages([...imageList, ...newItems])
      onChange?.(updated)
      toast.success(
        `Added ${newItems.length} image${newItems.length > 1 ? "s" : ""} from Media Library`
      )
    }
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => handleUploadFiles(e.target.files)}
      />

      {/* Upload Zone & Action Buttons */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative rounded-xl border-2 border-dashed p-5 text-center transition-all flex flex-col items-center justify-center gap-2 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border/80 hover:border-primary/60 bg-muted/20"
        }`}
      >
        {uploading ? (
          <div className="w-full max-w-sm space-y-2 py-3 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Compressing with Sharp & Uploading to R2... {progress}%
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <UploadCloud className="size-6" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                Drag and drop product photos here
              </p>
              <p className="text-xs text-muted-foreground">
                Automatic WebP conversion at 82% quality, max 1800x1800 resolution. EXIF stripped.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs font-semibold"
                disabled={disabled || imageList.length >= maxFiles}
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="mr-1 size-3.5" /> Upload from Computer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold"
                disabled={disabled || imageList.length >= maxFiles}
                onClick={() => setGalleryOpen(true)}
              >
                <FolderOpen className="mr-1 size-3.5" /> Choose from Media Gallery
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground pt-1">
              {imageList.length} of {maxFiles} images added
            </p>
          </>
        )}
      </div>

      {/* Photos Grid */}
      {imageList.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {imageList.map((img, index) => (
            <div
              key={img.url || index}
              className={`group relative flex flex-col rounded-lg border bg-card overflow-hidden transition-all shadow-xs ${
                img.isPrimary
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-square w-full bg-muted/40 overflow-hidden">
                <img
                  src={img.url}
                  alt={img.altText || `Product photo ${index + 1}`}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />

                {/* Primary Badge */}
                {img.isPrimary ? (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold gap-1 shadow-xs px-1.5 py-0.5">
                      <Star className="size-3 fill-current" /> Primary
                    </Badge>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPrimary(index)}
                    className="absolute top-2 left-2 z-10 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background cursor-pointer shadow-xs"
                    title="Set as primary catalog photo"
                  >
                    Set Primary
                  </button>
                )}

                {/* Order Index Badge */}
                <div className="absolute bottom-2 left-2 z-10">
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1 py-0 bg-background/80 font-mono"
                  >
                    #{index + 1}
                  </Badge>
                </div>

                {/* Reordering and removal controls toolbar overlay */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="size-6 bg-background/90 hover:bg-background text-foreground"
                      onClick={() => moveLeft(index)}
                      title="Move left"
                    >
                      <ArrowLeft className="size-3" />
                    </Button>
                  )}
                  {index < imageList.length - 1 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="size-6 bg-background/90 hover:bg-background text-foreground"
                      onClick={() => moveRight(index)}
                      title="Move right"
                    >
                      <ArrowRight className="size-3" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="size-6"
                    onClick={() => setDeletingImage(img)}
                    title="Delete or detach photo"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>

              {/* Alt Text Input */}
              <div className="p-2 border-t border-border bg-card/90 space-y-1">
                <Input
                  className="h-7 text-[11px] px-2"
                  placeholder="Alt text / description..."
                  value={img.altText || ""}
                  onChange={(e) => handleAltChange(index, e.target.value)}
                  title="SEO & accessibility alt text"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/10 text-center text-muted-foreground gap-1.5">
          <ImageIcon className="size-8 stroke-1 opacity-50" />
          <p className="text-xs font-medium text-foreground">No photos in product gallery</p>
          <p className="text-[11px] max-w-xs">
            At least one product image is required. Upload files from local disk or select from Cloudflare R2 media gallery.
          </p>
        </div>
      )}

      {/* Media Gallery Dialog Modal */}
      <MediaGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onSelect={handleMediaSelect}
        multiple={true}
        initialFolder={folder}
        title="Select Images for Product Gallery"
      />

      {/* Delete / Detach Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deletingImage)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !deleting) setDeletingImage(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              Remove Photo from Product?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-2">
              <p>
                Choose how you want to remove this photo:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Detach from Product:</strong> Removes this photo from this product form while keeping the image file safe in Cloudflare R2.
                </li>
                <li>
                  <strong className="text-foreground">Delete from Cloudflare R2:</strong> Permanently deletes the file from R2 object storage.
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => {
                const idx = imageList.findIndex((img) => img.url === deletingImage?.url)
                if (idx !== -1) detachImage(idx)
                setDeletingImage(null)
                toast.info("Photo detached from product")
              }}
            >
              Detach Only
            </Button>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault()
                executeCloudDelete()
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Deleting from R2...
                </>
              ) : (
                "Delete from R2 Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ImageGalleryUpload
