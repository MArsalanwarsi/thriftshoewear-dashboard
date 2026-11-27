import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = fileURLToPath(new URL("../..", import.meta.url))
const nextStaticDir = path.join(projectRoot, ".next", "static")
const MAX_CHUNK_BYTES = 512000

test("Dashboard Bundle Gate: production Next.js build emits split chunks under 500 KiB and all App Router routes", () => {
  assert.ok(fs.existsSync(nextStaticDir), "Expected .next/static build output; run npm run build first")

  const jsFiles = []
  const cssFiles = []

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith(".js")) jsFiles.push({ file: path.relative(nextStaticDir, full), bytes: fs.statSync(full).size })
      else if (entry.name.endsWith(".css")) cssFiles.push({ file: path.relative(nextStaticDir, full), bytes: fs.statSync(full).size })
    }
  }

  walk(nextStaticDir)
  assert.ok(jsFiles.length >= 5, `Expected split JS chunks >= 5, got ${jsFiles.length}`)
  assert.ok(cssFiles.length >= 1, `Expected at least 1 CSS bundle, got ${cssFiles.length}`)

  const oversized = jsFiles.filter((c) => c.bytes > MAX_CHUNK_BYTES)
  assert.deepEqual(
    oversized,
    [],
    `Found JS chunks exceeding ${MAX_CHUNK_BYTES}B: ${oversized.map((c) => `${c.file} (${c.bytes}B)`).join(", ")}`
  )

  const nextDir = path.join(projectRoot, ".next")
  assert.ok(fs.existsSync(path.join(nextDir, "BUILD_ID")), "Expected .next/BUILD_ID")

  const routesManifest = JSON.parse(fs.readFileSync(path.join(nextDir, "routes-manifest.json"), "utf8"))
  assert.equal(routesManifest.appType, "app", "Next.js routes-manifest must confirm App Router")

  const appPaths = JSON.parse(fs.readFileSync(path.join(nextDir, "server", "app-paths-manifest.json"), "utf8"))
  for (const expected of [
    "/(dashboard)/page",
    "/(dashboard)/logs/page",
    "/(dashboard)/features/page",
    "/(auth)/login/page",
  ]) {
    assert.ok(appPaths[expected], `Missing compiled App Router handler for ${expected}`)
  }
})
