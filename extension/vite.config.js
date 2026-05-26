// Configures Vite to build the TabTwin extension popup without moving extension files.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'popup',
  build: {
    outDir: '../popup-dist',
    emptyOutDir: true
  },
  server: {
    port: 5174
  }
});
