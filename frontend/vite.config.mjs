import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({
  path: path.resolve(fileURLToPath(new URL('..', import.meta.url)), '.env')
});

const backendPort = Number(process.env.APP_PORT || process.env.PORT || 3000);
const backendOrigin = `http://localhost:${backendPort}`;

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendOrigin,
        changeOrigin: true
      },
      '/images': {
        target: backendOrigin,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
