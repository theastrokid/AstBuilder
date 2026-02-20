import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy libraries into separate cacheable chunks
          'astronomy': ['astronomy-engine'],
          'pdf':       ['jspdf'],
          'react-core': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
