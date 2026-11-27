import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = fileURLToPath(new URL("../..", import.meta.url))

function walkSrc(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkSrc(full, out)
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

test("Architecture Hygiene: Zero react-router-dom, zero import.meta.env, zero Vite legacy files", () => {
  for (const legacy of ["vite.config.js", "index.html", "src/App.jsx", "src/main.jsx", "src/index.css"]) {
    assert.equal(fs.existsSync(path.join(projectRoot, legacy)), false, `Legacy Vite file still exists: ${legacy}`)
  }

  const srcFiles = walkSrc(path.join(projectRoot, "src"))
  for (const file of srcFiles) {
    const content = fs.readFileSync(file, "utf8")
    assert.equal(
      content.includes("react-router-dom"),
      false,
      `${path.relative(projectRoot, file)} still references react-router-dom`
    )
    assert.equal(
      content.includes("import.meta.env"),
      false,
      `${path.relative(projectRoot, file)} still references import.meta.env`
    )
    assert.equal(
      /<Link[\s\S]*?\bto\s*=/.test(content),
      false,
      `${path.relative(projectRoot, file)} still uses Link to= instead of href=`
    )
    assert.equal(
      /\bnavigate\s*\(|,\s*navigate\b/.test(content),
      false,
      `${path.relative(projectRoot, file)} still references navigate instead of router`
    )
  }

  const themeSrc = fs.readFileSync(path.join(projectRoot, "src/components/theme-provider.jsx"), "utf8")
  assert.equal(themeSrc.includes("createContext"), false, "Custom ThemeProvider must not use React Context API")
})

test("App Router completeness: every required route file exists in src/app", () => {
  const requiredPages = [
    "src/app/(auth)/login/page.jsx",
    "src/app/(auth)/register/page.jsx",
    "src/app/(auth)/forgot-password/page.jsx",
    "src/app/(auth)/reset-password/[token]/page.jsx",
    "src/app/(auth)/verify-email/[token]/page.jsx",
    "src/app/(dashboard)/layout.jsx",
    "src/app/(dashboard)/page.jsx",
    "src/app/(dashboard)/products/page.jsx",
    "src/app/(dashboard)/products/new/page.jsx",
    "src/app/(dashboard)/products/[id]/page.jsx",
    "src/app/(dashboard)/orders/page.jsx",
    "src/app/(dashboard)/orders/[id]/page.jsx",
    "src/app/(dashboard)/payments/page.jsx",
    "src/app/(dashboard)/coupons/page.jsx",
    "src/app/(dashboard)/categories/page.jsx",
    "src/app/(dashboard)/users/page.jsx",
    "src/app/(dashboard)/users/access-requests/page.jsx",
    "src/app/(dashboard)/settings/page.jsx",
    "src/app/(dashboard)/shipments/page.jsx",
    "src/app/(dashboard)/reviews/page.jsx",
    "src/app/(dashboard)/assets/page.jsx",
    "src/app/(dashboard)/logs/page.jsx",
    "src/app/(dashboard)/features/page.jsx",
  ]
  for (const rel of requiredPages) {
    assert.ok(fs.existsSync(path.join(projectRoot, rel)), `Missing App Router file: ${rel}`)
  }
})
