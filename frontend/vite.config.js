import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable'],
  },
  server: {
    port: 3000,
    open: true,
    historyApiFallback: {
      index: '/index.html',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
