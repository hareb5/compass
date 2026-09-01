import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const LOCAL_BACKEND_ORIGIN = 'http://localhost:5020'

function buildProxy(env: Record<string, string>): Record<string, ProxyOptions> {
  const useApi = env.VITE_USE_API === 'true' || env.VITE_USE_API === '1'
  const orgApiUrl = env.VITE_URL_API?.trim()
  const orgApiKey = env.VITE_API_KEY?.trim()

  const proxy: Record<string, ProxyOptions> = {}

  if (useApi) {
    proxy['/api'] = { target: LOCAL_BACKEND_ORIGIN, changeOrigin: true }
    proxy['/health'] = { target: LOCAL_BACKEND_ORIGIN, changeOrigin: true }
  }

  if (orgApiUrl) {
    try {
      const parsed = new URL(orgApiUrl)
      const targetPath = `${parsed.pathname}${parsed.search}`
      proxy['/org-api/employees'] = {
        target: parsed.origin,
        changeOrigin: true,
        rewrite: () => targetPath || '/',
        configure: (proxyServer) => {
          proxyServer.on('proxyReq', (proxyReq) => {
            if (orgApiKey) {
              proxyReq.setHeader('Authorization', `Bearer ${orgApiKey}`)
            }
          })
        },
      }
    } catch {
      // Invalid VITE_URL_API — skip org proxy
    }
  }

  return proxy
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = buildProxy(env)

  return {
    server: {
      host: '0.0.0.0',
      port: 3020,
      strictPort: true,
      proxy: Object.keys(proxy).length ? proxy : undefined,
    },
    preview: {
      host: '0.0.0.0',
      port: 3020,
      strictPort: true,
      proxy: Object.keys(proxy).length ? proxy : undefined,
    },
    resolve: { tsconfigPaths: true },
    plugins: [tailwindcss(), tanstackStart(), viteReact()],
  }
})
