import { defineConfig, loadEnv } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const LOCAL_BACKEND_ORIGIN = 'http://localhost:5020'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useApi = env.VITE_USE_API === 'true' || env.VITE_USE_API === '1'

  return {
    server: {
      host: '0.0.0.0',
      port: 3020,
      strictPort: true,
      proxy: useApi
        ? {
            '/api': { target: LOCAL_BACKEND_ORIGIN, changeOrigin: true },
            '/health': { target: LOCAL_BACKEND_ORIGIN, changeOrigin: true },
          }
        : undefined,
    },
    preview: {
      host: '0.0.0.0',
      port: 3020,
      strictPort: true,
      proxy: useApi
        ? {
            '/api': { target: LOCAL_BACKEND_ORIGIN, changeOrigin: true },
            '/health': { target: LOCAL_BACKEND_ORIGIN, changeOrigin: true },
          }
        : undefined,
    },
    resolve: { tsconfigPaths: true },
    plugins: [tailwindcss(), tanstackStart(), viteReact()],
  }
})
