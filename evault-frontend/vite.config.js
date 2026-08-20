import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gateway = env.VITE_GATEWAY_URL || 'http://localhost:8080'
  const integrationService = env.VITE_INTEGRATION_URL || 'http://localhost:8086'
  const docService = env.VITE_DOC_SERVICE_URL || 'http://localhost:8082'
  const blockchainService = env.VITE_BLOCKCHAIN_URL || 'http://localhost:8083'

  return {
    plugins: [react()],
    server: {
      host: true, // listen on 127.0.0.1 and ::1
      port: 3000,
      // Proxy API through Vite to microservices so the browser never hits cross-origin CORS
      proxy: {
        '/classify': { target: integrationService, changeOrigin: true },
        '/ecourts': { target: integrationService, changeOrigin: true },
        '/aadhaar': { target: integrationService, changeOrigin: true },
        '/api/documents': { target: docService, changeOrigin: true },
        '/blockchain': { target: blockchainService, changeOrigin: true },
        '/api': { target: gateway, changeOrigin: true },
        '/audit': { target: gateway, changeOrigin: true },
        '/notify': { target: gateway, changeOrigin: true },
        '/actuator': { target: gateway, changeOrigin: true },
      },
    },
  }
})
