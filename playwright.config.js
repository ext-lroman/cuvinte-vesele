// Teste de fum pentru aplicație: `npm test` (pornește singur serverul).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5173', viewport: { width: 820, height: 1180 } },
  webServer: { command: 'node server.js 5173', url: 'http://localhost:5173', reuseExistingServer: true },
});
