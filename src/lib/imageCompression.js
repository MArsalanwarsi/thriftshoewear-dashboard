/**
 * Lossless-preserving client-side image compression before upload.
 * Encodes large raster photos to high-quality WebP (q=0.92, max 1800px) using native browser canvas
 * and returns the compressed File only when it is strictly smaller than the original.
 */
export async function compressImageBeforeUpload(file, options = {}) {
  if (!file || typeof window === "undefined") return file

  const {
    maxDimension = 1800,
    quality = 0.92,
    minBytesToCompress = 120 * 1024,
  } = options

  // Preserve animated GIFs or already lightweight files untouched
  if (file.type === "image/gif" || file.size <= minBytesToCompress) {
    return file
  }

  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file
  }

  let bitmap = null
  try {
    bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    if (!width || !height) return file

    const scale = Math.min(1, maxDimension / Math.max(width, height))
    const targetWidth = Math.max(1, Math.round(width * scale))
    const targetHeight = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement("canvas")
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return file

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)

    const outputType = file.type === "image/png" ? "image/webp" : "image/webp"
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, outputType, quality),
    )

    if (!blob || blob.size >= file.size) {
      return file
    }

    const baseName = String(file.name || "upload").replace(/\.[^.]+$/, "")
    return new File([blob], `${baseName}.webp`, {
      type: outputType,
      lastModified: Date.now(),
    })
  } catch {
    return file
  } finally {
    bitmap?.close?.()
  }
}
