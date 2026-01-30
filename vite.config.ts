import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/dre-2/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  
  // Configuração para SPA routing
  preview: {
    port: 4173,
    strictPort: true,
  },
});
