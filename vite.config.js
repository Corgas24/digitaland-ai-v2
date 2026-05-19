import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-vercel-assets',
      closeBundle() {
        const dist  = resolve(__dirname, 'dist')
        const files = [
          { src: resolve(__dirname, 'vercel.json'),       dst: resolve(dist, 'vercel.json') },
          { src: resolve(__dirname, 'public', '_redirects'), dst: resolve(dist, '_redirects') },
        ]
        for (const f of files) {
          if (existsSync(f.src)) {
            copyFileSync(f.src, f.dst)
            console.log(`[copy-vercel-assets] copied → ${f.dst}`)
          }
        }
      }
    }
  ],
  define: { 'process.env': {} },
  optimizeDeps: { include: ['lucide-react', 'recharts', 'react-markdown'] },
  server: {
    proxy: {
      '/v1': {
        target: 'https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/v1/, ''),
      }
    }
  },
  build: {
    emptyOutDir: true,
    commonjsOptions: { include: [/node_modules/], transformMixedEsModules: true }
  }
})
