import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Use relative asset paths so `file://` loading in Electron finds built files
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        // Forward credentials (cookies) through the proxy
        credentials: true,
        // Preserve original Host header so backend sees correct origin
        followRedirects: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
  ,
  build: {
    outDir: 'dist-app',
    // Enable source maps for production debugging
    sourcemap: true,
    // Suppress chunk warnings for now—focus on fixing the white screen first
    chunkSizeWarningLimit: 1500
  }
})
