import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const basename = process.env.VITE_BASENAME || ""
const normalizedBase = basename
  ? `/${basename.replace(/^\/+|\/+$/g, "")}/`
  : "/"
const routerBasename = normalizedBase === "/" ? "" : normalizedBase.slice(0, -1)

// https://vite.dev/config/
export default defineConfig({
  base: normalizedBase,
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_BASENAME': JSON.stringify(routerBasename),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ["recharts"],
        },
      },
    },
  },
})
