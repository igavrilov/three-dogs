import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    cors: true,
    hmr: {
      port: 5174
    }
  },
  preview: {
    host: true,
    port: process.env.PORT || 4173,
    allowedHosts: [
      'heartfelt-upliftment-production.up.railway.app',
      '.railway.app',
      '.vercel.app',
      '.netlify.app',
      '.render.com',
      'localhost'
    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  optimizeDeps: {
    include: ['three']
  }
});
