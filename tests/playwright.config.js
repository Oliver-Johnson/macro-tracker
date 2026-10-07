// Smoke test config for Macrolog.
//
// Setup (once): npm install --no-save playwright@1.56.1 && npx playwright install chromium
// Run locally (Chromium only):
//   MT_BROWSERS=chromium npx playwright test -c tests/playwright.config.js
// CI runs both engines: MT_BROWSERS=chromium,webkit (the default).
const path = require('path');
const { defineConfig, devices } = require('playwright/test');

const PORT = Number(process.env.MT_PORT || 4317);
const BROWSERS = (process.env.MT_BROWSERS || 'chromium,webkit')
  .split(',').map(s => s.trim()).filter(Boolean);

// Most users are on Android Chrome, then iOS Safari, so phones come first.
const DEVICES = [
  { name: 'android-galaxy-s8', use: { ...devices['Galaxy S8'] } },        // 360x740
  { name: 'android-pixel-7', use: { ...devices['Pixel 7'] } },            // 412x839
  { name: 'android-narrow-320', use: {                                    // 320x568
    ...devices['Galaxy S8'],
    viewport: { width: 320, height: 568 },
    screen: { width: 320, height: 568 },
  } },
  { name: 'iphone-se', use: { ...devices['iPhone SE'] } },                // 320x568
  { name: 'iphone-15-pro-max', use: { ...devices['iPhone 15 Pro Max'] } }, // 430x739
  { name: 'ipad-mini', use: { ...devices['iPad Mini'] } },                // 768x1024
  { name: 'desktop-chrome', use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
  } },
];

module.exports = defineConfig({
  testDir: __dirname,
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ...(process.env.CI ? [['github']] : []),
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // The service worker claims the page on first load and triggers a reload
    // (controllerchange), which would make every test racy. It also hides its
    // requests from page.route, so block it and test the page itself.
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: DEVICES.filter(d => BROWSERS.includes(d.use.defaultBrowserType)),
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
    cwd: path.join(__dirname, '..'),
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    stderr: 'ignore', // http.server logs every request to stderr
    timeout: 30_000,
  },
});
