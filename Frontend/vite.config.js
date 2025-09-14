import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://chatpdf-7k6m.onrender.com',
        changeOrigin: true,
      },
    },
  },
  assetsInclude: ['**/*.pdf'],
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  }
})
