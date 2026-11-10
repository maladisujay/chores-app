import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // works at https://<user>.github.io/<repo>/
  plugins: [react()],
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
  server: { host: true },
})
