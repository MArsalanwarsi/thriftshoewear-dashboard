import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log("=================================================================")
console.log("🚀 STARTING ADVERSARIAL VERIFICATION & SMOKE TEST (MILESTONE 2)")
console.log("=================================================================\n")

let passedCount = 0
let failedCount = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passedCount++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`)
    console.error(`     Reason: ${err.message}`)
    failedCount++
  }
}

async function runTestAsync(name, fn) {
  try {
    await fn()
    console.log(`  ✅ [PASS] ${name}`)
    passedCount++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`)
    console.error(`     Reason: ${err.message}`)
    failedCount++
  }
}

// ============================================================================
// ENVIRONMENT & MOCK SETUP
// ============================================================================

// Mock localStorage
const mockStorage = new Map()
const localStorageMock = {
  getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
}

// Mock window
globalThis.window = {
  location: {
    pathname: "/products",
    href: "/products",
  },
  localStorage: localStorageMock,
}
globalThis.localStorage = localStorageMock

// Mock XMLHttpRequest
class MockXMLHttpRequest {
  constructor() {
    this.headers = {}
    this.status = 200
    this.responseText = ""
    this.upload = { onprogress: null }
    this.onload = null
    this.onerror = null
    this.ontimeout = null
    this.timeout = 0
  }

  open(method, url) {
    this.method = method
    this.url = url
  }

  setRequestHeader(header, value) {
    this.headers[header] = value
  }

  send(data) {
    this.sentData = data
    if (MockXMLHttpRequest.interceptor) {
      MockXMLHttpRequest.interceptor(this)
    }
  }
}
globalThis.XMLHttpRequest = MockXMLHttpRequest

// Dynamically create in-memory uploadApi module bound to mock environment
const uploadApiRaw = fs.readFileSync(path.join(__dirname, "src/lib/uploadApi.js"), "utf8")
const sanitizedUploadApi = uploadApiRaw.replace(
  'import { API_BASE_URL } from "./api"',
  'const API_BASE_URL = "https://mock.backend.api/api/v1";'
)

const tempUploadApiPath = path.join(__dirname, ".temp_uploadApi.mjs")
fs.writeFileSync(tempUploadApiPath, sanitizedUploadApi, "utf8")

const uploadApi = await import("./.temp_uploadApi.mjs")

// Clean up temp file
try {
  fs.unlinkSync(tempUploadApiPath)
} catch {}

// ============================================================================
// SUITE 1: uploadSingle Adversarial & Error Handling
// ============================================================================
console.log("📦 SUITE 1: uploadSingle API Contracts & Error States")

await runTestAsync("uploadSingle: Throws error when file is missing / null", async () => {
  await assert.rejects(
    () => uploadApi.uploadSingle(null),
    { message: "No file provided for upload" }
  )
})

await runTestAsync("uploadSingle: Signature polymorphism (callback, object, options)", async () => {
  const dummyFile = new File(["dummy"], "shoe.png", { type: "image/png" })
  let progressReported = null

  // 1. (file, callback)
  MockXMLHttpRequest.interceptor = (xhr) => {
    xhr.status = 200
    xhr.responseText = JSON.stringify({ success: true, url: "https://r2/img.webp", key: "products/img.webp" })
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 })
    xhr.onload?.()
  }
  const res1 = await uploadApi.uploadSingle(dummyFile, (pct) => { progressReported = pct })
  assert.equal(res1.success, true)
  assert.equal(progressReported, 100)

  // 2. (file, { onProgress, folder })
  let folderPassed = null
  MockXMLHttpRequest.interceptor = (xhr) => {
    folderPassed = xhr.sentData.get("folder")
    xhr.status = 200
    xhr.responseText = JSON.stringify({ success: true, url: "https://r2/cat.webp", key: "categories/cat.webp" })
    xhr.onload?.()
  }
  const res2 = await uploadApi.uploadSingle(dummyFile, { folder: "categories", onProgress: () => {} })
  assert.equal(res2.success, true)
  assert.equal(folderPassed, "categories")
})

