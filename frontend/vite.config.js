import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', ws: true, changeOrigin: true },
      '/actas': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    target: 'es2019',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Separar librerias pesadas para que el celular del personero no
        // descargue las graficas del panel de administracion.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          graficas: ['recharts'],
          red: ['axios', 'socket.io-client'],
        },
      },
    },
  },
});
