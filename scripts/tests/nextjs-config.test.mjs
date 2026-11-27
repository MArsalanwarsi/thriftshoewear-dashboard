import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = fileURLToPath(new URL("../..", import.meta.url))

test("Next.js Config: next.config.mjs enforces webpack splitChunks & image formats", async () => {
  const configMod = await import("../../next.config.mjs")
  const config = configMod.default

  assert.equal(config.reactStrictMode, true)
  assert.ok(config.images?.formats?.includes("image/avif"))
  assert.ok(config.images?.formats?.includes("image/webp"))
  assert.ok(config.experimental?.optimizePackageImports?.includes("lucide-react"))
  assert.ok(config.experimental?.optimizePackageImports?.includes("recharts"))

  const mockClientWebpack = { module: { rules: [] }, plugins: [] }
  const clientRes = config.webpack(mockClientWebpack, { isServer: false })
  const groups = clientRes.optimization?.splitChunks?.cacheGroups || {}
  assert.ok(groups.framework)
  assert.ok(groups.redux)
  assert.ok(groups.radix)
  assert.ok(groups.recharts)

  const serverRes = config.webpack({ module: { rules: [] }, plugins: [] }, { isServer: true })
  assert.equal(serverRes.optimization?.splitChunks, undefined)
})

test("Package & App Layout: Vite and react-router-dom removed, Next.js 16 App Router active", async () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"))
  assert.equal(pkg.scripts.dev, "next dev --webpack")
  assert.equal(pkg.scripts.build, "next build --webpack")
  assert.equal(pkg.dependencies?.["react-router-dom"], undefined)
  assert.equal(pkg.devDependencies?.vite, undefined)
  assert.ok(pkg.dependencies.next)
  assert.ok(pkg.dependencies["@reduxjs/toolkit"])
  assert.ok(pkg.dependencies["@vercel/analytics"])
  assert.ok(pkg.dependencies["@vercel/speed-insights"])

  const layoutSrc = fs.readFileSync(path.join(projectRoot, "src/app/layout.jsx"), "utf8")
  assert.match(layoutSrc, /Urbanist/)
  assert.match(layoutSrc, /index:\s*false/)

  const robotsMod = await import("../../src/app/robots.js")
  const robots = robotsMod.default()
  assert.equal(robots.rules[0].disallow, "/")
})