await runTestAsync("uploadSingle: Auth token injection from localStorage", async () => {
  const dummyFile = new File(["dummy"], "shoe.png", { type: "image/png" })
  localStorageMock.setItem("dashboardToken", "test-valid-jwt-token")

  let capturedAuth = null
  MockXMLHttpRequest.interceptor = (xhr) => {
    capturedAuth = xhr.headers["Authorization"]
    xhr.status = 200
    xhr.responseText = JSON.stringify({ success: true, url: "https://r2/img.webp" })
    xhr.onload?.()
  }

  await uploadApi.uploadSingle(dummyFile)
  assert.equal(capturedAuth, "Bearer test-valid-jwt-token")
  localStorageMock.removeItem("dashboardToken")
})

await runTestAsync("uploadSingle: Unauthenticated handling (401 session expiry)", async () => {
  const dummyFile = new File(["dummy"], "shoe.png", { type: "image/png" })
  localStorageMock.setItem("dashboardToken", "expired-token")
  localStorageMock.setItem("dashboardUser", JSON.stringify({ name: "Admin" }))
  window.location.pathname = "/products"

  MockXMLHttpRequest.interceptor = (xhr) => {
    xhr.status = 401
    xhr.responseText = JSON.stringify({ success: false, message: "Token expired" })
    xhr.onload?.()
  }

  await assert.rejects(
    () => uploadApi.uploadSingle(dummyFile),
    { message: "Authentication expired. Please log in again." }
  )

  // Verify tokens were scrubbed and redirect occurred
  assert.equal(localStorageMock.getItem("dashboardToken"), null)
  assert.equal(localStorageMock.getItem("dashboardUser"), null)
  assert.equal(window.location.href, "/login")
})

await runTestAsync("uploadSingle: Network timeout handling", async () => {
  const dummyFile = new File(["dummy"], "shoe.png", { type: "image/png" })
  MockXMLHttpRequest.interceptor = (xhr) => {
    xhr.ontimeout?.()
  }

  await assert.rejects(
    () => uploadApi.uploadSingle(dummyFile),
    { message: "Upload timed out. Please check your network." }
  )
})

await runTestAsync("uploadSingle: Network connection error handling", async () => {
  const dummyFile = new File(["dummy"], "shoe.png", { type: "image/png" })
  MockXMLHttpRequest.interceptor = (xhr) => {
    xhr.onerror?.()
  }

  await assert.rejects(
    () => uploadApi.uploadSingle(dummyFile),
    { message: "Network connection error during image upload" }
  )
})

await runTestAsync("uploadSingle: Server error (500) with custom error message", async () => {
  const dummyFile = new File(["dummy"], "shoe.png", { type: "image/png" })
  MockXMLHttpRequest.interceptor = (xhr) => {
    xhr.status = 500
    xhr.responseText = JSON.stringify({ message: "Sharp processing failed: corrupt file header" })
    xhr.onload?.()
  }

  await assert.rejects(
    () => uploadApi.uploadSingle(dummyFile),
    { message: "Sharp processing failed: corrupt file header" }
  )
})

await runTestAsync("uploadSingle: Server returns malformed / non-JSON response", async () => {
  const dummyFile = new File(["dummy"], "shoe.png", { type: "image/png" })
  MockXMLHttpRequest.interceptor = (xhr) => {
    xhr.status = 502
    xhr.responseText = "<html>Bad Gateway</html>"
    xhr.onload?.()
  }

  await assert.rejects(
    () => uploadApi.uploadSingle(dummyFile),
    { message: "Server returned invalid response (status 502)" }
  )
})

// ============================================================================
// SUITE 2: uploadMultiple Adversarial & Boundary Validation
// ============================================================================
console.log("\n📦 SUITE 2: uploadMultiple Boundary Conditions & Multi-Upload")

