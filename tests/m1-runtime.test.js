import { createServer } from "vite"
import assert from "node:assert/strict"
import React from "react"
import { renderToString } from "react-dom/server"

console.log("=== Running Challenger M1 Runtime Verifier ===")

class MockDOMTokenList {
  constructor() {
    this.classes = new Set()
  }
  add(...tokens) {
    tokens.forEach(t => this.classes.add(t))
  }
  remove(...tokens) {
    tokens.forEach(t => this.classes.delete(t))
  }
  contains(token) {
    return this.classes.has(token)
  }
  get value() {
    return Array.from(this.classes).join(" ")
  }
}

const mockLocalStorage = {
  _store: new Map(),
  getItem(k) { return this._store.has(k) ? this._store.get(k) : null },
  setItem(k, v) { this._store.set(k, String(v)) },
  removeItem(k) { this._store.delete(k) },
  clear() { this._store.clear() }
}

const rootElement = {
  classList: new MockDOMTokenList(),
  getAttribute(attr) { return null }
}

let simulatedPrefersDark = false
let systemSchemeListeners = new Set()

const mockMatchMedia = (query) => {
  if (query === "(prefers-color-scheme: dark)") {
    return {
      query,
      get matches() { return simulatedPrefersDark },
      addEventListener(evt, fn) { if (evt === "change") systemSchemeListeners.add(fn) },
      removeEventListener(evt, fn) { if (evt === "change") systemSchemeListeners.delete(fn) },
      dispatchEvent(e) { systemSchemeListeners.forEach(fn => fn(e)) }
    }
  }
  let mobileListeners = new Set()
  return {
    query,
    get matches() { return globalThis.window.innerWidth < 768 },
    addEventListener(evt, fn) { if (evt === "change") mobileListeners.add(fn) },
    removeEventListener(evt, fn) { if (evt === "change") mobileListeners.delete(fn) },
    dispatchEvent(e) { mobileListeners.forEach(fn => fn(e)) }
  }
}

const mockHead = {
  appendChild() {}
}

globalThis.window = {
  document: {
    documentElement: rootElement,
    head: mockHead,
    getElementsByTagName(tag) { return tag === "head" ? [mockHead] : [] },
    createElement(tag) {
      return {
        type: "",
        appendChild() {},
        styleSheet: {}
      }
    }
  },
  innerWidth: 1024,
  matchMedia: mockMatchMedia,
  getComputedStyle() { return { direction: "ltr" } }
}
globalThis.document = globalThis.window.document
globalThis.localStorage = mockLocalStorage

async function runTests() {
  const viteServer = await createServer({
    server: { middlewareMode: true }
  })

  let testsPassed = 0
  let testsTotal = 0

  function test(name, fn) {
    testsTotal++
    try {
      fn()
      console.log(`  ✓ PASS: ${name}`)
      testsPassed++
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`)
      console.error(err)
    }
  }

  // Load modules via Vite SSR
  const { useIsMobile } = await viteServer.ssrLoadModule("./src/hooks/use-mobile.js")
  const { ThemeProvider, useTheme } = await viteServer.ssrLoadModule("./src/components/theme-provider.jsx")
  const { Toaster } = await viteServer.ssrLoadModule("./src/components/ui/sonner.jsx")

  console.log("\n--- Suite 1: use-mobile.js Logic & Contracts ---")
  test("useIsMobile is exported and is a function", () => {
    assert.equal(typeof useIsMobile, "function")
  })

  test("useIsMobile renders default state without throwing during SSR", () => {
    let captured = null
    function MobileComponent() {
      captured = useIsMobile()
      return React.createElement("div", null, String(captured))
    }
    const html = renderToString(React.createElement(MobileComponent))
    assert.equal(html, "<div>false</div>")
    assert.equal(captured, false)
  })

  console.log("\n--- Suite 2: ThemeProvider Storage & Class Contracts ---")
  test("ThemeProvider and useTheme are exported functions", () => {
    assert.equal(typeof ThemeProvider, "function")
    assert.equal(typeof useTheme, "function")
  })

  test("Naked useTheme returns fallback state (initialState contract)", () => {
    let captured = null
    function NakedComponent() {
      captured = useTheme()
      return React.createElement("div", null, captured.theme)
    }
    const html = renderToString(React.createElement(NakedComponent))
    assert.equal(html, "<div>system</div>")
    assert.equal(captured.theme, "system")
    assert.equal(typeof captured.setTheme, "function")
  })

  test("ThemeProvider renders children with context state", () => {
    let captured = null
    function Consumer() {
      captured = useTheme()
      return React.createElement("div", null, captured.theme)
    }
    const html = renderToString(
      React.createElement(
        ThemeProvider,
        { defaultTheme: "dark", storageKey: "test-node-theme" },
        React.createElement(Consumer)
      )
    )
    assert.equal(html, "<div>dark</div>")
    assert.equal(captured.theme, "dark")
  })

  console.log("\n--- Suite 3: Sonner Toaster Primitive ---")
  test("Toaster component is exported and renders section", () => {
    assert.equal(typeof Toaster, "function")
    const html = renderToString(
      React.createElement(
        ThemeProvider,
        { defaultTheme: "system" },
        React.createElement(Toaster)
      )
    )
    assert.ok(html.includes("<section"))
    assert.ok(html.includes("aria-label=\"Notifications"))
  })

  await viteServer.close()

  console.log(`\nRuntime verifier completed: ${testsPassed}/${testsTotal} passed.\n`)
  if (testsPassed !== testsTotal) process.exit(1)
}

runTests().catch(err => {
  console.error("Test runner failed:", err)
  process.exit(1)
})
