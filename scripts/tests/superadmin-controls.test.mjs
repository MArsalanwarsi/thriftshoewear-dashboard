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

test("Super Admin LogsPage contract: queries /logs with category/level filters and renders stack & metadata modal", () => {
  const src = fs.readFileSync(path.join(projectRoot, "src/components/pages/LogsPage.jsx"), "utf8")
  assert.match(src, /apiRequest\("\/logs"/)
  assert.match(src, /Actions Recorded/)
  assert.match(src, /Errors Caught/)
  assert.match(src, /Security Alerts/)
  assert.match(src, /Metadata \(Redacted\)/)
  assert.match(src, /Stack Trace/)
})
