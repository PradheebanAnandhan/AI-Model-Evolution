import { defineConfig, devices } from "@playwright/test";

// Runs against the static export in out/ (run `npm run build` first).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx serve out -l 4173 --no-clipboard",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
