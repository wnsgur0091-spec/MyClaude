import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'fitbattle',
  brand: {
    displayName: '핏배틀',
    primaryColor: '#3182F6',
    // TODO: 토스 개발자 콘솔에 앱 등록 후 업로드한 아이콘 이미지 URL로 교체
    icon: 'https://example.com/fitbattle-icon.png',
  },
  permissions: [
    { name: 'photos', access: 'read' },
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
      dev: 'vite',
      build: 'vite build',
    },
  },
  outdir: 'dist',
  webViewProps: {
    type: 'partner',
  },
});
