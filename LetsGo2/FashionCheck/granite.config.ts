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
    port: 5173,
    commands: {
      dev: 'vite --host',
      build: 'vite build',
    },
  },
  outdir: 'dist',
  webViewProps: {
    type: 'partner',
  },
});
