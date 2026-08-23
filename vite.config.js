import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative assets work on GitHub Pages project sites and custom domains.
  base: './',
  build: {
    target: ['es2020', 'safari15'],
    sourcemap: false,
  },
})
