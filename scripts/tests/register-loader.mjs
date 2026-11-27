import { register } from "node:module"

const mockClassList = {
  add: () => {},
  remove: () => {},
  contains: () => false,
  toggle: () => false,
}

const mockNode = {
  setAttribute: () => {},
  getAttribute: () => "",
  removeAttribute: () => {},
  appendChild: () => mockNode,
  removeChild: () => mockNode,
  style: {},
  classList: mockClassList,
}

const mockDocument = {
  body: {
    style: { overflow: "" },
    scrollHeight: 1000,
    classList: mockClassList,
    appendChild: () => mockNode,
    removeChild: () => mockNode,
  },
  head: { appendChild: () => mockNode, removeChild: () => mockNode },
  documentElement: {
    getAttribute: (attr) => (attr === "dir" ? "ltr" : ""),
    setAttribute: () => {},
    style: {},
    classList: mockClassList,
  },
  createElement: () => ({ ...mockNode, style: {}, classList: mockClassList }),
  createTextNode: () => ({ ...mockNode }),
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
}

globalThis.document = mockDocument

const memStorage = new Map()
const mockLocalStorage = {
  getItem: (k) => (memStorage.has(k) ? memStorage.get(k) : null),
  setItem: (k, v) => memStorage.set(k, String(v)),
  removeItem: (k) => memStorage.delete(k),
  clear: () => memStorage.clear(),
}

if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = mockLocalStorage
}

if (typeof globalThis.window === "undefined") {
  globalThis.window = {
    innerWidth: 1280,
    innerHeight: 800,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    location: { pathname: "/", href: "http://localhost:3000/" },
    document: mockDocument,
    localStorage: globalThis.localStorage,
    matchMedia: () => ({
      matches: false,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  }
}

if (typeof globalThis.navigator === "undefined") {
  globalThis.navigator = {
    userAgent: "Mozilla/5.0 (Node.js Dashboard Test)",
    platform: "Win32",
    language: "en-US",
  }
}

register(new URL("./test-hooks.mjs", import.meta.url).href)
