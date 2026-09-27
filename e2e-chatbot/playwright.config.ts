import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for chatbot end-to-end tests.
 *
 * Assumes:
 *   - Frontend  → http://localhost:3000 (or the URL in BASE_URL env)
 *   - Backend   → http://localhost:8000 (chatbot API served here)
 *   - Local Gemini path configured on backend (test needs live LLM)
 *
 * Env vars (optional):
 *   BASE_URL       — FE URL (default: http://localhost:3000)
 *   FPO_EMAIL      — FPO manager test user (default: matches e2e-dpr-calc)
 *   FPO_PASSWORD   — FPO manager test password
 *   ADMIN_EMAIL    — Admin test user (default: athul.gopan@kefitech.com)
 *   ADMIN_PASSWORD — Admin test password
 *   HEADED         — "0" for headless, "1" for visible browser
 *
 * Run from the FE repo root:
 *   npx playwright test --config e2e-chatbot/playwright.config.ts
 */
export default defineConfig({
  testDir: __dirname,
  timeout: 5 * 60 * 1000, // 5 min per test — Gemini can be slow on first hit
  expect: { timeout: 15_000 },
  fullyParallel: false, // serialize so multi-turn history isn't confused
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "./playwright-report", open: "never" }],
  ],
  outputDir: "./test-results",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    headless: process.env.HEADED === "0",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
