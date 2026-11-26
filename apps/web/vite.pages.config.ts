import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

// Start сам пробрасывает router.basepath в клиент и сервер при гидратации.
const segment = (process.env.PAGES_BASE ?? '').replace(/^\/+|\/+$/g, '')
const routerBasepath = segment ? `/${segment}` : '/'
process.env.VITE_PAGES_BASE = routerBasepath
process.env.VITE_PAGES_MODE = '1'

/**
 * GitHub Pages раздаёт только статику. Сборка prerender'ит витринные страницы,
 * а базовый путь задаётся через VITE_PAGES_BASE (например, /SecretSanta).
 * Относительные ассеты (base: '') работают и для корня, и для подпапки.
 */
export default defineConfig({
  root: appRoot,
  base: '',
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    tanstackStart({
      // Start перезаписывает basepath роутера при гидратации; без явного
      // значения он берётся из Vite base и становится '' (404 после загрузки).
      router: { basepath: routerBasepath },
      // Shell без привязки к маршруту нужен для 404.html (deep-link'и комнат).
      spa: { enabled: true },
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: true,
        crawlLinks: true,
        // Комнаты требуют API и SSE; на Pages остаётся только витрина.
        filter: ({ path }) => !path.startsWith('/room/'),
        failOnError: true,
        onSuccess: ({ page }) => console.log(`[pages] prerendered ${page.path}`),
      },
    }),
    viteReact(),
  ],
})
