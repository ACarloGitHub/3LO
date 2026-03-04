import { defineConfig } from 'vite'

export default defineConfig({
  // Root directory where index.html is located
  root: 'src',
  
  // Prevent Vite from clearing the terminal screen
  clearScreen: false,
  
  server: {
    // Tauri expects a fixed port
    port: 5173,
    strictPort: true,
    // Enable CORS for Tauri
    cors: true,
  },
  
  build: {
    // Tauri uses Chromium on Linux
    target: 'es2021',
    minify: false,
    sourcemap: true,
    // Output directory (relative to root)
    outDir: '../dist',
    emptyOutDir: true,
  },
  
  // Public directory for static assets
  publicDir: '../public',
})
