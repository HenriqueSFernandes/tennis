import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    // During local dev, set VITE_API_URL=http://localhost:8787 in .env.local
    // to point at your local wrangler dev instance
  },
});
