"use client"

import * as React from "react"
import Image from "next/image"

export function SafeImage({
  src,
  alt = "Product image",
  width = 64,
  height = 64,
  className = "",
  sizes = "(max-width: 768px) 64px, 64px",
  priority = false,
  ...props
}) {
  const resolvedSrc = typeof src === "string" ? src : src?.url || src?.src || ""
  if (!resolvedSrc) return null

  const isLocalData = resolvedSrc.startsWith("data:") || resolvedSrc.startsWith("blob:")
  if (isLocalData) {
    return (
      <Image
        src={resolvedSrc}
        alt={alt}
        width={width}
        height={height}
        unoptimized
        className={className}
        {...props}
      />
    )
  }

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={className}
      {...props}
    />
  )
}

export default SafeImage
