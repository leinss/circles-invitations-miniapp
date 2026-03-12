import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  base: '/circles-invitations-miniapp/',
  plugins: [basicSsl()],
  server: {
    proxy: {
      '/api/auth': {
        target: 'https://auth.aboutcircles.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/auth/, ''),
      },
      '/api/referrals': {
        target: 'https://referrals.aboutcircles.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/referrals/, ''),
      },
    },
  },
  build: {
    target: 'es2022',
  },
});
