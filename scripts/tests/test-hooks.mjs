import fs from "node:fs"
import { fileURLToPath } from "node:url"
import nextSwc from "next/dist/build/swc/index.js"

const projectRootUrl = new URL("../../", import.meta.url)
const mockNextLinkUrl = new URL("./__mock_next_link__.mjs", import.meta.url).href
const mockNextNavUrl = new URL("./__mock_next_navigation__.mjs", import.meta.url).href
const mockNextImageUrl = new URL("./__mock_next_image__.mjs", import.meta.url).href
const mockNextDynamicUrl = new URL("./__mock_next_dynamic__.mjs", import.meta.url).href
const mockNextFontGoogleUrl = new URL("./__mock_next_font_google__.mjs", import.meta.url).href

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/link") {
    return { url: mockNextLinkUrl, shortCircuit: true }
  }
  if (specifier === "next/navigation") {
    return { url: mockNextNavUrl, shortCircuit: true }
  }
  if (specifier === "next/image") {
    return { url: mockNextImageUrl, shortCircuit: true }
  }
  if (specifier === "next/dynamic") {
    return { url: mockNextDynamicUrl, shortCircuit: true }
  }
  if (specifier === "next/font/google") {
    return { url: mockNextFontGoogleUrl, shortCircuit: true }
  }

  let normalized = specifier
  if (normalized.startsWith("@/")) {
    normalized = new URL("./src/" + normalized.slice(2), projectRootUrl).href
  }

  try {
    return await nextResolve(normalized, context)
  } catch (err) {
    if (err.code === "ERR_MODULE_NOT_FOUND" || err.code === "ERR_UNSUPPORTED_DIR_IMPORT") {
      const parentURL = context.parentURL
      const isRelative =
        normalized.startsWith("./") ||
        normalized.startsWith("../") ||
        normalized.startsWith("/") ||
        normalized.startsWith("file://")
      if (parentURL && isRelative) {
        for (const ext of [".js", ".jsx", ".json", "/index.js", "/index.jsx"]) {
          try {
            return await nextResolve(normalized + ext, context)
          } catch {
            // continue
          }
        }
      }
    }
    throw err
  }
}

export async function load(url, context, nextLoad) {
  if (url === mockNextLinkUrl) {
    return {
      format: "module",
      shortCircuit: true,
      source: `import React from 'react';
export default function MockNextLink({ href, children, ...props }) {
  const url = typeof href === 'string' ? href : (href?.pathname || '#');
  return React.createElement('a', { href: url, ...props }, children);
}`,
    }
  }

  if (url === mockNextNavUrl) {
    return {
      format: "module",
      shortCircuit: true,
      source: `export function useRouter() {
  return { push() {}, replace() {}, back() {}, forward() {}, refresh() {}, prefetch: async () => {} };
}
export function usePathname() { return '/'; }
export function useSearchParams() { return new URLSearchParams(); }
export function useParams() { return {}; }`,
    }
  }

  if (url === mockNextImageUrl) {
    return {
      format: "module",
      shortCircuit: true,
      source: `import React from 'react';
export default function MockNextImage({ src, alt = '', ...rest }) {
  const resolved = typeof src === 'string' ? src : (src?.src || '');
  return React.createElement('img', { src: resolved, alt, ...rest });
}`,
    }
  }

  if (url === mockNextDynamicUrl) {
    return {
      format: "module",
      shortCircuit: true,
      source: `import React from 'react';
export default function mockDynamic(importer, options = {}) {
  return function MockDynamic(props) {
    if (options?.loading) return React.createElement(options.loading);
    return null;
  };
}`,
    }
  }

  if (url === mockNextFontGoogleUrl) {
    return {
      format: "module",
      shortCircuit: true,
      source: `export function Urbanist() { return { className: 'font-urbanist', variable: '--font-urbanist' }; }`,
    }
  }

  if (/\.json$/.test(url)) {
    const filePath = fileURLToPath(url)
    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${fs.readFileSync(filePath, "utf-8")};`,
    }
  }

  if (/\.(png|jpg|jpeg|gif|webp|svg|css)$/.test(url)) {
    return {
      format: "module",
      shortCircuit: true,
      source: `export default {};`,
    }
  }

  if (/\.jsx$/.test(url)) {
    const filePath = fileURLToPath(url)
    const sourceCode = fs.readFileSync(filePath, "utf-8")
    const transformed = nextSwc.transformSync(sourceCode, {
      filename: filePath,
      jsc: {
        parser: { syntax: "ecmascript", jsx: true },
        transform: { react: { runtime: "automatic" } },
      },
    })
    return {
      format: "module",
      shortCircuit: true,
      source: transformed.code,
    }
  }

  return nextLoad(url, context)
}
