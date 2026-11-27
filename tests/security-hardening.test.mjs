import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { sanitizeSafeUrl, encodeSegment } from "../src/lib/url.js"

const root = path.resolve(import.meta.dirname, "..")

describe("Dashboard Security Hardening Regression Suite", () => {
  it("sanitizeSafeUrl accepts https/http/relative (when opted in) and blocks javascript/data/vbscript URLs", () => {
    assert.equal(sanitizeSafeUrl("https://cdn.thriftshoewear.com/proof.webp"), "https://cdn.thriftshoewear.com/proof.webp")
    assert.equal(sanitizeSafeUrl("http://localhost:5000/img.png"), "http://localhost:5000/img.png")
    assert.equal(sanitizeSafeUrl("/uploads/receipt.webp", { allowRelative: true }), "/uploads/receipt.webp")
    assert.equal(sanitizeSafeUrl("/uploads/receipt.webp", { allowRelative: false }), null)
    assert.equal(sanitizeSafeUrl("//evil.example/payload.js", { allowRelative: true }), null)
    assert.equal(sanitizeSafeUrl("javascript:alert(document.cookie)"), null)
    assert.equal(sanitizeSafeUrl("data:text/html,<script>alert(1)</script>", { allowRelative: true }), null)
    assert.equal(sanitizeSafeUrl("vbscript:msgbox(1)"), null)
  })

  it("encodeSegment encodes slashes and query characters in dynamic route IDs", () => {
    assert.equal(encodeSegment("abc/../../admin?x=1"), "abc%2F..%2F..%2Fadmin%3Fx%3D1")
  })

  it("RequireAuth fails closed while user profile is unresolved and zero sensitive data persists in browser storage", () => {
    const layoutSrc = fs.readFileSync(path.join(root, "src/app/(dashboard)/layout.jsx"), "utf8")
    const providersSrc = fs.readFileSync(path.join(root, "src/app/providers.jsx"), "utf8")
    const authSliceSrc = fs.readFileSync(path.join(root, "src/store/authSlice.js"), "utf8")
    const apiSrc = fs.readFileSync(path.join(root, "src/lib/api.js"), "utf8")
    const uploadApiSrc = fs.readFileSync(path.join(root, "src/lib/uploadApi.js"), "utf8")
    const swSrc = fs.readFileSync(path.join(root, "src/app/sw.js"), "utf8")

    assert.match(layoutSrc, /if\s*\(!user\)\s*return\s*<PageLoader\s*\/>/)
    assert.match(providersSrc, /BroadcastChannel/)
    assert.match(providersSrc, /fetchMe\(\)/)
    assert.equal(/setItem\(["']dashboardToken/.test(authSliceSrc), false)
    assert.equal(/setItem\(["']dashboardUser/.test(authSliceSrc), false)
    assert.match(apiSrc, /credentials:\s*"include"/)
    assert.match(uploadApiSrc, /withCredentials\s*=\s*true/)
    assert.match(swSrc, /NetworkOnly/)
    assert.match(swSrc, /\/logs/)

    const adminSliceSrc = fs.readFileSync(path.join(root, "src/store/adminSlice.js"), "utf8")
    assert.match(adminSliceSrc, /\.addCase\(logout,/)
    assert.match(adminSliceSrc, /\.addCase\(fetchMe\.rejected,/)
  })

  it("upload components enforce strict raster MIME allowlist (no SVG)", () => {
    for (const rel of [
      "src/components/common/ImageUpload.jsx",
      "src/components/common/ImageGalleryUpload.jsx",
      "src/components/common/MediaGalleryDialog.jsx",
    ]) {
      const src = fs.readFileSync(path.join(root, rel), "utf8")
      assert.match(src, /ALLOWED_RASTER_MIME/)
      assert.equal(/file\.type\.startsWith\("image\/"\)/.test(src), false, `${rel} still permits image/svg+xml`)
    }
  })

  it("vercel.json includes CSP, HSTS, and X-Frame-Options DENY", () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"))
    const catchAll = cfg.headers.find((rule) => rule.source === "/(.*)")
    const keys = new Map(catchAll.headers.map((h) => [h.key, h.value]))
    assert.equal(keys.get("X-Frame-Options"), "DENY")
    assert.ok(keys.get("Strict-Transport-Security")?.includes("max-age=31536000"))
    assert.ok(keys.get("Content-Security-Policy")?.includes("frame-ancestors 'none'"))
  })
})
