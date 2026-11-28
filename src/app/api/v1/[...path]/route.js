import crypto from "crypto"

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
]

function firstForwardedIp(raw) {
  if (!raw || typeof raw !== "string") return ""
  return raw.split(",")[0].trim()
}

function isLoopbackOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(origin || "").trim())
}

function attachClientTelemetryHeaders(incomingHeaders, outgoingHeaders) {
  const clientIp =
    incomingHeaders.get("cf-connecting-ip") ||
    incomingHeaders.get("true-client-ip") ||
    incomingHeaders.get("x-real-ip") ||
    firstForwardedIp(incomingHeaders.get("x-forwarded-for"))

  const country =
    incomingHeaders.get("x-vercel-ip-country") ||
    incomingHeaders.get("cf-ipcountry") ||
    incomingHeaders.get("x-country-code") ||
    ""
  const region =
    incomingHeaders.get("x-vercel-ip-country-region") ||
    incomingHeaders.get("cf-region") ||
    incomingHeaders.get("x-region") ||
    ""
  const city =
    incomingHeaders.get("x-vercel-ip-city") ||
    incomingHeaders.get("cf-ipcity") ||
    incomingHeaders.get("x-city") ||
    ""
  const timezone =
    incomingHeaders.get("x-vercel-ip-timezone") ||
    incomingHeaders.get("cf-timezone") ||
    incomingHeaders.get("x-timezone") ||
    ""
  const latitude =
    incomingHeaders.get("x-vercel-ip-latitude") ||
    incomingHeaders.get("cf-iplatitude") ||
    ""
  const longitude =
    incomingHeaders.get("x-vercel-ip-longitude") ||
    incomingHeaders.get("cf-iplongitude") ||
    ""

  const geoSource =
    incomingHeaders.get("x-vercel-ip-country") || incomingHeaders.get("x-vercel-ip-city")
      ? "vercel-edge"
      : incomingHeaders.get("cf-ipcountry") || incomingHeaders.get("cf-connecting-ip")
        ? "cloudflare"
        : country || region || city
          ? "proxy-header"
          : ""

  outgoingHeaders.set("x-tsw-forwarded-by", "thriftshoewear-bff")
  if (clientIp) outgoingHeaders.set("x-tsw-client-ip", clientIp)
  if (country) outgoingHeaders.set("x-tsw-client-country", country)
  if (region) outgoingHeaders.set("x-tsw-client-region", region)
  if (city) outgoingHeaders.set("x-tsw-client-city", city)
  if (timezone) outgoingHeaders.set("x-tsw-client-timezone", timezone)
  if (latitude) outgoingHeaders.set("x-tsw-client-latitude", latitude)
  if (longitude) outgoingHeaders.set("x-tsw-client-longitude", longitude)
  if (geoSource) outgoingHeaders.set("x-tsw-client-geo-source", geoSource)

  const secret = process.env.PROXY_TELEMETRY_SECRET
  if (secret && String(secret).trim()) {
    const payload = [clientIp || "", country, region, city, timezone, latitude, longitude].join("|")
    const sig = crypto.createHmac("sha256", String(secret).trim()).update(payload).digest("hex")
    outgoingHeaders.set("x-tsw-client-sig", sig)
  }
}

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
  attachClientTelemetryHeaders(req.headers, headers)

  const requestOrigin = req.headers.get("origin")
  if (requestOrigin && !(isLoopbackOrigin(requestOrigin) && requestOrigin === incomingUrl.origin)) {
    headers.set("origin", requestOrigin)
  } else if (!isLoopbackOrigin(incomingUrl.origin)) {
    headers.set("origin", incomingUrl.origin)
  }

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