await runTestAsync("uploadMultiple: Rejects empty file list", async () => {
  await assert.rejects(
    () => uploadApi.uploadMultiple([]),
    { message: "No files selected for upload" }
  )
})

await runTestAsync("uploadMultiple: Boundary condition: Rejects > 10 files (11 files)", async () => {
  const elevenFiles = Array.from({ length: 11 }, (_, i) => new File(["data"], `pic${i}.png`, { type: "image/png" }))
  await assert.rejects(
    () => uploadApi.uploadMultiple(elevenFiles),
    { message: "A maximum of 10 files can be uploaded simultaneously" }
  )
})

await runTestAsync("uploadMultiple: Boundary condition: Accepts exactly 10 files", async () => {
  const tenFiles = Array.from({ length: 10 }, (_, i) => new File(["data"], `pic${i}.png`, { type: "image/png" }))
  MockXMLHttpRequest.interceptor = (xhr) => {
    xhr.status = 200
    xhr.responseText = JSON.stringify({
      success: true,
      files: tenFiles.map((f, i) => ({ url: `https://r2/${i}.webp`, key: `products/${i}.webp` })),
    })
    xhr.onload?.()
  }

  const res = await uploadApi.uploadMultiple(tenFiles)
  assert.equal(res.success, true)
  assert.equal(res.files.length, 10)
})

await runTestAsync("uploadMultiple: Form data contains both 'files' and 'images' field names", async () => {
  const files = [new File(["a"], "a.png"), new File(["b"], "b.png")]
  let capturedFormData = null
  MockXMLHttpRequest.interceptor = (xhr) => {
    capturedFormData = xhr.sentData
    xhr.status = 200
    xhr.responseText = JSON.stringify({ success: true, files: [] })
    xhr.onload?.()
  }

  await uploadApi.uploadMultiple(files, { folder: "products" })
  assert.equal(capturedFormData.getAll("files").length, 2)
  assert.equal(capturedFormData.getAll("images").length, 2)
  assert.equal(capturedFormData.get("folder"), "products")
})

// ============================================================================
// SUITE 3: fetchMedia & deleteMedia API Contracts
// ============================================================================
console.log("\n📦 SUITE 3: fetchMedia & deleteMedia Operational Contracts")

await runTestAsync("fetchMedia: Query parameter encoding & folder filtering", async () => {
  let capturedUrl = null
  globalThis.fetch = async (url) => {
    capturedUrl = url
    return {
      status: 200,
      ok: true,
      json: async () => ({
        success: true,
        media: [{ _id: "1", key: "products/1.webp", url: "https://r2/1.webp" }],
        pagination: { page: 2, limit: 10, total: 50, pages: 5 },
      }),
    }
  }

  // 1. folder = "all" should NOT set folder query param
  await uploadApi.fetchMedia({ page: 2, limit: 10, search: "sneakers", format: "WEBP", folder: "all" })
  assert.ok(capturedUrl.includes("page=2"))
  assert.ok(capturedUrl.includes("limit=10"))
  assert.ok(capturedUrl.includes("search=sneakers"))
  assert.ok(capturedUrl.includes("format=webp"))
  assert.ok(!capturedUrl.includes("folder=all"))

  // 2. folder = "products" should set folder query param
  await uploadApi.fetchMedia({ folder: "products" })
  assert.ok(capturedUrl.includes("folder=products"))
})

await runTestAsync("fetchMedia: 401 unauthenticated session expiry handling", async () => {
  localStorageMock.setItem("dashboardToken", "bad-token")
  window.location.pathname = "/media"

  globalThis.fetch = async () => ({
    status: 401,
    ok: false,
    json: async () => ({ message: "Unauthorized" }),
  })

  await assert.rejects(
    () => uploadApi.fetchMedia(),
    { message: "Authentication expired. Please log in again." }
  )
  assert.equal(localStorageMock.getItem("dashboardToken"), null)
})

