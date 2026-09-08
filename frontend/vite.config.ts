import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const LOCAL_BACKEND_ORIGIN = 'http://localhost:5020'

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Robots-Tag': 'noindex, nofollow',
}

function buildProxy(env: Record<string, string>): Record<string, ProxyOptions> {
  const useApi = env.VITE_USE_API === 'true' || env.VITE_USE_API === '1'
  const orgApiUrl = (env.ORG_API_URL || env.VITE_URL_API)?.trim()
  const orgApiKey = (env.ORG_API_KEY || env.VITE_API_KEY)?.trim()

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
      // Invalid org API URL — skip org proxy
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
      headers: SECURITY_HEADERS,
      proxy: Object.keys(proxy).length ? proxy : undefined,
    },
    preview: {
      host: '0.0.0.0',
      port: 3020,
      strictPort: true,
      headers: SECURITY_HEADERS,
      proxy: Object.keys(proxy).length ? proxy : undefined,
    },
    resolve: { tsconfigPaths: true },
    plugins: [tailwindcss(), tanstackStart(), viteReact()],
  }
})
