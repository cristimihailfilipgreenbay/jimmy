import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: {
    host: true,
    port: 5173,
    // Bind mounts on macOS/Windows do not emit file events reliably.
    watch: { usePolling: true },
    // The browser calls /api/*; Vite forwards to the backend (no CORS needed).
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:8000',
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
