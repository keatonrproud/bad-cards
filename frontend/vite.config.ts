import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') })

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: parseInt(process.env.FRONTEND_PORT || '3000'),
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:3002',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.BACKEND_URL || 'http://localhost:3002',
        changeOrigin: true,
        ws: true,
      }
    }
  },
  define: {
    // Pass environment variables to the frontend
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.BACKEND_URL': JSON.stringify(process.env.BACKEND_URL || 'http://localhost:3002'),
    'process.env.FRONTEND_URL': JSON.stringify(process.env.FRONTEND_URL || 'http://localhost:3000'),
  }
})
