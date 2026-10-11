import * as React from "react"
import { toast } from "sonner"
import {
  FolderOpen,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import { uploadSingle, deleteMedia } from "@/lib/uploadApi"

export function ImageUpload({
  value = "",
  onChange,
  folder = "products",
  label,
  helperText,
  aspectRatio = "auto",
  disabled = false,
  className = "",
}) {
  // Support value as string or object { url }
  const currentUrl = typeof value === "object" && value !== null ? value.url : value || ""

  const [previewUrl, setPreviewUrl] = React.useState("")
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const [galleryOpen, setGalleryOpen] = React.useState(false)
  const [deletePromptOpen, setDeletePromptOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const fileInputRef = React.useRef(null)

  // Handle local file selection
  const handleFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      return toast.error("Please select a valid image file (JPEG, PNG, WebP, AVIF)")
    }
    if (file.size > 10 * 1024 * 1024) {
      return toast.error("Image file size must not exceed 10MB")
    }

    // Instant local preview
    const localBlob = URL.createObjectURL(file)
    setPreviewUrl(localBlob)
    setUploading(true)
    setProgress(5)

    try {
      const result = await uploadSingle(file, (pct) => setProgress(pct), { folder })
      setProgress(100)
      onChange?.(result.url, result)
      toast.success("Image compressed to WebP and uploaded to Cloudflare R2")
    } catch (err) {
      toast.error(err.message || "Upload failed")
      // Revert preview to currentUrl
      setPreviewUrl("")
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  // Handle removal
  const handleClear = () => {
    setPreviewUrl("")
    onChange?.("", null)
  }

  // Handle permanent cloud deletion
  const handleConfirmCloudDelete = async () => {
    if (!currentUrl) return
    setDeleting(true)
    try {
      await deleteMedia(currentUrl)
      toast.success("Image permanently removed from Cloudflare R2")
      handleClear()
      setDeletePromptOpen(false)
    } catch (err) {
      toast.error(err.message || "Failed to delete image from cloud")
    } finally {
      setDeleting(false)
    }
  }

  // Handle gallery picker selection
  const handleGallerySelect = (selected) => {
    const chosenUrl = typeof selected === "string" ? selected : selected?.url
    if (chosenUrl) {
      setPreviewUrl("")
      onChange?.(chosenUrl, selected)
      toast.success("Image selected from Media Library")
    }
  }

  const activeDisplayUrl = previewUrl || currentUrl

  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square max-h-48"
      : aspectRatio === "video"
      ? "aspect-video max-h-48"
      : aspectRatio === "wide"
      ? "aspect-[21/9] max-h-36"
      : "min-h-36 max-h-48"

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <Label className="text-xs font-semibold">{label}</Label>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0])
          }
        }}
      />

      {activeDisplayUrl ? (
        // Preview Card
        <div className="relative group rounded-lg border border-border bg-card overflow-hidden transition-all shadow-xs">
          <div className={`w-full flex items-center justify-center bg-muted/30 p-2 ${aspectClass}`}>
            <img
              src={activeDisplayUrl}
              alt={label || "Uploaded preview"}
              className="max-h-full max-w-full object-contain rounded"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          </div>

          {/* Upload Progress Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <div className="w-full max-w-xs space-y-1 text-center">
                <span className="text-xs font-medium text-foreground">
                  Compressing & Uploading... {progress}%
                </span>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Overlay */}
          {!uploading && !disabled && (
            <div className="flex items-center justify-between border-t border-border px-3 py-1.5 bg-muted/40 text-xs">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 gap-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="size-3.5" /> Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setGalleryOpen(true)}
                >
                  <FolderOpen className="size-3.5" /> Gallery
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                  onClick={handleClear}
                  title="Remove from form"
                >
                  <X className="size-3.5 mr-0.5" /> Detach
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeletePromptOpen(true)}
                  title="Permanently delete from Cloudflare R2"
                >
                  <Trash2 className="size-3.5 mr-0.5" /> Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Empty Drop Zone
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-lg border-2 border-dashed p-4 transition-all text-center flex flex-col items-center justify-center gap-2 ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          } ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/60 bg-muted/10 hover:bg-muted/20"
          }`}
          onClick={() => {
            if (!disabled && !uploading) fileInputRef.current?.click()
          }}
        >
          {uploading ? (
            <div className="w-full max-w-xs space-y-2 py-3">
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                Uploading to R2... {progress}%
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-full bg-muted p-2.5 text-muted-foreground">
                <UploadCloud className="size-5" />
              </div>

              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">
                  Click to browse or drag & drop photo
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Auto-converts to WebP, strips EXIF metadata (max 10MB)
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs px-2.5 font-medium pointer-events-none"
                >
                  Choose File
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5 font-medium"
                  onClick={(e) => {
                    e.stopPropagation()
                    setGalleryOpen(true)
                  }}
                >
                  <FolderOpen className="mr-1 size-3.5" /> Media Gallery
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      )}

      {/* Media Gallery Dialog */}
      <MediaGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onSelect={handleGallerySelect}
        multiple={false}
        initialFolder={folder}
      />

      {/* Cloud Deletion Confirmation */}
      <AlertDialog open={deletePromptOpen} onOpenChange={setDeletePromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              Permanently Delete Image from Cloudflare R2?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-1">
              <p>
                This action permanently deletes this image object from Cloudflare R2 storage.
              </p>
              <p className="text-muted-foreground">
                If you only want to remove it from this form without deleting the cloud file, choose Cancel and click "Detach".
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault()
                handleConfirmCloudDelete()
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1 size-3 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete from R2"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ImageUpload
