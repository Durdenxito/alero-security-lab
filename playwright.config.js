import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:4173/alero-security-lab/', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/build.mjs && node scripts/serve.mjs --base /alero-security-lab/', url: 'http://127.0.0.1:4173/alero-security-lab/', reuseExistingServer: !process.env.CI },
  reporter: [['list'], ['html', { open: 'never' }]],
});