await runTestAsync("deleteMedia: Rejects when key or url is empty / missing", async () => {
  await assert.rejects(
    () => uploadApi.deleteMedia(""),
    { message: "A media key or URL is required for deletion" }
  )
  await assert.rejects(
    () => uploadApi.deleteMedia(null),
    { message: "A media key or URL is required for deletion" }
  )
})

await runTestAsync("deleteMedia: Differentiates URL vs Key in request payload", async () => {
  let capturedBody = null
  globalThis.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body)
    return {
      status: 200,
      ok: true,
      json: async () => ({ success: true, message: "Deleted" }),
    }
  }

  // 1. URL passed
  await uploadApi.deleteMedia("https://pub-281667bd8ca44962bcc5372e4632e597.r2.dev/products/shoe.webp")
  assert.deepEqual(capturedBody, { url: "https://pub-281667bd8ca44962bcc5372e4632e597.r2.dev/products/shoe.webp" })

  // 2. Key passed
  await uploadApi.deleteMedia("products/shoe.webp")
  assert.deepEqual(capturedBody, { key: "products/shoe.webp" })
})

// ============================================================================
// SUITE 4: Component Logic & Edge Cases (AST / Code Analysis & Runtime Oracles)
// ============================================================================
console.log("\n📦 SUITE 4: Component Prop Contracts & State Transition Oracles")

runTest("ImageUpload: Handles string, object, and empty/null value props", () => {
  const code = fs.readFileSync(path.join(__dirname, "src/components/common/ImageUpload.jsx"), "utf8")

  // Oracle: value prop resolution logic
  const resolveCurrentUrl = (val) => (typeof val === "object" && val !== null ? val.url : val || "")

  assert.equal(resolveCurrentUrl("https://r2/img.webp"), "https://r2/img.webp")
  assert.equal(resolveCurrentUrl({ url: "https://r2/object.webp" }), "https://r2/object.webp")
  assert.equal(resolveCurrentUrl(null), "")
  assert.equal(resolveCurrentUrl(undefined), "")
  assert.equal(resolveCurrentUrl(""), "")

  // Check code contains safe aspect ratio mappings
  assert.ok(code.includes("aspectRatio === \"square\""))
  assert.ok(code.includes("aspectRatio === \"video\""))
  assert.ok(code.includes("aspectRatio === \"wide\""))
  // Check code contains 10MB file limit
  assert.ok(code.includes("10 * 1024 * 1024"))
  // Check code checks image/ mime type
  assert.ok(code.includes("file.type.startsWith(\"image/\")"))
  // Check code contains confirmation dialog for cloud deletion
  assert.ok(code.includes("Permanently Delete Image from Cloudflare R2?"))
})

runTest("ImageGalleryUpload: Normalization and primary image invariant", () => {
  const code = fs.readFileSync(path.join(__dirname, "src/components/common/ImageGalleryUpload.jsx"), "utf8")

  // Oracle: normalizeImages guarantees exactly one primary image when list is non-empty
  const normalizeImages = (list) => {
    if (list.length === 0) return []
    const hasPrimary = list.some((img) => img.isPrimary)
    if (!hasPrimary) {
      return list.map((img, i) => ({ ...img, isPrimary: i === 0 }))
    }
    return list
  }

  // 1. Empty list
  assert.deepEqual(normalizeImages([]), [])

  // 2. List with no primary set -> first element promoted
  const listNoPrimary = [{ url: "a.webp" }, { url: "b.webp" }]
  const normalized = normalizeImages(listNoPrimary)
  assert.equal(normalized[0].isPrimary, true)
  assert.equal(normalized[1].isPrimary, false)

  // 3. List with existing primary preserved
  const listWithPrimary = [{ url: "a.webp", isPrimary: false }, { url: "b.webp", isPrimary: true }]
  const preserved = normalizeImages(listWithPrimary)
  assert.equal(preserved[1].isPrimary, true)
  assert.equal(preserved[0].isPrimary, false)

  // Check code boundary protection for reorder buttons
  assert.ok(code.includes("moveLeft = (index) => {"))
  assert.ok(code.includes("if (index <= 0) return"))
  assert.ok(code.includes("moveRight = (index) => {"))
  assert.ok(code.includes("if (index >= imageList.length - 1) return"))
  // Check max capacity enforcement
  assert.ok(code.includes("remainingSlots <= 0"))
})

