import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to './' so the build works from any GitHub Pages URL
// If your repo is at https://username.github.io/repo-name/, set base: '/repo-name/'
export default defineConfig({
  plugins: [react()],
  base: '/pokemon-fusion-game/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  // Pre-bundle TF.js so Vite doesn't hit the 400+ sub-module limit at dev time
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs',
      '@tensorflow-models/arbitrary-image-stylization',
    ],
  },
})
