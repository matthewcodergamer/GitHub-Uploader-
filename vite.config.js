import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project sites live at /<repository>/, not at the domain root.
// The deploy workflow sets VITE_BASE_PATH automatically for GitHub-Uploader-.
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    target: ['es2020', 'safari15'],
    sourcemap: false,
    outDir: 'dist',
    emptyOutDir: true,
  },
})
