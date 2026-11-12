import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relative : le build fonctionne depuis n'importe quel dossier (GitHub Pages, Capacitor, etc.)
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 3000 },
});