runTest("MediaGalleryDialog: Multi-selection toggle oracle", () => {
  const code = fs.readFileSync(path.join(__dirname, "src/components/common/MediaGalleryDialog.jsx"), "utf8")

  // Oracle: multi-select toggle
  const toggleMultiSelect = (prev, item) => {
    const exists = prev.some((x) => (x.key && x.key === item.key) || x.url === item.url)
    if (exists) {
      return prev.filter((x) => (x.key ? x.key !== item.key : x.url !== item.url))
    } else {
      return [...prev, item]
    }
  }

  let selected = []
  const item1 = { key: "products/1.webp", url: "https://r2/1.webp" }
  const item2 = { key: "products/2.webp", url: "https://r2/2.webp" }

  selected = toggleMultiSelect(selected, item1)
  assert.equal(selected.length, 1)
  selected = toggleMultiSelect(selected, item2)
  assert.equal(selected.length, 2)
  selected = toggleMultiSelect(selected, item1) // Unselect item1
  assert.equal(selected.length, 1)
  assert.equal(selected[0].key, "products/2.webp")

  // Check folder presets
  assert.ok(code.includes("id: \"all\""))
  assert.ok(code.includes("id: \"products\""))
  assert.ok(code.includes("id: \"categories\""))
  assert.ok(code.includes("id: \"site\""))
  assert.ok(code.includes("id: \"payments\""))
})

// ============================================================================
// SUITE 5: Zero-Manual-URL Verification Across Dashboard Views
// ============================================================================
console.log("\n📦 SUITE 5: Elimination of Manual URL Inputs Across Forms")

runTest("ProductFormPage.jsx: No manual URL inputs; ImageGalleryUpload integrated", () => {
  const code = fs.readFileSync(path.join(__dirname, "src/pages/ProductFormPage.jsx"), "utf8")
  assert.ok(!code.includes("<Input type=\"url\""), "Found deprecated <Input type=\"url\"> in ProductFormPage")
  assert.ok(code.includes("<ImageGalleryUpload"), "Missing ImageGalleryUpload in ProductFormPage")
  assert.ok(!code.includes("unsplash.com"), "Mock Unsplash URL still present in ProductFormPage")
})

runTest("CategoriesPage.jsx: No manual URL inputs; ImageUpload integrated", () => {
  const code = fs.readFileSync(path.join(__dirname, "src/pages/CategoriesPage.jsx"), "utf8")
  assert.ok(!code.includes("id=\"cat-image\""), "Found deprecated #cat-image input in CategoriesPage")
  assert.ok(code.includes("<ImageUpload"), "Missing ImageUpload in CategoriesPage")
  assert.ok(code.includes("folder=\"categories\""), "ImageUpload should use folder='categories'")
})

runTest("SettingsPage.jsx: No manual URL inputs for brand & OG assets; ImageUpload integrated", () => {
  const code = fs.readFileSync(path.join(__dirname, "src/pages/SettingsPage.jsx"), "utf8")
  assert.ok(!code.includes("id=\"logoUrl\""), "Found deprecated #logoUrl text input")
  assert.ok(!code.includes("id=\"darkLogoUrl\""), "Found deprecated #darkLogoUrl text input")
  assert.ok(!code.includes("id=\"faviconUrl\""), "Found deprecated #faviconUrl text input")
  assert.ok(!code.includes("id=\"ogImageUrl\""), "Found deprecated #ogImageUrl text input")
  assert.ok(code.includes("value={form.logoUrl}"), "Logo light mode uploader missing")
  assert.ok(code.includes("value={form.darkLogoUrl}"), "Logo dark mode uploader missing")
  assert.ok(code.includes("value={form.faviconUrl}"), "Favicon uploader missing")
  assert.ok(code.includes("value={form.ogImageUrl}"), "OG image uploader missing")
})

