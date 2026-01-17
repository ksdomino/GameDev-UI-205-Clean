import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    open: true,
    strictPort: true,
    // Allow serving files from Engine directory
    fs: {
      allow: ['..']
    }
  },
  // Make Engine available at /Engine path
  resolve: {
    alias: {
      '@engine': '../Engine'
    }
  }
})
