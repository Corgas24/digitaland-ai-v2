import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}
  },
  optimizeDeps: {
    include: ['lucide-react', 'recharts', 'react-markdown']
  },
  server: {
    proxy: {
      '/v1': {
        target: 'https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/v1/, '')
      }
    }
  },
  build: {
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  }
})
