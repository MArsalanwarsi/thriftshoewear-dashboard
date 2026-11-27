import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { FEATURE_CATALOG } from "../../src/components/pages/FeaturesPage.jsx"

const projectRoot = fileURLToPath(new URL("../..", import.meta.url))

test("Super Admin Feature Controls contract: covers all 10 capabilities and requires password modal before PATCH", () => {
  const expectedKeys = [
    "cart",
    "wishlist",
    "checkout",
    "sales",
    "coupons",
    "reviews",
    "orderTracking",
    "registration",
    "newsletter",
    "search",
  ]
  const actualKeys = FEATURE_CATALOG.map((item) => item.key)
  assert.deepEqual(actualKeys, expectedKeys)

  const src = fs.readFileSync(path.join(projectRoot, "src/components/pages/FeaturesPage.jsx"), "utf8")
  assert.match(src, /Confirm Super Admin Password/)
  assert.match(src, /type="password"/)
  assert.match(src, /apiRequest\("\/site\/features",\s*\{\s*method:\s*"PATCH"/)
  assert.match(src, /password,/)
})

test("Super Admin LogsPage contract: queries /logs with source/category/level/status filters and supports password-locked delete/clear + resolve", () => {
  const src = fs.readFileSync(path.join(projectRoot, "src/components/pages/LogsPage.jsx"), "utf8")
  assert.match(src, /apiRequest\("\/logs"/)
  assert.match(src, /All Sources/)
  assert.match(src, /Backend API/)
  assert.match(src, /Admin Dashboard/)
  assert.match(src, /Storefront/)
  assert.match(src, /Mark Resolved/)
  assert.match(src, /Clear All Logs/)
  assert.match(src, /Confirm Clear Logs/)
  assert.match(src, /type="password"/)
  assert.match(src, /Metadata \(Redacted\)/)
  assert.match(src, /Stack Trace/)
})

test("Dashboard UI contracts: bespoke favicon, Redux light/dark button, sale toggle (no Best Seller), pre-upload compression, and SuperAdmin user controls", () => {
  const favicon = fs.readFileSync(path.join(projectRoot, "public/favicon.svg"), "utf8")
  const appIcon = fs.readFileSync(path.join(projectRoot, "src/app/icon.svg"), "utf8")
  assert.equal(favicon.includes("#863bff"), false, "Dashboard favicon must replace default Vite purple icon")
  assert.equal(appIcon.includes("#863bff"), false)

  const modeToggle = fs.readFileSync(path.join(projectRoot, "src/components/mode-toggle.jsx"), "utf8")
  assert.equal(modeToggle.includes("DropdownMenu"), false, "Theme switcher must be a direct light/dark switch button")
  assert.match(modeToggle, /toggleTheme/)

  const productForm = fs.readFileSync(path.join(projectRoot, "src/components/pages/ProductFormPage.jsx"), "utf8")
  const productsPage = fs.readFileSync(path.join(projectRoot, "src/components/pages/ProductsPage.jsx"), "utf8")
  assert.equal(productForm.includes("Best Seller"), false)
  assert.equal(productsPage.includes("Best Seller"), false)
  assert.match(productForm, /On Sale/)
  assert.match(productForm, /Before Price/)
  assert.match(productForm, /Price After Sale/)
  assert.match(productForm, /% OFF/)

  const imgUp = fs.readFileSync(path.join(projectRoot, "src/components/common/ImageUpload.jsx"), "utf8")
  const galleryUp = fs.readFileSync(path.join(projectRoot, "src/components/common/ImageGalleryUpload.jsx"), "utf8")
  assert.match(imgUp, /compressImageBeforeUpload/)
  assert.match(galleryUp, /compressImageBeforeUpload/)

  const usersPage = fs.readFileSync(path.join(projectRoot, "src/components/pages/UsersPage.jsx"), "utf8")
  assert.match(usersPage, /isSoleActiveSuperAdmin/)
  assert.match(usersPage, /Block User/)
  assert.match(usersPage, /Set Inactive/)
  assert.match(usersPage, /Delete Entire User/)
})
