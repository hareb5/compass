import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const LOCAL_BACKEND_ORIGIN = 'http://localhost:5020'
const configDir = path.dirname(fileURLToPath(import.meta.url))

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Robots-Tag': 'noindex, nofollow',
}

/** Fix UTF-8 BOM on first line of .env files (breaks VITE_MSAL_CLIENT_ID). */
function loadProjectEnv(mode: string) {
  const env = loadEnv(mode, configDir, '')
  for (const [key, value] of Object.entries(env)) {
    if (key.charCodeAt(0) === 0xfeff) {
      const normalizedKey = key.slice(1)
      if (!env[normalizedKey]?.trim()) {
        env[normalizedKey] = value
      }
    }
  }
  return env
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
  const env = loadProjectEnv(mode)
  const proxy = buildProxy(env)

  const msalClientId = env.VITE_MSAL_CLIENT_ID?.trim() ?? ''
  const msalTenantId = env.VITE_MSAL_TENANT_ID?.trim() ?? ''
  const msalRedirectUri =
    env.VITE_MSAL_REDIRECT_URI?.trim() || env.VITE_APP_URL?.trim() || ''

  if (mode === 'production' && (!msalClientId || !msalTenantId)) {
    console.warn(
      '\n[comptool] WARNING: VITE_MSAL_CLIENT_ID or VITE_MSAL_TENANT_ID is missing.\n' +
        '  Add them to frontend/.env.production or .env.production.local, then run npm run build again.\n' +
        '  Microsoft SSO will not work until you rebuild.\n',
    )
  }

  return {
    envDir: configDir,
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
    define: {
      // TanStack server bundles do not load .env at runtime — inject at build time
      'import.meta.env.VITE_MSAL_CLIENT_ID': JSON.stringify(msalClientId),
      'import.meta.env.VITE_MSAL_TENANT_ID': JSON.stringify(msalTenantId),
      'import.meta.env.VITE_MSAL_REDIRECT_URI': JSON.stringify(msalRedirectUri),
    },
  }
})
