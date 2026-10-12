import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) {
              return "vendor-recharts"
            }
            if (id.includes("lucide-react")) {
              return "vendor-lucide"
            }
            if (id.includes("@reduxjs") || id.includes("react-redux")) {
              return "vendor-redux"
            }
            if (
              id.includes("@radix-ui") ||
              id.includes("sonner") ||
              id.includes("class-variance-authority") ||
              id.includes("clsx") ||
              id.includes("tailwind-merge")
            ) {
              return "vendor-ui"
            }
            if (
              id.includes("react/") ||
              id.includes("react-dom/") ||
              id.includes("react-router") ||
              id.includes("scheduler")
            ) {
              return "vendor-react"
            }
          }
        },
      },
    },
  },
})
