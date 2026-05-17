import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Python Flask — AI model inference only
      '/api/detect':  { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/api/health':  { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/api/classes': { target: 'http://127.0.0.1:5000', changeOrigin: true },

      // Node.js Express — database (Prisma + Supabase)
      '/api/nutrition': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      '/api/history':   { target: 'http://127.0.0.1:3001', changeOrigin: true },
    },
  },
})

