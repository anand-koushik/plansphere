import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiTarget = process.env.VITE_API_URL || process.env.CLIENT_URL || 'http://localhost:5000'

export default defineConfig({
  envPrefix: ['VITE_', 'CLIENT_'],
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      },
      '/uploads': {
        target: apiTarget,
        changeOrigin: true
      }
    }
  }
})
