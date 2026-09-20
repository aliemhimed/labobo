import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // `netlify dev` serves the functions; in plain `vite dev` the /api calls
    // fall back to the direct Supabase REST path in src/lib/supabase.js.
    proxy: {
      '/api': { target: 'http://localhost:8888', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
