import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gateway = env.VITE_GATEWAY_URL || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      host: true, // listen on 127.0.0.1 and ::1
      port: 3000,
      // Proxy API through Vite → gateway so the browser never hits cross-origin CORS
      proxy: {
        '/api': { target: gateway, changeOrigin: true },
        '/classify': { target: gateway, changeOrigin: true },
        '/ecourts': { target: gateway, changeOrigin: true },
        '/aadhaar': { target: gateway, changeOrigin: true },
        '/blockchain': { target: gateway, changeOrigin: true },
        '/audit': { target: gateway, changeOrigin: true },
        '/notify': { target: gateway, changeOrigin: true },
        '/actuator': { target: gateway, changeOrigin: true },
      },
    },
  }
})
