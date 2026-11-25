const SAFE_HTTP_PROTOCOLS = new Set(["http:", "https:"])

const hasControlChar = (value) => {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

export function sanitizeSafeUrl(rawUrl, { allowRelative = false } = {}) {
  if (typeof rawUrl !== "string") return null
  const trimmed = rawUrl.trim()
  if (!trimmed || hasControlChar(trimmed)) return null

  if (allowRelative && trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed
  }

  try {
    const parsed = new URL(trimmed)
    return SAFE_HTTP_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null
  } catch {
    return null
  }
}

export function encodeSegment(value) {
  return encodeURIComponent(String(value ?? "").trim())
}
