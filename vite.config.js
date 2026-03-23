import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/n2soft-archive/', // GitHub repo name
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
