import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:3188", screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, reducedMotion: "reduce" } },
  ],
  webServer: { command: "npm run start -- --hostname 127.0.0.1 --port 3188", url: "http://127.0.0.1:3188/review", env: { ANTHROPIC_API_KEY: "" }, timeout: 30_000, reuseExistingServer: false },
});
