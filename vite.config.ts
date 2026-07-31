import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'https://pawguard-backend-mqri.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
