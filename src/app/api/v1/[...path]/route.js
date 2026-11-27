const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding",
])

const FORWARD_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "cookie",
  "x-csrf-token",
  "x-auth-transport",
  "x-request-id",
  "user-agent",
  "x-forwarded-for",
  "x-real-ip",
  "x-vercel-ip-country",
  "x-vercel-ip-country-region",
  "x-vercel-ip-city",
  "x-vercel-ip-timezone",
  "x-vercel-ip-latitude",
  "x-vercel-ip-longitude",
  "cf-connecting-ip",
  "cf-ipcountry",
]

function resolveBackendBaseUrl(requestOrigin) {
  const configured =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://thriftshoewear-backend.vercel.app/api/v1"

  const normalized = String(configured).trim().replace(/\/+$/, "")
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    if (requestOrigin && normalized.startsWith(`${requestOrigin}/`)) {
      return "https://thriftshoewear-backend.vercel.app/api/v1"
    }
    return normalized
  }
  return "https://thriftshoewear-backend.vercel.app/api/v1"
}

function rewriteSetCookieForFirstParty(rawCookie, isHttps) {
  const parts = String(rawCookie)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return ""
  const nameValue = parts[0]
  const attrs = []

  for (const attr of parts.slice(1)) {
    const lower = attr.toLowerCase()
    if (lower.startsWith("domain=")) continue
    if (lower.startsWith("samesite=")) continue
    if (lower === "secure" && !isHttps) continue
    attrs.push(attr)
  }

  attrs.push("SameSite=Lax")
  if (!attrs.some((a) => a.toLowerCase().startsWith("path="))) {
    attrs.push("Path=/")
  }
  if (isHttps && !attrs.some((a) => a.toLowerCase() === "secure")) {
    attrs.push("Secure")
  }

  return [nameValue, ...attrs].join("; ")
}

async function handleProxy(req, context) {
  const params = await context.params
  const segments = Array.isArray(params?.path) ? params.path : []
  const encodedPath = segments.map((s) => encodeURIComponent(s)).join("/")

  const incomingUrl = new URL(req.url)
  const isHttps =
    incomingUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https"
  const backendBase = resolveBackendBaseUrl(incomingUrl.origin)
  const targetUrl = `${backendBase}/${encodedPath}${incomingUrl.search}`

  const headers = new Headers()
  for (const name of FORWARD_REQUEST_HEADERS) {
    const val = req.headers.get(name)
    if (val) headers.set(name, val)
  }

  const clientOrigin = req.headers.get("origin") || incomingUrl.origin
  if (clientOrigin) headers.set("origin", clientOrigin)

  let body
  if (!["GET", "HEAD"].includes(req.method.toUpperCase())) {
    const raw = await req.arrayBuffer()
    if (raw.byteLength > 0) {
      body = raw
    }
  }

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  })

  const responseHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower === "set-cookie" || HOP_BY_HOP_HEADERS.has(lower)) return
    responseHeaders.set(key, value)
  })

  const setCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : upstream.headers.get("set-cookie")
        ? [upstream.headers.get("set-cookie")]
        : []

  for (const cookieStr of setCookies) {
    const rewritten = rewriteSetCookieForFirstParty(cookieStr, isHttps)
    if (rewritten) {
      responseHeaders.append("Set-Cookie", rewritten)
    }
  }

  const payload = await upstream.arrayBuffer()
  return new Response(payload, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

export const dynamic = "force-dynamic"

export async function GET(req, ctx) {
  return handleProxy(req, ctx)
}
export async function POST(req, ctx) {
  return handleProxy(req, ctx)
}
export async function PUT(req, ctx) {
  return handleProxy(req, ctx)
}
export async function PATCH(req, ctx) {
  return handleProxy(req, ctx)
}
export async function DELETE(req, ctx) {
  return handleProxy(req, ctx)
}
export async function HEAD(req, ctx) {
  return handleProxy(req, ctx)
}
