import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

const apiProxy = {
  '/api': {
    target: process.env.SECRET_SANTA_API_TARGET ?? 'http://127.0.0.1:8787',
    changeOrigin: true,
  },
}

export default defineConfig({
  root: appRoot,
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: apiProxy,
  },
  preview: {
    port: 3000,
    proxy: apiProxy,
  },
  plugins: [
    // TanStack Start plugin MUST come before the React plugin.
    tanstackStart(),
    viteReact(),
  ],
})
