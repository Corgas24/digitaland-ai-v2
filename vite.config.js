import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-vercel-config',
      // Runs after Vite finishes writing the build output
      closeBundle() {
        const dist = resolve(__dirname, 'dist')
        const srcDir = __dirname

        const files = [
          { src: resolve(srcDir, 'vercel.json'),      dst: resolve(dist, 'vercel.json') },
          { src: resolve(srcDir, 'public', '_redirects'), dst: resolve(dist, '_redirects') },
        ]

        for (const { src, dst } of files) {
          if (existsSync(src)) {
            copyFileSync(src, dst)
            console.log(`[copy-vercel-config] → ${dst}`)
          } else {
            console.warn(`[copy-vercel-config] SOURCE NOT FOUND: ${src}`)
          }
        }
      }
    }
  ],
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
