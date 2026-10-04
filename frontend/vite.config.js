import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000/orders';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: new URL(apiUrl).origin,
          changeOrigin: true,
          secure: true,
          rewrite: path => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
