import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'node:https'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'https://pawguard-backend-dev.onrender.com',
        changeOrigin: true,
        secure: false,
        agent: new https.Agent({ family: 4, keepAlive: true }),
      },
    },
  },
})
