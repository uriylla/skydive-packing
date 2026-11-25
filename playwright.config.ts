import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a production build (`pnpm build` first).
 * They use their own database (DATABASE_URL_E2E), which global-setup wipes and seeds.
 */
const PORT = 3100;
export const E2E_DATABASE_URL =
  process.env.DATABASE_URL_E2E ?? "postgres://packing:packing@localhost:5433/packing_e2e";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Tests share one database: run them one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use a preinstalled Chromium when one is provided (e.g. cloud dev boxes).
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: `pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
      REQUIRE_PACKER_PIN: "false",
      APP_TIMEZONE: "Europe/Madrid",
    },
  },
});
