import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'fitbattle',
  brand: {
    displayName: '핏배틀',
    primaryColor: '#3182F6',
    icon: 'https://static.toss.im/appsintoss/60759/3a40644b-0988-47c1-a00d-58b7a44180a5.png',
  },
  permissions: [
    { name: 'photos', access: 'read' },
    { name: 'clipboard', access: 'write' },
  ],
  navigationBar: {
    withBackButton: true,
    withTitle: true,
    theme: 'light',
  },
  web: {
    host: 'localhost',
    port: 8788,
    commands: {
      // vite(5173)는 정적 자산만 서빙하고, wrangler pages dev(8788)가
      // /api/* 는 Cloudflare Pages Functions로 처리하고 나머지는 vite로 프록시함
      dev: 'concurrently -k -n vite,wrangler "vite --host" "wrangler pages dev --proxy 5173 --port 8788 --ip 0.0.0.0 --compatibility-date 2025-01-01"',
      build: 'vite build',
    },
  },
  outdir: 'dist',
  webViewProps: {
    type: 'partner',
  },
});
