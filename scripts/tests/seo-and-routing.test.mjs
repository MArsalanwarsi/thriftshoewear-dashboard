import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = fileURLToPath(new URL("../..", import.meta.url))

function extractSidebarUrls() {
  const sidebarSrc = fs.readFileSync(path.join(projectRoot, "src/components/app-sidebar.jsx"), "utf8")
  return [...sidebarSrc.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1])
}

test("SEO & Routing Integrity: every sidebar URL resolves to an App Router page", () => {
  const urls = extractSidebarUrls()
  assert.ok(urls.length >= 12)

  for (const url of urls) {
    const clean = url.replace(/^\//, "")
    const candidate = clean
      ? path.join(projectRoot, "src/app/(dashboard)", clean, "page.jsx")
      : path.join(projectRoot, "src/app/(dashboard)/page.jsx")
    assert.ok(fs.existsSync(candidate), `Sidebar route "${url}" is missing App Router page at ${candidate}`)
  }
})

test("GEO & Technical SEO: robots.js, sitemap.js, llms.txt, llms-full.txt, and JSON-LD schema are active", async () => {
  const [robotsMod, sitemapMod] = await Promise.all([
    import("../../src/app/robots.js"),
    import("../../src/app/sitemap.js"),
  ])

  const robots = robotsMod.default()
  assert.ok(robots.sitemap?.includes("/sitemap.xml"))
  assert.ok(robots.rules[0].allow.includes("/"))

  const sitemapEntries = sitemapMod.default()
  assert.ok(sitemapEntries.some((entry) => entry.url.endsWith("/login")))

  const llms = fs.readFileSync(path.join(projectRoot, "public/llms.txt"), "utf8")
  const llmsFull = fs.readFileSync(path.join(projectRoot, "public/llms-full.txt"), "utf8")
  assert.match(llms, /\[.*\]\(https:\/\/.*\)/)
  assert.match(llmsFull, /## Architecture Overview/)

  const layoutSrc = fs.readFileSync(path.join(projectRoot, "src/app/layout.jsx"), "utf8")
  assert.match(layoutSrc, /BRAND_ORGANIZATION_SCHEMA/)
  assert.match(layoutSrc, /openGraph/)
  assert.match(layoutSrc, /twitter/)
})