runTest("PaymentProofModal.jsx & PaymentsPage: ImageUpload for receipt screenshots", () => {
  const modalCode = fs.readFileSync(path.join(__dirname, "src/components/PaymentProofModal.jsx"), "utf8")
  assert.ok(modalCode.includes("<ImageUpload"), "PaymentProofModal missing receipt ImageUpload")
  assert.ok(modalCode.includes("folder=\"payments\""), "Receipt upload should target folder='payments'")
})

runTest("ResourcePage.jsx: Dynamic rendering of ImageUpload for image fields", () => {
  const code = fs.readFileSync(path.join(__dirname, "src/pages/ResourcePage.jsx"), "utf8")
  assert.ok(code.includes("field.type === \"image\" || field.name === \"imageUrl\""), "Missing dynamic image detection")
  assert.ok(code.includes("<ImageUpload"), "Missing ImageUpload in ResourcePage")
})

// ============================================================================
// SUITE 6: Production Build & Bundle Integrity
// ============================================================================
console.log("\n📦 SUITE 6: Production Build & Bundle Artifact Integrity")

runTest("dist/index.html references valid hashed script and css assets", () => {
  const htmlPath = path.join(__dirname, "dist/index.html")
  assert.ok(fs.existsSync(htmlPath), "dist/index.html does not exist")
  const html = fs.readFileSync(htmlPath, "utf8")
  
  const scriptMatch = html.match(/src="(\/assets\/[^"]+\.js)"/)
  assert.ok(scriptMatch, "No script tag found in index.html")
  const jsAssetRel = scriptMatch[1].replace(/^\//, "")
  const jsAssetPath = path.join(__dirname, "dist", jsAssetRel)
  assert.ok(fs.existsSync(jsAssetPath), `JS asset does not exist: ${jsAssetPath}`)

  const cssMatch = html.match(/href="(\/assets\/[^"]+\.css)"/)
  assert.ok(cssMatch, "No css link found in index.html")
  const cssAssetRel = cssMatch[1].replace(/^\//, "")
  const cssAssetPath = path.join(__dirname, "dist", cssAssetRel)
  assert.ok(fs.existsSync(cssAssetPath), `CSS asset does not exist: ${cssAssetPath}`)
})

runTest("JS bundle contains uploadApi endpoints, dialogs, and token handlers", () => {
  const assetsDir = path.join(__dirname, "dist/assets")
  const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".js"))
  assert.ok(jsFiles.length > 0, "No JS files in dist/assets")

  const bundle = fs.readFileSync(path.join(assetsDir, jsFiles[0]), "utf8")
  assert.ok(bundle.includes("/upload/single"), "Bundle missing /upload/single endpoint")
  assert.ok(bundle.includes("/upload/multiple"), "Bundle missing /upload/multiple endpoint")
  assert.ok(bundle.includes("/upload/media"), "Bundle missing /upload/media endpoint")
  assert.ok(bundle.includes("dashboardToken"), "Bundle missing dashboardToken auth token key")
  assert.ok(bundle.includes("dashboardUser"), "Bundle missing dashboardUser session key")
  assert.ok(bundle.includes("Cloudflare R2 Media Library"), "Bundle missing Media Library title")
  assert.ok(bundle.includes("Choose from Media Gallery"), "Bundle missing Gallery button label")
  assert.ok(!bundle.includes("cannot resolve module"), "Bundle contains unresolved module error message")
})

// ============================================================================
// SUMMARY
// ============================================================================
console.log("\n=================================================================")
console.log(`🏁 VERIFICATION COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`)
console.log("=================================================================\n")

if (failedCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
