import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Vercel injects VITE_* into process.env at build time.
  // Skip committed .env* files there so production uses the dashboard values.
  // Locally Vite still reads .env, and .env.development while running `vite`.
  envDir: process.env.VERCEL === '1' && mode === 'production' ? false : undefined,
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:1337',
        changeOrigin: true,
      },
      '/cms': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cms/, ''),
      },
    },
  },
}))
